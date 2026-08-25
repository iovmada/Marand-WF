#!/usr/bin/env node
/**
 * Bakes the site header and footer into every page as static HTML.
 *
 * Why: the shell used to be injected at runtime by assets/marand-shell.js, so
 * the HTML Googlebot fetches on its first pass contained no internal links at
 * all. /materiale/ and /productie/ had zero inbound links anywhere in the
 * static markup. This script renders the same markup ahead of time; the
 * browser script now only binds behaviour to it.
 *
 * THIS FILE IS THE SINGLE SOURCE OF TRUTH FOR THE NAV AND FOOTER.
 * After editing anything below, run:  node scripts/build-shell.mjs
 * and commit the regenerated HTML alongside it.
 */

import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join, resolve } from "path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/* ------------------------------------------------------------------ *
 * Shell content
 * ------------------------------------------------------------------ */

const navItems = [
  { key: "products", label: "Produse", href: "/produse/" },
  { key: "materials", label: "Materiale", href: "/materiale/" },
  { key: "studio", label: "Studio", href: "/studio/" },
  { key: "process", label: "Cum Lucram", href: "/#cum-functioneaza" },
  { key: "equipment", label: "Echipamente", href: "/echipamente/" },
  { key: "contact", label: "Contact", href: "/contact/" }
];

const socialLinks = [
  {
    label: "Instagram",
    href: "https://www.instagram.com/marandprint",
    icon: `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="3" y="3" width="18" height="18" rx="5" ry="5" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="17.2" cy="6.8" r="1.1" fill="currentColor"/></svg>`
  },
  {
    label: "Facebook",
    href: "https://www.facebook.com/profile.php?id=61588679174224",
    icon: `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M22 12a10 10 0 1 0-11.6 9.9v-7H8v-3h2.4V9.4c0-2.4 1.4-3.7 3.6-3.7 1 0 2.1.2 2.1.2v2.3h-1.2c-1.2 0-1.5.7-1.5 1.5V12h2.6l-.4 3h-2.2v7A10 10 0 0 0 22 12z"/></svg>`
  },
  {
    label: "TikTok",
    href: "#",
    icon: `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M19.6 6.3a4.6 4.6 0 0 1-3.2-1.4 4.6 4.6 0 0 1-1.3-2.6V2h-3.4v13a2.6 2.6 0 1 1-1.9-2.5V9a6 6 0 1 0 5.3 5.9V8.5a8 8 0 0 0 4.7 1.5V6.6a4.7 4.7 0 0 1-.2-.3z"/></svg>`
  }
];

const footerGroups = [
  {
    title: "Produse",
    links: [
      { label: "Large format", href: "/produse/#large-format" },
      { label: "Bannere și mesh", href: "/produse/#banners" },
      { label: "Printuri pe canvas", href: "/produse/#canvas" },
      { label: "Stickere și vinyl", href: "/produse/#stickers" },
      { label: "Tricouri și textile", href: "/produse/#textiles" },
      { label: "Small Format", href: "/produse/#small-format" },
      { label: "Materiale", href: "/materiale/" },
      { label: "Studio — previzualizare", href: "/studio/" }
    ]
  },
  {
    title: "Company",
    links: [
      { label: "Homepage", href: "/#design" },
      { label: "Proces", href: "/#cum-functioneaza" },
      { label: "Galerie", href: "/#galerie" },
      { label: "Ofertă", href: "/oferta/" },
      // /productie/ was in neither the nav nor the footer — the only page on
      // the site with no inbound link anywhere. Added here on purpose.
      { label: "Producție", href: "/productie/" },
      { label: "Proiect finanțat prin Programul Regional Vest", href: "/comunicat-de-presa/" }
    ]
  },
  {
    title: "Contact",
    links: [
      { label: "office@marand-print.ro", href: "mailto:office@marand-print.ro", absolute: true },
      { label: "0725894569", href: "tel:+40725894569", absolute: true },
      { label: "Cere ofertă", href: "/oferta/" },
      { label: "Lun-Vin: 9-18", href: "#contact", absolute: true }
    ]
  }
];

/**
 * Pages to write. `nested` drives the relative path prefix, matching the
 * routeRoot logic that used to live in marand-shell.js.
 */
const pages = [
  { file: "index.html", nested: false },
  { file: "produse/index.html", nested: true },
  { file: "materiale/index.html", nested: true },
  { file: "studio/index.html", nested: true },
  { file: "echipamente/index.html", nested: true },
  { file: "productie/index.html", nested: true },
  { file: "oferta/index.html", nested: true },
  { file: "contact/index.html", nested: true },
  { file: "comunicat-de-presa/index.html", nested: true },
  { file: "produse-test/index.html", nested: true }
];

/* ------------------------------------------------------------------ *
 * Rendering
 * ------------------------------------------------------------------ */

const makeRoute = (nested) => (path) => `${nested ? ".." : "."}${path}`;

function renderHeader(toRoute, navActive) {
  const links = navItems
    .map(
      (item) =>
        `<a class="${navActive === item.key ? "is-active" : ""}" href="${toRoute(item.href)}">${item.label}</a>`
    )
    .join("");

  return `      <header class="site-header">
        <div class="container">
          <a class="logo" href="${toRoute("/")}" aria-label="Marand — Acasă">
            <img class="logo-full" src="${toRoute("/assets/brand/logo.svg")}" alt="Marand" />
          </a>
          <nav class="nav-pill" aria-label="Navigare principală">
            ${links}
          </nav>
          <button class="nav-burger" type="button" aria-expanded="false" aria-controls="mobile-nav" aria-label="Deschide meniul">
            <span></span>
            <span></span>
            <span></span>
          </button>
          <a class="cta cta-primary cta-pill header-cta" href="${toRoute("/oferta/")}">Cere Oferta</a>
        </div>
        <div class="mobile-nav" id="mobile-nav" hidden>
          <button class="mobile-nav-close" type="button" aria-label="Închide meniul">×</button>
          <div class="mobile-nav-panel">
            <nav class="mobile-nav-links" aria-label="Navigare principală pe mobil">
              ${links}
            </nav>
            <a class="cta cta-primary cta-pill mobile-nav-cta" href="${toRoute("/oferta/")}">Cere Oferta</a>
          </div>
        </div>
      </header>`;
}

function renderFooter(toRoute) {
  const social = socialLinks
    .map(
      (item) =>
        `<a class="site-footer-social-link" href="${item.href}" aria-label="${item.label}" target="_blank" rel="noopener noreferrer">${item.icon}</a>`
    )
    .join("");

  const groups = footerGroups
    .map((group) => {
      const items = group.links
        .map((link) => {
          const href = link.absolute ? link.href : toRoute(link.href);
          return `<li><a href="${href}">${link.label}</a></li>`;
        })
        .join("");
      return `
                <div class="site-footer-column">
                  <h3 class="site-footer-heading">${group.title}</h3>
                  <ul class="site-footer-list">
                    ${items}
                  </ul>
                </div>
              `;
    })
    .join("");

  return `      <footer class="site-footer" id="contact">
        <div class="site-footer-inner">
          <div class="site-footer-top">
            <div class="site-footer-brand">
              <div class="site-footer-social" aria-label="Retele sociale Marand">
                ${social}
              </div>
              <p class="site-footer-intro">Print shop profesionist — large format, bannere, canvas, stickere, textile și multe altele. Calitate și execuție rapidă.</p>
            </div>
            <div class="site-footer-links">
              ${groups}
            </div>
          </div>
          <p class="site-footer-legal">© 2026 Marand Print Shop. Toate drepturile rezervate.</p>
          <div class="site-footer-lockup" aria-hidden="true">
            <img class="site-footer-logo" src="${toRoute("/assets/brand/logo.svg")}" alt="" />
          </div>
        </div>
      </footer>`;
}

/* ------------------------------------------------------------------ *
 * Placeholder replacement
 * ------------------------------------------------------------------ */

/**
 * Replaces the contents of <div data-marand-shell-*> with `inner`.
 *
 * Scans for the balanced closing tag rather than the first </div>, so the
 * script stays idempotent once the placeholder already holds nested markup.
 */
function replaceShellBlock(html, attr, inner) {
  const open = new RegExp(`<div\\s+${attr}\\s*>`, "i").exec(html);
  if (!open) return null;

  const contentStart = open.index + open[0].length;
  const tagRe = /<(\/?)div\b[^>]*>/gi;
  tagRe.lastIndex = contentStart;

  let depth = 1;
  let end = -1;
  let match;
  while ((match = tagRe.exec(html)) !== null) {
    depth += match[1] === "/" ? -1 : 1;
    if (depth === 0) {
      end = match.index + match[0].length;
      break;
    }
  }
  if (end === -1) return null;

  return `${html.slice(0, open.index)}<div ${attr}>\n${inner}\n  </div>${html.slice(end)}`;
}

function navActiveFor(html) {
  const body = /<body([^>]*)>/i.exec(html);
  if (!body) return "";
  const active = /data-marand-nav-active="([^"]*)"/i.exec(body[1]);
  if (active) return active[1];
  const page = /data-marand-page="([^"]*)"/i.exec(body[1]);
  return page ? page[1] : "";
}

/* ------------------------------------------------------------------ *
 * Main
 * ------------------------------------------------------------------ */

let changed = 0;
let failed = 0;

for (const page of pages) {
  const path = join(ROOT, page.file);
  const original = readFileSync(path, "utf8");
  const toRoute = makeRoute(page.nested);

  let html = replaceShellBlock(
    original,
    "data-marand-shell-header",
    renderHeader(toRoute, navActiveFor(original))
  );
  if (html === null) {
    console.error(`  FAIL  ${page.file} — no header placeholder`);
    failed++;
    continue;
  }

  html = replaceShellBlock(html, "data-marand-shell-footer", renderFooter(toRoute));
  if (html === null) {
    console.error(`  FAIL  ${page.file} — no footer placeholder`);
    failed++;
    continue;
  }

  if (html === original) {
    console.log(`  ok    ${page.file} (unchanged)`);
    continue;
  }

  writeFileSync(path, html);
  console.log(`  wrote ${page.file}`);
  changed++;
}

console.log(`\n${changed} file(s) updated, ${failed} failed.`);
process.exit(failed > 0 ? 1 : 0);
