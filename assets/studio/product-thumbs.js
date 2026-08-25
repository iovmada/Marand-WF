/**
 * Marand Studio — product thumbnails
 *
 * Illustrations for the "Tipul de print" cards. Each one shows what makes that
 * product physically different: the canvas has a wrapped side edge, the framed
 * poster has a frame and glass, the banner hangs from a bar with grommets, the
 * wallpaper covers architecture rather than sitting on it.
 *
 * PHOTOGRAPHS FIRST. Marand already owns real product photography, so each
 * card uses a real photo of that product (PHOTOS below). The drawn SVG is the
 * fallback for any product without one — and it is still worth keeping, since
 * it can carry the user's own artwork when no photograph exists.
 *
 * Each photo needs an explicit `position`: the sources are square or 4:3 and
 * the card is 16:10, so an unguided `cover` crop cuts off the actual product.
 *
 * Kept out of products.js on purpose: that module describes physics for the
 * real renderer, this one is presentation for the selector.
 */

/**
 * Real Marand product photography, relative to /assets/images/.
 * `position` is the CSS object-position that keeps the product in frame.
 */
export const PHOTOS = {
  canvas: {
    src: "produse/canvas-printuri.webp",
    position: "50% 38%",
    alt: "Tablouri canvas Marand cu margini înfășurate"
  },
  poster: {
    src: "produse/poster-hartie-foto.webp",
    position: "50% 45%",
    alt: "Postere printate pe hârtie fotografică"
  },
  framedPoster: {
    src: "produse-test/foto-fine-art.webp",
    position: "32% 50%",
    alt: "Print fine-art înrămat cu passepartout"
  },
  forex: {
    src: "produse-test/panou-pmma-pvc.webp",
    position: "86% 50%",
    alt: "Panou rigid PVC / PMMA montat pe perete"
  },
  wallpaper: {
    src: "produse/grafica-vitrine.webp",
    position: "50% 42%",
    alt: "Folie printată aplicată pe suprafață mare"
  },
  banner: {
    src: "produse-test/banner-frontlit.webp",
    position: "50% 50%",
    alt: "Banner PVC frontlit cu capse, montat pe fațadă"
  }
};

const VIEWBOX = "0 0 320 200";

/** Gradients, shadows and the artwork paint, namespaced per product. */
function defs(uid, href, extra = "") {
  return `
    <defs>
      <linearGradient id="wall-${uid}" x1="0" y1="0" x2="0.7" y2="1">
        <stop offset="0" stop-color="#f2efe9"/>
        <stop offset="1" stop-color="#ddd8ce"/>
      </linearGradient>
      <linearGradient id="art-${uid}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#12309c"/>
        <stop offset="0.55" stop-color="#4a68d8"/>
        <stop offset="1" stop-color="#9dfd43"/>
      </linearGradient>
      <linearGradient id="frame-${uid}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#3c352e"/>
        <stop offset="0.5" stop-color="#221e1a"/>
        <stop offset="1" stop-color="#453c33"/>
      </linearGradient>
      <linearGradient id="metal-${uid}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#e9e9ec"/>
        <stop offset="0.5" stop-color="#a9adb3"/>
        <stop offset="1" stop-color="#77797e"/>
      </linearGradient>
      <filter id="soft-${uid}" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="6"/>
      </filter>
      <filter id="tight-${uid}" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="2.4"/>
      </filter>
      ${extra}
    </defs>`;
}

/**
 * Paint the print area. Falls back to the gradient until a photo exists, and
 * uses `slice` so the user's image fills the area at any aspect ratio.
 */
function art(uid, href, x, y, w, h, clip) {
  const clipAttr = clip ? ` clip-path="url(#${clip})"` : "";
  if (href) {
    return `<image href="${href}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice"${clipAttr}/>`;
  }
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#art-${uid})"${clipAttr}/>`;
}

const wall = (uid) => `<rect x="0" y="0" width="320" height="200" fill="url(#wall-${uid})"/>`;

const svg = (inner) =>
  `<svg viewBox="${VIEWBOX}" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">${inner}</svg>`;

/* ------------------------------------------------------------------ *
 * Canvas — gallery wrap, seen slightly from the left so the wrapped
 * side edge and the depth of the stretcher bar are both visible.
 * ------------------------------------------------------------------ */

function canvasThumb(href) {
  const uid = "cv";
  const edgeClip = `
    <clipPath id="edge-${uid}"><polygon points="238,46 252,56 252,168 238,158"/></clipPath>
    <linearGradient id="turn-${uid}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#000" stop-opacity="0.16"/>
      <stop offset="1" stop-color="#000" stop-opacity="0.38"/>
    </linearGradient>`;
  return svg(`
    ${defs(uid, href, edgeClip)}
    ${wall(uid)}
    <rect x="86" y="56" width="160" height="112" fill="#000" opacity="0.34" filter="url(#soft-${uid})"/>

    <!-- wrapped side edge: the artwork continues around the stretcher, shaded
         with a gradient rather than flat black so it reads as canvas turning -->
    ${art(uid, href, 232, 46, 26, 122, `edge-${uid}`)}
    <polygon points="238,46 252,56 252,168 238,158" fill="url(#turn-${uid})"/>

    <!-- bottom edge -->
    <polygon points="78,158 238,158 252,168 92,168" fill="#000" opacity="0.22"/>

    <!-- face -->
    ${art(uid, href, 78, 46, 160, 112)}
    <polygon points="78,46 238,46 238,158 78,158" fill="none" stroke="#000" stroke-opacity="0.12"/>
  `);
}

/* ------------------------------------------------------------------ *
 * Poster — bare paper. Thin, no depth, and one corner lifting so it
 * reads as a sheet rather than a rigid panel.
 * ------------------------------------------------------------------ */

function posterThumb(href) {
  const uid = "ps";
  /* Free edges bow very slightly — paper never hangs dead straight. */
  const sheet = "M90,38 C88,72 92,112 90,150 L198,162 L234,146 C232,110 236,74 234,42 Z";
  const sheetClip = `<clipPath id="sheet-${uid}"><path d="${sheet}"/></clipPath>`;
  return svg(`
    ${defs(uid, href, sheetClip)}
    ${wall(uid)}
    <g transform="rotate(-1.4 160 100)">
      <path d="${sheet}" transform="translate(2,7)" fill="#000" opacity="0.18" filter="url(#tight-${uid})"/>
      ${art(uid, href, 88, 38, 148, 126, `sheet-${uid}`)}

      <!-- curled corner: the tell that this is a sheet, not a panel -->
      <path d="M198,162 L234,146 L232,170 Z" fill="#f7f5f0"/>
      <path d="M198,162 L234,146 L232,170 Z" fill="#000" opacity="0.07"/>
      <path d="M198,162 L234,146" stroke="#000" stroke-opacity="0.2" stroke-width="1.2"/>
      <path d="${sheet}" fill="none" stroke="#000" stroke-opacity="0.1"/>
    </g>
  `);
}

/* ------------------------------------------------------------------ *
 * Framed poster — frame, passepartout and a glass glint.
 * ------------------------------------------------------------------ */

function framedThumb(href) {
  const uid = "fr";
  return svg(`
    ${defs(uid, href)}
    ${wall(uid)}
    <rect x="80" y="42" width="168" height="132" fill="#000" opacity="0.4" filter="url(#soft-${uid})"/>

    <rect x="74" y="32" width="172" height="136" fill="url(#frame-${uid})"/>
    <rect x="86" y="44" width="148" height="112" fill="#f6f4ef"/>
    ${art(uid, href, 100, 58, 120, 84)}

    <!-- glass -->
    <polygon points="74,32 150,32 74,120" fill="#fff" opacity="0.14"/>
    <polygon points="74,32 116,32 74,80" fill="#fff" opacity="0.12"/>
    <rect x="86" y="44" width="148" height="112" fill="none" stroke="#000" stroke-opacity="0.35"/>
    <rect x="74" y="32" width="172" height="136" fill="none" stroke="#000" stroke-opacity="0.3"/>
  `);
}

/* ------------------------------------------------------------------ *
 * Forex / PVC — rigid panel, matte, thin white cut edge, flat shadow.
 * ------------------------------------------------------------------ */

function forexThumb(href) {
  const uid = "fx";
  return svg(`
    ${defs(uid, href)}
    ${wall(uid)}
    <!-- offset shadow: a 5 mm rigid sheet sits proud of the wall -->
    <rect x="96" y="60" width="150" height="106" fill="#000" opacity="0.26" filter="url(#soft-${uid})"/>

    <!-- white PVC core, visible on the two cut edges -->
    <polygon points="234,50 244,58 244,164 234,156" fill="#f4f4f1"/>
    <polygon points="84,156 234,156 244,164 94,164" fill="#e6e6e2"/>
    <polygon points="234,50 244,58 244,164 234,156" fill="#000" opacity="0.06"/>

    ${art(uid, href, 84, 48, 150, 108)}
    <rect x="84" y="48" width="150" height="108" fill="#f4f4f0" opacity="0.18"/>
    <rect x="84" y="48" width="150" height="108" fill="none" stroke="#000" stroke-opacity="0.12"/>
  `);
}

/* ------------------------------------------------------------------ *
 * Wallpaper — architecture, not an object. The print takes the whole
 * receding wall, with the adjacent wall and floor left bare so the
 * difference is obvious at a glance.
 * ------------------------------------------------------------------ */

function wallpaperThumb(href) {
  const uid = "wp";
  const clip = `<clipPath id="wp-${uid}"><polygon points="26,20 178,52 178,166 26,190"/></clipPath>`;
  return svg(`
    ${defs(uid, href, clip)}
    <rect x="0" y="0" width="320" height="200" fill="#f2efe9"/>

    <!-- bare adjacent wall + floor for contrast -->
    <polygon points="178,52 320,30 320,176 178,166" fill="#e2ddd3"/>
    <polygon points="26,190 178,166 320,176 320,200 0,200" fill="#c4b39b"/>

    <!-- the papered wall -->
    ${art(uid, href, 20, 20, 164, 170, `wp-${uid}`)}
    <g clip-path="url(#wp-${uid})" opacity="0.4">
      <path d="M77,0 V200" stroke="#000" stroke-opacity="0.18"/>
      <path d="M128,0 V200" stroke="#000" stroke-opacity="0.18"/>
    </g>
    <polygon points="26,20 178,52 178,166 26,190" fill="#000" opacity="0.06"/>
    <path d="M178,52 V166" stroke="#000" stroke-opacity="0.16"/>
  `);
}

/* ------------------------------------------------------------------ *
 * Banner — hangs. Bar, cables, grommets and slack in the material.
 * ------------------------------------------------------------------ */

function bannerThumb(href) {
  const uid = "bn";
  const shape = "M62,52 C112,60 208,60 258,52 L258,158 C208,166 112,166 62,158 Z";
  const clip = `<clipPath id="bn-${uid}"><path d="${shape}"/></clipPath>`;
  return svg(`
    ${defs(uid, href, clip)}
    ${wall(uid)}

    <!-- suspension -->
    <path d="M96,20 V44 M224,20 V44" stroke="#8d9096" stroke-width="2"/>
    <rect x="56" y="38" width="208" height="8" rx="4" fill="url(#metal-${uid})"/>

    <path d="${shape}" transform="translate(6,8)" fill="#000" opacity="0.28" filter="url(#soft-${uid})"/>
    ${art(uid, href, 56, 46, 208, 124, `bn-${uid}`)}

    <!-- slack: the material never hangs perfectly flat -->
    <g clip-path="url(#bn-${uid})">
      <rect x="56" y="46" width="208" height="16" fill="#000" opacity="0.16"/>
      <rect x="56" y="148" width="208" height="18" fill="#000" opacity="0.14"/>
    </g>
    <path d="${shape}" fill="none" stroke="#000" stroke-opacity="0.14"/>

    <!-- grommets -->
    <g fill="#d9dade" stroke="#5f6166" stroke-width="1.4">
      <circle cx="74" cy="62" r="4"/>
      <circle cx="246" cy="62" r="4"/>
      <circle cx="74" cy="150" r="4"/>
      <circle cx="246" cy="150" r="4"/>
    </g>
  `);
}

const THUMBS = {
  canvas: canvasThumb,
  poster: posterThumb,
  framedPoster: framedThumb,
  forex: forexThumb,
  wallpaper: wallpaperThumb,
  banner: bannerThumb
};

/**
 * Markup for a product card thumbnail.
 *
 * Prefers Marand's real product photography. Falls back to the drawn SVG when
 * a product has no photo, in which case `href` (the user's preview URL) is
 * composited into the illustration.
 *
 * `imagesBase` points at /assets/images/ from the calling page.
 */
export function productThumb(id, href = null, imagesBase = "../assets/images/") {
  const photo = PHOTOS[id];
  if (photo) {
    return `<img class="studio-product-photo" src="${imagesBase}${photo.src}" alt="" loading="lazy" decoding="async" style="object-position:${photo.position}" />`;
  }
  const build = THUMBS[id] || THUMBS.canvas;
  return build(href);
}
