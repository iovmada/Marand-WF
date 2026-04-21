import 'dotenv/config';
import crypto from 'node:crypto';
import cors from 'cors';
import express from 'express';
import nodemailer from 'nodemailer';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const app = express();

const config = {
  port: Number(process.env.PORT || 8080),
  appOrigins: String(process.env.APP_ORIGIN || 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
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
    maxFiles: Number(process.env.UPLOAD_MAX_FILES || 10)
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

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || config.appOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`Origin not allowed: ${origin}`));
  },
  methods: ['GET', 'POST', 'OPTIONS']
}));
app.use(express.json({ limit: '1mb' }));

app.get(['/health', '/api/health'], (_req, res) => {
  res.json({ ok: true });
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
        ContentType: file.type || 'application/octet-stream',
        ACL: 'private'
      });

      const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 900 });
      const publicUrl = config.spaces.cdnBaseUrl
        ? `${config.spaces.cdnBaseUrl.replace(/\/$/, '')}/${key}`
        : `${config.spaces.endpoint.replace(/\/$/, '')}/${config.spaces.bucket}/${key}`;

      return { key, uploadUrl, publicUrl };
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
      files.forEach((file) => {
        lines.push(`- ${file.name || 'Fișier'}${file.url ? `: ${file.url}` : ''}`);
      });
    } else {
      lines.push('- Niciun fișier încărcat');
    }

    await mailer.sendMail({
      from: config.smtp.from,
      to: config.mailTo,
      replyTo: email,
      subject,
      text: lines.join('\n')
    });

    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Could not send offer.'
    });
  }
});

app.listen(config.port, () => {
  console.log(`Marand forms API listening on ${config.port}`);
});
