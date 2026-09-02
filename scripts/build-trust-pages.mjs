#!/usr/bin/env node
/**
 * Generates the trust-anchor pages: /despre/ and /confidentialitate/, plus
 * /about/ and /privacy/ as English-path aliases of the same content.
 *
 * Why aliases: every path on this site is Romanian (/produse/, /materiale/,
 * /echipamente/), and Romanian users should get Romanian URLs. But agents and
 * audit tooling probe /about and /privacy by convention. So the Romanian URL
 * is canonical and carries the sitemap entry, and the English path serves the
 * same 200 with <link rel="canonical"> pointing home. That is an alias, not a
 * redirect stub — no meta refresh, no redirect chain, full content in the
 * body — which matters because the root *-ro.html meta-refresh stubs are
 * already a known drag on this domain.
 *
 * THIS FILE IS THE SINGLE SOURCE OF TRUTH FOR BOTH PAGES.
 * After editing, run:
 *     node scripts/build-trust-pages.mjs
 *     node scripts/build-shell.mjs          # bakes nav + footer in
 *     node scripts/build-agent-files.mjs    # markdown mirrors + llms.txt
 *
 * Everything in the privacy page is checked against what the code actually
 * does (backend/forms-api/server.js, assets/*.js). Do not add a clause here
 * that the implementation does not honour.
 */

import { writeFileSync, mkdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join, resolve } from "path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ORIGIN = "https://marand-print.ro";
const UPDATED = "2 septembrie 2026";

/* ------------------------------------------------------------------ *
 * Shared chrome — the design system, exactly as Rule 03/04/06 defines it.
 * ------------------------------------------------------------------ */

const styles = `  :root {
    --bg: #f7f7f7;
    --surface: #fcfcfc;
    --blue: #0c24c2;
    --lime: #9dfd43;
    --border: #e1e1e1;
    --container: 1165px;
    --module-grid-width: 1376px;
    --shadow-card: 0 7px 14px rgba(0, 0, 0, 0.06);
  }

  *, *::before, *::after { box-sizing: border-box; }
  html { scroll-behavior: smooth; }
  [id] { scroll-margin-top: 110px; }

  body {
    margin: 0;
    font-family: "Roboto Flex", system-ui, sans-serif;
    background: var(--bg);
    color: #333;
    line-height: 1.4;
  }

  img { max-width: 100%; display: block; }
  a { color: inherit; }

  .page { position: relative; overflow-x: hidden; z-index: 1; }

  .doc {
    width: min(calc(100% - 60px), var(--container));
    margin: 0 auto;
    padding: 130px 0 96px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 32px;
  }

  .doc-chip {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 35px;
    padding: 4px 16px;
    border-radius: 24px;
    background: var(--lime);
    color: #000;
    font-family: "Acrom", "Roboto Flex", sans-serif;
    font-size: 12px;
    line-height: 1;
    font-weight: 700;
    text-transform: lowercase;
  }

  .doc-title {
    margin: 0;
    max-width: 18ch;
    font-family: "Acrom", "Roboto Flex", sans-serif;
    font-size: 68px;
    line-height: 0.96;
    font-weight: 700;
    letter-spacing: -0.09em;
    color: #0b0b0b;
  }

  .doc-lede {
    margin: 0;
    max-width: 62ch;
    font-family: "Acrom", "Roboto Flex", sans-serif;
    font-size: 20px;
    line-height: 26px;
    font-weight: 300;
    letter-spacing: -0.06em;
    color: #020202;
  }

  .doc-meta {
    margin: 0;
    font-family: "Roboto Mono", monospace;
    font-size: 13px;
    line-height: 22px;
    color: #776f6f;
  }

  .doc-body { width: 100%; max-width: 74ch; }

  .doc-body h2 {
    margin: 48px 0 16px;
    font-family: "Acrom", "Roboto Flex", sans-serif;
    font-size: 37px;
    line-height: 45px;
    font-weight: 700;
    letter-spacing: -0.06em;
    color: #1a1a1a;
  }

  .doc-body h3 {
    margin: 32px 0 12px;
    font-family: "Acrom", "Roboto Flex", sans-serif;
    font-size: 20px;
    line-height: 26px;
    font-weight: 700;
    letter-spacing: -0.06em;
    color: #0b0b0b;
  }

  .doc-body p,
  .doc-body li {
    font-size: 16px;
    line-height: 27px;
    color: #333;
  }

  .doc-body p { margin: 0 0 16px; }
  .doc-body ul { margin: 0 0 16px; padding-left: 22px; }
  .doc-body li { margin-bottom: 8px; }
  .doc-body a { color: var(--blue); }

  .doc-facts {
    width: 100%;
    max-width: 74ch;
    margin: 8px 0 0;
    padding: 24px;
    border: 1px solid var(--border);
    border-radius: 24px;
    background: var(--surface);
    box-shadow: var(--shadow-card);
  }

  .doc-facts dl { margin: 0; display: grid; grid-template-columns: max-content 1fr; gap: 8px 24px; }
  .doc-facts dt {
    font-size: 13px;
    line-height: 27px;
    font-weight: 900;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #776f6f;
  }
  .doc-facts dd { margin: 0; font-size: 16px; line-height: 27px; color: #333; }

  .doc-actions { display: flex; gap: 16px; flex-wrap: wrap; margin-top: 16px; }

  @media (max-width: 720px) {
    .doc { padding: 120px 0 72px; }
    .doc-title { font-size: 40px; line-height: 42px; }
    .doc-body h2 { font-size: 28px; line-height: 34px; }
    .doc-facts dl { grid-template-columns: 1fr; gap: 2px 0; }
    .doc-facts dt { margin-top: 12px; }
  }`;

/* ------------------------------------------------------------------ *
 * Page content
 * ------------------------------------------------------------------ */

const pages = [
  {
    dir: "despre",
    alias: "about",
    title: "Marand — Despre noi",
    description:
      "Cine este Marand: print shop cu atelier propriu în Reșița, echipat prin Programul Regional Vest, care produce large format, canvas, stickere și textile fără subcontractori.",
    chip: "despre marand",
    heading: "Un atelier, nu un intermediar.",
    lede: "Marand este un design & print shop din Reșița. Tot ce vindem se produce pe echipamentele noastre, în atelierul nostru — de la fișierul primit până la produsul ambalat.",
    body: `
      <h2>Ce facem</h2>
      <p>Printăm large format, bannere și mesh, canvas întins pe ramă, stickere și folii decupate, folie pentru geam, plăci rigide, wallpaper, tricouri și textile, precum și lucrări de format mic — etichete, documente color, tiraje mici. Lista completă, cu materialele și finisajele pentru fiecare, este pe <a href="../produse/">pagina de produse</a>.</p>
      <p>Ne numim „design &amp; print shop" pentru că nu ne oprim la print. Dacă ai doar o idee și nicio machetă, pregătim noi grafica. Dacă ai un fișier, îl verificăm înainte să pornim mașina — rezoluție, spațiu de culoare, margini de siguranță, text convertit în curbe. Cele mai multe probleme de print sunt probleme de fișier, iar acelea se rezolvă mai ieftin înainte de a consuma material.</p>

      <h2>De ce contează că avem atelier propriu</h2>
      <p>Nu subcontractăm nimic. Printul, laminarea, tăierea pe contur, presarea textilelor și finisarea manuală se întâmplă toate în aceeași hală. Asta înseamnă trei lucruri concrete pentru tine: termenul depinde doar de noi, o corecție se poate face pe loc, iar dacă ceva iese prost îl refacem fără să negociem cu un furnizor.</p>
      <p>Termenul mediu de execuție este de 24 de ore. Nu avem cantitate minimă — un singur canvas trece prin același flux ca o mie de stickere. Lățimea maximă de print este de 134 cm; peste ea, lucrarea se împarte în panouri. Detaliile despre utilaje sunt pe <a href="../echipamente/">pagina de echipamente</a>, iar fluxul complet pe <a href="../productie/">pagina de producție</a>.</p>

      <h2>Cu cine lucrăm</h2>
      <p>Cu afaceri locale care au nevoie de semnalistică și materiale de prezentare, cu agenții care livrează mai departe către clienții lor, cu organizatori de evenimente și târguri, cu artiști care își tipăresc lucrările pe canvas, și cu persoane fizice care vor un singur tablou pentru living. Nu avem un client „prea mic".</p>
      <p>Poți veni și în shop. Verificăm împreună fișierele, materialele și finisajele înainte de producție — pentru lucrări unde textura sau culoarea contează, e mai rapid decât zece emailuri.</p>

      <h2>Proiect finanțat prin Programul Regional Vest</h2>
      <p>Atelierul a fost dotat printr-un proiect finanțat prin Programul Regional Vest 2021-2027. Comunicatul de presă, cu obiectivele și valoarea proiectului, este public pe <a href="../comunicat-de-presa/">pagina dedicată</a>.</p>
    `,
    facts: [
      ["Denumire", "Marand Print Shop"],
      ["Adresă", "Strada Libertății A2, 320003 Reșița, Caraș-Severin"],
      ["Telefon", '<a href="tel:+40725894569">0725 894 569</a>'],
      ["Email", '<a href="mailto:office@marand-print.ro">office@marand-print.ro</a>'],
      ["Program", "Luni–Vineri 09:00–18:00 · Sâmbătă 10:00–14:00"],
      ["Lățime maximă print", "134 cm"],
    ],
    actions: [
      ["cta cta-primary cta-pill", "../oferta/", "Cere ofertă"],
      ["cta cta-secondary cta-pill", "../contact/", "Vezi datele de contact"],
    ],
  },
  {
    dir: "confidentialitate",
    alias: "privacy",
    title: "Marand — Politica de confidențialitate",
    description:
      "Ce date colectează marand-print.ro prin formularele de contact și ofertă, unde ajung fișierele încărcate, cât timp se păstrează și cum îți exerciți drepturile GDPR.",
    chip: "confidențialitate",
    heading: "Ce date colectăm și de ce.",
    lede: "Politica descrie exact ce se întâmplă cu datele pe marand-print.ro. Fiecare afirmație de mai jos corespunde a ceea ce face efectiv codul site-ului — nu este un text generic.",
    body: `
      <h2>Cine este operatorul</h2>
      <p>Marand Print Shop, Strada Libertății A2, 320003 Reșița, județul Caraș-Severin, România. Pentru orice întrebare legată de datele tale, scrie la <a href="mailto:office@marand-print.ro">office@marand-print.ro</a> sau sună la <a href="tel:+40725894569">0725 894 569</a>.</p>

      <h2>Ce colectăm</h2>
      <h3>Formularul de contact</h3>
      <p>Colectăm numele, adresa de email, numărul de telefon (opțional) și mesajul tău. Aceste date sunt trimise prin email către <strong>office@marand-print.ro</strong> și nu sunt salvate într-o bază de date pe site.</p>

      <h3>Formularul de ofertă</h3>
      <p>Colectăm numele, firma (opțional), emailul, telefonul, categoria lucrării, cantitatea, termenul dorit, bugetul orientativ, stadiul graficii și descrierea proiectului. Dacă atașezi fișiere, acestea sunt încărcate direct din browserul tău într-un spațiu de stocare DigitalOcean Spaces găzduit în <strong>Frankfurt, Germania (regiunea fra1)</strong>, în Uniunea Europeană. Fișierele nu sunt publice: accesul se face prin linkuri semnate, care expiră în cel mult 7 zile.</p>

      <h3>Asistentul virtual</h3>
      <p>Dacă folosești chatul de pe site, mesajul tău și istoricul conversației curente sunt trimise către <strong>OpenAI</strong> pentru a genera răspunsul. Nu trimite date sensibile în chat. Dacă vrei să eviți complet acest lucru, scrie-ne direct pe email sau la telefon.</p>

      <h3>Studio</h3>
      <p>Instrumentul de previzualizare de pe <a href="../studio/">/studio/</a> rulează integral în browserul tău. Imaginile pe care le încarci acolo <strong>nu ajung niciodată pe serverele noastre</strong> și nu sunt trimise nicăieri.</p>

      <h2>Ce NU facem</h2>
      <ul>
        <li>Nu folosim Google Analytics, Meta Pixel sau orice alt instrument de analiză ori de urmărire publicitară. Site-ul nu conține niciun tracker.</li>
        <li>Nu vindem și nu închiriem datele tale nimănui.</li>
        <li>Nu trimitem newslettere și nu te înscriem automat în liste de marketing.</li>
        <li>Nu creăm profiluri și nu luăm decizii automate pe baza datelor tale.</li>
      </ul>

      <h2>Cookie-uri și stocare în browser</h2>
      <p>Nu punem cookie-uri de marketing sau de analiză. Site-ul folosește <code>sessionStorage</code> — o zonă din browserul tău, ștearsă când închizi fila — pentru a reține că ai închis un anunț, ca să nu ți-l arătăm din nou în aceeași vizită. Aceste date nu părăsesc browserul.</p>
      <p>Rețeaua care servește site-ul (Cloudflare, prin furnizorul nostru de găzduire) poate seta un cookie tehnic de tip <code>__cf_bm</code>, folosit strict pentru a distinge traficul automat de cel uman. Nu îl controlăm și nu îl folosim pentru profilare.</p>

      <h2>Cu cine partajăm datele</h2>
      <ul>
        <li><strong>Zoho Mail</strong> (centrul de date UE) — livrarea emailurilor din formulare.</li>
        <li><strong>DigitalOcean</strong> (Frankfurt, UE) — găzduirea site-ului și stocarea fișierelor atașate cererilor de ofertă.</li>
        <li><strong>Cloudflare</strong> — rețeaua de livrare din fața site-ului.</li>
        <li><strong>OpenAI</strong> — doar conținutul conversațiilor din asistentul virtual, doar dacă îl folosești.</li>
        <li><strong>Google Fonts</strong> — fonturile sunt încărcate de la <code>fonts.googleapis.com</code>, ceea ce presupune că adresa ta IP ajunge la Google la încărcarea paginii.</li>
      </ul>

      <h2>Cât păstrăm datele</h2>
      <p>Emailurile din formulare rămân în căsuța <strong>office@marand-print.ro</strong> atât timp cât sunt necesare pentru relația comercială și pentru obligațiile contabile. Fișierele atașate cererilor de ofertă se păstrează pe durata proiectului și se șterg la cerere. Dacă vrei ștergerea imediată a unei cereri, scrie-ne și o facem.</p>

      <h2>Temeiul legal</h2>
      <p>Prelucrăm datele din formulare pentru a răspunde solicitării tale și pentru a pregăti sau executa un contract (art. 6 alin. 1 lit. b GDPR). Pentru păstrarea documentelor comerciale ne bazăm pe obligația legală (art. 6 alin. 1 lit. c GDPR).</p>

      <h2>Drepturile tale</h2>
      <p>Ai dreptul de acces la date, de rectificare, de ștergere, de restricționare a prelucrării, de opoziție și de portabilitate. Scrie la <a href="mailto:office@marand-print.ro">office@marand-print.ro</a> și îți răspundem în cel mult 30 de zile. Dacă nu ești mulțumit de răspuns, poți depune o plângere la Autoritatea Națională de Supraveghere a Prelucrării Datelor cu Caracter Personal (ANSPDCP), <a href="https://www.dataprotection.ro" target="_blank" rel="noopener noreferrer">dataprotection.ro</a>.</p>

      <h2>Modificări</h2>
      <p>Dacă schimbăm ceva în felul în care tratăm datele, actualizăm această pagină și data de mai sus. Nu facem modificări retroactive care să reducă protecția datelor deja colectate.</p>
    `,
    facts: null,
    actions: [["cta cta-secondary cta-pill", "../contact/", "Întrebări? Scrie-ne"]],
  },
];

/* ------------------------------------------------------------------ *
 * Render
 * ------------------------------------------------------------------ */

const factsBlock = (facts) =>
  !facts
    ? ""
    : `
      <div class="doc-facts">
        <dl>
${facts.map(([k, v]) => `          <dt>${k}</dt>\n          <dd>${v}</dd>`).join("\n")}
        </dl>
      </div>
`;

const render = (page, { alias }) => {
  const prefix = "../";
  const canonicalUrl = `${ORIGIN}/${page.dir}/`;
  const selfUrl = alias ? `${ORIGIN}/${page.alias}/` : canonicalUrl;
  const mdHref = `${ORIGIN}/${page.dir}/index.md`;

  // The alias points its canonical at the Romanian URL and stays out of the
  // index, so it can serve agents without competing in search.
  const aliasNotes = alias
    ? `<meta name="robots" content="noindex, follow" />\n<link rel="alternate" hreflang="ro" href="${canonicalUrl}" />\n`
    : "";

  const actions = page.actions
    .map(([cls, href, label]) => `        <a class="${cls}" href="${prefix}${href.replace(/^\.\.\//, "")}">${label}</a>`)
    .join("\n");

  return `<!DOCTYPE html>
<html lang="ro">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${page.title}</title>
<meta name="description" content="${page.description}" />
<link rel="canonical" href="${canonicalUrl}" />
${aliasNotes}<link rel="alternate" type="text/markdown" href="${mdHref}" title="Markdown version for agents" />
<meta property="og:locale" content="ro_RO" />
<meta property="og:site_name" content="Marand" />
<meta property="og:type" content="website" />
<meta property="og:title" content="${page.title}" />
<meta property="og:description" content="${page.description}" />
<meta property="og:url" content="${selfUrl}" />
<meta property="og:image" content="${ORIGIN}/assets/social/marand-print-shop-print-digital-servicii-de-printate.jpg" />
<meta property="og:image:type" content="image/jpeg" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${page.title}" />
<meta name="twitter:description" content="${page.description}" />
<meta name="twitter:image" content="${ORIGIN}/assets/social/marand-print-shop-print-digital-servicii-de-printate.jpg" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Roboto+Flex:opsz,wght@8..144,300;8..144,400;8..144,500;8..144,700;8..144,900&family=Roboto+Mono:wght@400;500;700&display=swap" rel="stylesheet" />
<link rel="stylesheet" href="${prefix}assets/marand-shell.css?v=opening-notice-mobile-3" />
<link rel="stylesheet" href="${prefix}assets/chatbot.css" />
<style>
${styles}
</style>
</head>
<body data-marand-page="${page.dir}" data-marand-nav-active="">
<div class="page">
  <div data-marand-shell-header></div>

  <main>
    <article class="doc">
      <span class="doc-chip">${page.chip}</span>
      <h1 class="doc-title">${page.heading}</h1>
      <p class="doc-lede">${page.lede}</p>
      <p class="doc-meta">Ultima actualizare: ${UPDATED}</p>
${factsBlock(page.facts)}
      <div class="doc-body">
${page.body.trim()}
      </div>

      <div class="doc-actions">
${actions}
      </div>
    </article>
  </main>

  <div data-marand-shell-footer></div>
</div>
<script src="${prefix}assets/marand-shell.js?v=opening-notice-july-25-1"></script>
<script src="${prefix}assets/chatbot.js?v=opening-july-25-1"></script>
</body>
</html>
`;
};

const written = [];
for (const page of pages) {
  for (const [dir, alias] of [
    [page.dir, false],
    [page.alias, true],
  ]) {
    mkdirSync(join(ROOT, dir), { recursive: true });
    const html = render(page, { alias });
    writeFileSync(join(ROOT, dir, "index.html"), html, "utf8");
    const chars = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().length;
    written.push(`${dir}/index.html`);
    console.log(`  ok    ${dir}/index.html  (${chars.toLocaleString()} chars of text${alias ? ", alias" : ""})`);
  }
}

console.log(`\n${written.length} file(s) written.`);
console.log("Next: node scripts/build-shell.mjs && node scripts/build-agent-files.mjs");
