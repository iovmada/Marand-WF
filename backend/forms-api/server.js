import 'dotenv/config';
import crypto from 'node:crypto';
import cors from 'cors';
import express from 'express';
import nodemailer from 'nodemailer';
import OpenAI from 'openai';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { buildChatInstructions, chatbotCatalog } from './chatbot-knowledge.js';

const app = express();

const expandAppOrigins = (origins) => {
  const expanded = new Set();

  origins.forEach((origin) => {
    if (!origin) return;
    expanded.add(origin);

    try {
      const url = new URL(origin);
      const hostname = url.hostname.toLowerCase();

      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return;
      }

      if (hostname.startsWith('www.')) {
        url.hostname = hostname.slice(4);
        expanded.add(url.toString().replace(/\/$/, ''));
        return;
      }

      url.hostname = `www.${hostname}`;
      expanded.add(url.toString().replace(/\/$/, ''));
    } catch (_error) {
      // Ignore malformed origins and keep the raw value only.
    }
  });

  return Array.from(expanded);
};

const config = {
  port: Number(process.env.PORT || 8080),
  appOrigins: expandAppOrigins(
    String(process.env.APP_ORIGIN || 'http://localhost:3000')
      .split(',')
      .map((origin) => origin.trim().replace(/\/$/, ''))
      .filter(Boolean)
  ),
  mailTo: process.env.MAIL_TO || 'office@marand-print.ro',
  smtp: {
    host: process.env.ZOHO_SMTP_HOST || 'smtppro.zoho.com',
    port: Number(process.env.ZOHO_SMTP_PORT || 465),
    secure: String(process.env.ZOHO_SMTP_SECURE || 'true') === 'true',
    user: process.env.ZOHO_SMTP_USER,
    pass: process.env.ZOHO_SMTP_PASS,
    from: process.env.ZOHO_SMTP_FROM || process.env.ZOHO_SMTP_USER || process.env.MAIL_TO || 'office@marand-print.ro'
  },
  spaces: {
    region: process.env.SPACES_REGION || 'fra1',
    bucket: process.env.SPACES_BUCKET,
    endpoint: process.env.SPACES_ENDPOINT,
    cdnBaseUrl: process.env.SPACES_CDN_BASE_URL,
    key: process.env.SPACES_KEY,
    secret: process.env.SPACES_SECRET
  },
  upload: {
    maxFileBytes: Number(process.env.UPLOAD_MAX_FILE_BYTES || 262144000),
    maxTotalBytes: Number(process.env.UPLOAD_MAX_TOTAL_BYTES || 1073741824),
    maxFiles: Number(process.env.UPLOAD_MAX_FILES || 10),
    downloadUrlExpiresSeconds: Math.min(Number(process.env.UPLOAD_DOWNLOAD_URL_EXPIRES_SECONDS || 604800), 604800)
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini'
  }
};

const acceptedExtensions = new Set(['pdf', 'ai', 'eps', 'psd', 'tiff', 'png', 'jpg', 'jpeg', 'svg', 'cdr', 'zip', 'rar']);
const acceptedMimePrefixes = [
  'application/pdf',
  'application/postscript',
  'application/illustrator',
  'application/zip',
  'application/x-rar',
  'application/vnd.rar',
  'application/octet-stream',
  'image/',
  'text/xml'
];

const allowedChatLinks = new Set([
  '/',
  '/produse/',
  '/materiale/',
  '/oferta/',
  '/contact/',
  '/#galerie',
  '/galerie',
  chatbotCatalog.contact.whatsapp
]);

const sanitizeFilename = (filename) => filename
  .normalize('NFKD')
  .replace(/[^\w.\-]+/g, '-')
  .replace(/-+/g, '-')
  .replace(/^-|-$/g, '')
  .slice(0, 180);

const getExtension = (filename) => filename.split('.').pop()?.toLowerCase() || '';

const isAcceptedFile = (file) => {
  const extension = getExtension(file.name || '');
  if (!acceptedExtensions.has(extension)) return false;
  if (!file.type) return true;
  return acceptedMimePrefixes.some((prefix) => file.type.startsWith(prefix));
};

const formatDatePath = (date = new Date()) => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}/${month}/${day}`;
};

const requireConfig = (value, key) => {
  if (!value) {
    throw new Error(`Missing required configuration: ${key}`);
  }
  return value;
};

const isAllowedUploadKey = (key) => /^(quotes|uploads)\//.test(key);

const openai = config.openai.apiKey
  ? new OpenAI({ apiKey: config.openai.apiKey })
  : null;

const s3 = new S3Client({
  region: config.spaces.region,
  endpoint: requireConfig(config.spaces.endpoint, 'SPACES_ENDPOINT'),
  forcePathStyle: false,
  credentials: {
    accessKeyId: requireConfig(config.spaces.key, 'SPACES_KEY'),
    secretAccessKey: requireConfig(config.spaces.secret, 'SPACES_SECRET')
  }
});

const mailer = nodemailer.createTransport({
  host: config.smtp.host,
  port: config.smtp.port,
  secure: config.smtp.secure,
  auth: {
    user: requireConfig(config.smtp.user, 'ZOHO_SMTP_USER'),
    pass: requireConfig(config.smtp.pass, 'ZOHO_SMTP_PASS')
  }
});

const createDownloadUrl = async (key) => {
  if (!key || !isAllowedUploadKey(key)) return '';

  return getSignedUrl(s3, new GetObjectCommand({
    Bucket: config.spaces.bucket,
    Key: key
  }), {
    expiresIn: config.upload.downloadUrlExpiresSeconds
  });
};

const sendTextMail = async ({ replyTo, subject, lines }) => {
  await mailer.sendMail({
    from: config.smtp.from,
    to: config.mailTo,
    replyTo,
    subject,
    text: lines.join('\n')
  });
};

const normalizeChatHistory = (history) => {
  if (!Array.isArray(history)) return [];

  return history
    .filter((item) => item && (item.role === 'user' || item.role === 'assistant'))
    .map((item) => ({
      role: item.role,
      content: String(item.content || '').trim().slice(0, 2000)
    }))
    .filter((item) => item.content)
    .slice(-8);
};

const stripCodeFences = (value) => value
  .replace(/^```(?:json)?\s*/i, '')
  .replace(/\s*```$/i, '')
  .trim();

const parseChatJson = (value) => {
  const cleaned = stripCodeFences(String(value || ''));
  return JSON.parse(cleaned);
};

const sanitizeChatLinks = (links, locale = 'ro') => {
  const fallbackLabels = locale.startsWith('ro')
    ? {
        '/produse/': 'Vezi produsele',
        '/materiale/': 'Vezi materialele',
        '/oferta/': 'Deschide pagina de ofertă',
        '/contact/': 'Vezi contact',
        '/#galerie': 'Vezi galeria',
        '/galerie': 'Vezi galeria',
        [chatbotCatalog.contact.whatsapp]: 'WhatsApp'
      }
    : {
        '/produse/': 'Browse products',
        '/materiale/': 'See materials',
        '/oferta/': 'Open quote page',
        '/contact/': 'See contact',
        '/#galerie': 'See gallery',
        '/galerie': 'See gallery',
        [chatbotCatalog.contact.whatsapp]: 'WhatsApp'
      };

  return (Array.isArray(links) ? links : [])
    .map((item) => ({
      href: String(item?.href || '').trim(),
      label: String(item?.label || '').trim()
    }))
    .filter((item) => item.href && allowedChatLinks.has(item.href))
    .slice(0, 2)
    .map((item) => ({
      href: item.href,
      label: item.label || fallbackLabels[item.href] || item.href
    }));
};

const fallbackChatReply = (locale = 'ro') => {
  const isRomanian = locale.startsWith('ro');
  return {
    reply: isRomanian
      ? 'Print shop-ul nostru se va deschide pe 1 iunie. Pana atunci, ne poti trimite o cerere de oferta si revenim cu detalii.'
      : 'Our print shop opens on June 1. Until then, you can send us a quote request and we will follow up with details.',
    links: sanitizeChatLinks(['/produse/', '/oferta/'].map((href) => ({ href })), locale)
  };
};

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || config.appOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  methods: ['GET', 'POST', 'OPTIONS']
}));
app.use(express.json({ limit: '1mb' }));

app.use((req, res, next) => {
  const origin = req.get('origin');
  if (origin && !config.appOrigins.includes(origin)) {
    return res.status(403).json({ error: `Origin not allowed: ${origin}` });
  }
  return next();
});

app.get(['/health', '/api/health'], (_req, res) => {
  res.json({ ok: true });
});

app.post(['/chat', '/api/chat'], async (req, res) => {
  try {
    const locale = String(req.body?.locale || 'ro').toLowerCase();
    const message = String(req.body?.message || '').trim();
    const history = normalizeChatHistory(req.body?.history);
    const pageTitle = String(req.body?.pageTitle || '').trim().slice(0, 200);
    const pathname = String(req.body?.pathname || '/').trim().slice(0, 200);

    if (!message) {
      return res.status(400).json({ error: 'Missing chat message.' });
    }

    if (!openai) {
      return res.status(200).json({
        ...fallbackChatReply(locale),
        fallback: true
      });
    }

    const input = [
      ...history.map((item) => ({
        role: item.role,
        content: item.content
      })),
      {
        role: 'user',
        content: message
      }
    ];

    const response = await openai.responses.create({
      model: config.openai.model,
      instructions: buildChatInstructions({ locale, pageTitle, pathname }),
      input,
      store: false
    });

    const payload = parseChatJson(response.output_text || '');
    const reply = String(payload?.reply || '').trim();
    const links = sanitizeChatLinks(payload?.links, locale);

    if (!reply) {
      throw new Error('Empty chatbot response.');
    }

    return res.json({ reply, links });
  } catch (error) {
    const locale = String(req.body?.locale || 'ro').toLowerCase();
    const fallback = fallbackChatReply(locale);
    return res.status(200).json({
      ...fallback,
      fallback: true,
      error: error instanceof Error ? error.message : 'Could not generate chat response.'
    });
  }
});

app.post(['/uploads/presign', '/api/uploads/presign'], async (req, res) => {
  try {
    const files = Array.isArray(req.body?.files) ? req.body.files : [];
    const scope = req.body?.scope === 'quotes' ? 'quotes' : 'uploads';

    if (!files.length) {
      return res.status(400).json({ error: 'No files provided.' });
    }

    if (files.length > config.upload.maxFiles) {
      return res.status(400).json({ error: `Too many files. Max ${config.upload.maxFiles}.` });
    }

    const totalBytes = files.reduce((sum, file) => sum + Number(file.size || 0), 0);
    if (totalBytes > config.upload.maxTotalBytes) {
      return res.status(400).json({ error: 'Total upload size exceeded.' });
    }

    const requestId = `req_${crypto.randomBytes(4).toString('hex')}`;
    const basePath = `${scope}/${formatDatePath()}/${requestId}`;

    const uploads = await Promise.all(files.map(async (file) => {
      const size = Number(file.size || 0);
      if (!file?.name || !size) {
        throw new Error('Invalid file payload.');
      }
      if (size > config.upload.maxFileBytes) {
        throw new Error(`File too large: ${file.name}`);
      }
      if (!isAcceptedFile(file)) {
        throw new Error(`Unsupported file type: ${file.name}`);
      }

      const safeName = sanitizeFilename(file.name);
      const key = `${basePath}/${safeName}`;
      const command = new PutObjectCommand({
        Bucket: config.spaces.bucket,
        Key: key,
        ContentType: file.type || 'application/octet-stream'
      });

      const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 900 });

      return { key, uploadUrl };
    }));

    return res.json({ uploads });
  } catch (error) {
    return res.status(400).json({
      error: error instanceof Error ? error.message : 'Could not prepare upload.'
    });
  }
});

app.post(['/oferta', '/api/oferta'], async (req, res) => {
  try {
    const payload = req.body || {};
    const name = String(payload.name || '').trim();
    const company = String(payload.company || '').trim();
    const email = String(payload.email || '').trim();
    const phone = String(payload.phone || '').trim();
    const category = String(payload.category || '').trim();
    const deadline = String(payload.deadline || '').trim();
    const quantity = String(payload.quantity || '').trim();
    const budget = String(payload.budget || '').trim();
    const designStatus = String(payload.designStatus || '').trim();
    const details = String(payload.details || '').trim();
    const files = Array.isArray(payload.files) ? payload.files : [];

    if (!name || !email || !category || !details) {
      return res.status(400).json({ error: 'Missing required fields.' });
    }

    const subject = `Cerere ofertă Marand - ${name} - ${category}`;
    const lines = [
      'Cerere ofertă nouă',
      '',
      `Nume: ${name}`,
      `Companie: ${company || 'Nespecificat'}`,
      `Email: ${email}`,
      `Telefon: ${phone || 'Nespecificat'}`,
      '',
      `Categorie produs: ${category}`,
      `Termen dorit: ${deadline || 'Nespecificat'}`,
      `Cantitate estimată: ${quantity || 'Nespecificat'}`,
      `Buget estimat: ${budget || 'Nespecificat'}`,
      `Stadiul graficii: ${designStatus || 'Nespecificat'}`,
      '',
      'Detalii proiect:',
      details,
      '',
      'Fișiere încărcate:'
    ];

    if (files.length) {
      const resolvedFiles = await Promise.all(files.map(async (file) => {
        const name = String(file?.name || '').trim() || 'Fișier';
        const key = String(file?.key || '').trim();
        const url = await createDownloadUrl(key);
        return { name, key, url };
      }));

      resolvedFiles.forEach((file) => {
        const suffix = file.url || file.key ? `: ${file.url || file.key}` : '';
        lines.push(`- ${file.name}${suffix}`);
      });
    } else {
      lines.push('- Niciun fișier încărcat');
    }

    await sendTextMail({
      replyTo: email,
      subject,
      lines
    });

    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Could not send offer.'
    });
  }
});

app.post(['/contact', '/api/contact'], async (req, res) => {
  try {
    const payload = req.body || {};
    const name = String(payload.name || '').trim();
    const email = String(payload.email || '').trim();
    const phone = String(payload.phone || '').trim();
    const details = String(payload.details || '').trim();

    if (!name || !email || !details) {
      return res.status(400).json({ error: 'Missing required fields.' });
    }

    const subject = `Mesaj contact Marand - ${name}`;
    const lines = [
      'Mesaj nou din formularul de contact',
      '',
      `Nume: ${name}`,
      `Email: ${email}`,
      `Telefon: ${phone || 'Nespecificat'}`,
      '',
      'Mesaj:',
      details
    ];

    await sendTextMail({
      replyTo: email,
      subject,
      lines
    });

    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Could not send contact message.'
    });
  }
});

app.listen(config.port, () => {
  console.log(`Marand forms API listening on ${config.port}`);
});
