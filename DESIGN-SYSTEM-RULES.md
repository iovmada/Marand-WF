# Marand Design System Rules

## Rule 01: Global Page Shell
- The navigation bar and footer are global shell components.
- Every new page must include the same top nav and the same footer.
- Use `/Users/mada/Documents/Playground/marand-client-preview/assets/marand-shell.css` for shell styling.
- Use `/Users/mada/Documents/Playground/marand-client-preview/assets/marand-shell.js` to mount the shared shell markup.

## Rule 02: Active Navigation State
- Each page must set `data-marand-page` and `data-marand-nav-active` on `<body>`.
- Allowed active keys:
  - `products`
  - `design`
  - `process`
  - `production`
  - `equipment`
  - `contact`

## Rule 03: CTA System
- Secondary CTAs must use the shared `.button-secondary` class.
- The header CTA is reserved for the main quote action and must point to the quote page.

## Rule 04: Product Anchors
- Product pages must keep stable section ids for footer linking:
  - `large-format`
  - `banners`
  - `canvas`
  - `stickers`
  - `textiles`
  - `small-format`

## Rule 05: New Page Baseline
- All future pages start with:
  - shared shell
  - consistent container widths
  - same typography stack
  - same footer/legal block
