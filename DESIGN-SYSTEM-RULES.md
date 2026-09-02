# Marand Design System

Verified against the built pages on 2026-09-02. Everything below is what
`index.html`, `materiale/`, `echipamente/`, `studio/` and
`assets/marand-shell.css` actually do — not an aspiration.

> The previous version of this file pointed at
> `/Users/mada/Documents/Playground/marand-client-preview` and described a
> `.button-secondary` class that has never existed in this repo. If something
> here disagrees with the stylesheet, the stylesheet wins — and this file is
> wrong and should be fixed.

---

## Rule 01 — The shell is generated, never hand-edited

The header and footer are baked into every page as static HTML by
`scripts/build-shell.mjs`, which is the **single source of truth** for the nav
and the footer.

```
node scripts/build-shell.mjs        # after ANY nav or footer change
```

Forgetting this means the change never appears. The script is idempotent, so
re-running is always safe. `assets/marand-shell.js` only binds burger and
mobile-nav behaviour to the pre-rendered DOM — it no longer injects markup.

Page modes in the `pages` array:

| `nested` | Href prefix | Used by |
|---|---|---|
| `false` | `./` | `index.html` |
| `true` | `../` | every page in a subdirectory |
| `"root"` | `/` | `404.html` only |

`404.html` must stay root-absolute: the error document is served for *any*
missing path, so relative hrefs would resolve differently depending on how
deep the bad URL was.

## Rule 02 — Body attributes

Every page sets both on `<body>`:

```html
<body data-marand-page="products" data-marand-nav-active="products">
```

Active keys in use: `products`, `materials`, `studio`, `process`, `equipment`,
`production`, `contact`, `design`, `404`. The nav's `is-active` class is
rendered by the generator from `data-marand-nav-active`.

## Rule 03 — Typography

Display face is `"Acrom", "Roboto Flex", sans-serif`, loaded via `@font-face`
in `marand-shell.css` (Light 300 / Bold 700 / ExtraBold 800). The **body base
is Roboto Flex**, not Acrom — Acrom is applied explicitly to headings, copy
blocks and CTAs.

| Role | Size / line-height | Weight | Letter-spacing | Colour |
|---|---|---|---|---|
| Page `h1` | 68px / 0.96 | 700 | −0.09em | `#0b0b0b` |
| Section `h2` | 52px / 55px | 700 | −0.09em | `#0b0b0b` or `#020202` |
| Sub-section `h3` | 37px / 45px | 700 | −0.06em | `#1a1a1a` |
| Body copy | 20px / 26px | 300 | −0.06em | `#020202` |
| Spec / meta label | 13px / 27px | 900 | +0.04em, UPPERCASE | `#776f6f` |
| Numeric meta | Roboto Mono 13–15px | 700 | — | `#333` |

The 900-weight uppercase spec style is for two- or three-word labels. It
shouts at paragraph length — use Roboto Mono sentence case there instead.

**Do not derive sizes from padding and line-height arithmetic.** Read the
exact value out of the stylesheet.

## Rule 04 — Section chip

Every section opens with the same lime pill (`.section-chip`, `.equip-chip`,
`.products-module-chip`, `.studio-eyebrow` are all the same thing):

```css
display: inline-flex; min-height: 35px; padding: 4px 16px;
border-radius: 24px; background: var(--lime); color: #000;
font: 700 12px/1 "Acrom", "Roboto Flex", sans-serif;
```

Lowercase on the homepage, `/materiale/` and `/studio/`; uppercase on
`/echipamente/`. Pick one per page and stay consistent within it.

## Rule 05 — CTAs

**Never re-implement a button.** Use the shared classes from
`assets/marand-shell.css`:

- `.cta` — 63px tall, `padding: 0 32px`, `border: 2px solid var(--blue)`,
  radius 32px, Acrom 700 13px uppercase
- `.cta-primary` — blue fill, white text
- `.cta-secondary` — white fill, blue on hover
- `.cta-flat` — suppresses the hover lift
- `.cta-pill` — radius 100px

The header CTA is reserved for the quote action and points at `/oferta/`.
Local variants are allowed only for size (see `.studio-cta-sm`), never for
colour or type.

## Rule 06 — Tokens, spacing, surfaces

```
--blue:  #0c24c2   the one active / selected colour
--lime:  #9dfd43   accent only, never a surface
--bg:    #f7f7f7   --surface: #fcfcfc   --border: #e1e1e1
--container:          1165px   text-heavy pages
--module-grid-width:  1376px   full-width modules
--shadow-card: 0 7px 14px rgba(0, 0, 0, 0.06)
```

- Section width is always `min(calc(100% - 60px), <container|module-grid>)`.
- Radii: **32px** outer surfaces, **24px** nested, **999px / 100px** pills.
- Section headers stack chip / heading / copy, left-aligned, 32px gap.
- Inner pages open at `padding-top: 130px`.
- `[id] { scroll-margin-top: 110px; }` on every page with anchors.

## Rule 07 — Closing banner

`.tpl-cta-banner` is the standard page ending:
`min(calc(100% - 60px), 1376px)` wide, `padding: 64px 32px`, black,
32px radius, centred, 32px gap, white 52/55 heading, white 20/26 copy, and a
`.cta.cta-primary` with `min-width: 215px`.

## Rule 08 — Product anchors

Product pages keep these ids stable, because the footer links to them:
`large-format`, `banners`, `canvas`, `stickers`, `textiles`, `small-format`.

## Rule 09 — New page baseline

A new page starts with: the generated shell, the token block above, the
typography scale, the shared CTAs, a `.tpl-cta-banner` ending — and then gets
added to **all four** of:

1. `scripts/build-shell.mjs` → `pages` (so it gets nav and footer)
2. `scripts/build-agent-files.mjs` → `pages` (markdown mirror, llms.txt entry)
3. `sitemap.xml`
4. the nested-page regex in `assets/marand-shell.js` **and**
   `assets/chatbot.js`, or its asset paths and chatbot routes break

Then run the generators and `bash scripts/test.sh`.

## Rule 10 — Known deviation

`/productie/` still uses the `tpl-*` template's own smaller type scale rather
than the scale in Rule 03. Its content is real, but bringing its typography
onto the system is outstanding work.

## Rule 11 — Generators

Three, all idempotent, run in this order:

```
node scripts/build-trust-pages.mjs   # /despre/ /confidentialitate/ + aliases
node scripts/build-shell.mjs         # nav + footer into every page
node scripts/build-agent-files.mjs   # .md mirrors, llms.txt, JSON-LD, 404.md
bash scripts/test.sh                 # unit + idempotency + endpoints
```

Never hand-edit their output. `scripts/serve-local.mjs` serves the site the
way the host does (error document, `/api` proxy) — use it, not
`python3 -m http.server`, which does not return `404.html` on a miss.
