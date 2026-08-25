/**
 * Marand Studio — product registry
 *
 * Each product owns its own physical behaviour: thickness, borders, shadows,
 * masks and how it reacts to the perspective of the surface it sits on. The
 * editor knows nothing about any specific product — it only calls build() and
 * reads the declared metadata. Adding a product is one entry in PRODUCTS, no
 * editor changes.
 *
 * Contract for a product:
 *   id            unique slug, also the CSS hook (.studio-art--<id>)
 *   label         Romanian UI label
 *   blurb         one short line for the selector card
 *   sizeMode      "print"    → sized in cm from the SIZES list
 *                 "coverage" → sized as a fraction of the wall (wallpaper)
 *   depthMm       how far it stands off the wall (drives the edge + shadow)
 *   defaultSizeCm [w, h] starting size
 *   allowRotate   whether the rotate handle is offered
 *   lockRatio     whether resize keeps the artwork aspect ratio
 *   shadow        { blur, spread, alpha, lift } contact-shadow tuning
 *   build(parts)  returns the DOM for the print itself
 */

/** Orientation-aware standard sizes, in centimetres. */
export const SIZES = [
  { id: "30x40", label: "30 × 40 cm", w: 30, h: 40 },
  { id: "40x60", label: "40 × 60 cm", w: 40, h: 60 },
  { id: "50x70", label: "50 × 70 cm", w: 50, h: 70 },
  { id: "60x90", label: "60 × 90 cm", w: 60, h: 90 },
  { id: "70x100", label: "70 × 100 cm", w: 70, h: 100 },
  { id: "custom", label: "Ratio propriu", w: null, h: null }
];

/** Build the <img> that carries the user's artwork, plus an optional overlay. */
function artworkImage(src, extraClass = "") {
  const img = document.createElement("img");
  img.className = `studio-art-image ${extraClass}`.trim();
  img.alt = "";
  img.draggable = false;
  if (src) img.src = src;
  return img;
}

function layer(className) {
  const el = document.createElement("div");
  el.className = className;
  return el;
}

/* ------------------------------------------------------------------ *
 * Renderers
 * ------------------------------------------------------------------ */

/**
 * Canvas — gallery wrapped. The artwork bleeds around a visible side edge so
 * the print reads as an object standing off the wall, not a sticker. The edge
 * is drawn on the side facing away from the viewer, which the scene declares.
 */
const canvasProduct = {
  id: "canvas",
  label: "Canvas",
  blurb: "Pânză întinsă pe șasiu, margini înfășurate",
  sizeMode: "print",
  depthMm: 38,
  defaultSizeCm: [50, 70],
  allowRotate: true,
  lockRatio: true,
  shadow: { blur: 34, spread: -6, alpha: 0.34, lift: 16 },
  build({ src, viewSide }) {
    const root = layer("studio-art-body studio-art--canvas");
    root.dataset.viewSide = viewSide;

    const face = layer("studio-art-face");
    face.appendChild(artworkImage(src));
    face.appendChild(layer("studio-art-weave"));
    face.appendChild(layer("studio-art-sheen"));

    // Wrapped edge: same image, shifted and darkened, sold as thickness.
    const edge = layer("studio-art-edge");
    edge.appendChild(artworkImage(src, "studio-art-edge-image"));
    edge.appendChild(layer("studio-art-edge-shade"));

    root.appendChild(edge);
    root.appendChild(face);
    return root;
  }
};

/** Poster — bare paper. Almost no depth, a whisper of a shadow, paper sheen. */
const posterProduct = {
  id: "poster",
  label: "Poster",
  blurb: "Hârtie fotografică, fără ramă",
  sizeMode: "print",
  depthMm: 1,
  defaultSizeCm: [50, 70],
  allowRotate: true,
  lockRatio: true,
  shadow: { blur: 14, spread: -8, alpha: 0.2, lift: 5 },
  build({ src }) {
    const root = layer("studio-art-body studio-art--poster");
    const face = layer("studio-art-face");
    face.appendChild(artworkImage(src));
    face.appendChild(layer("studio-art-paper"));
    root.appendChild(face);
    return root;
  }
};

/** Framed poster — frame, passepartout, glass reflection, real drop shadow. */
const framedPosterProduct = {
  id: "framedPoster",
  label: "Poster înrămat",
  blurb: "Ramă, passepartout și sticlă",
  sizeMode: "print",
  depthMm: 26,
  defaultSizeCm: [40, 60],
  allowRotate: true,
  lockRatio: true,
  shadow: { blur: 40, spread: -4, alpha: 0.4, lift: 18 },
  build({ src }) {
    const root = layer("studio-art-body studio-art--framed");

    const frame = layer("studio-art-frame");
    const mat = layer("studio-art-mat");
    const face = layer("studio-art-face");

    face.appendChild(artworkImage(src));
    face.appendChild(layer("studio-art-glass"));

    mat.appendChild(face);
    frame.appendChild(mat);
    frame.appendChild(layer("studio-art-frame-inner"));
    root.appendChild(frame);
    return root;
  }
};

/** Forex / PVC — rigid flat panel, matte, thin white cut edge, even shadow. */
const forexProduct = {
  id: "forex",
  label: "Forex / PVC",
  blurb: "Placă rigidă 5 mm, finisaj mat",
  sizeMode: "print",
  depthMm: 5,
  defaultSizeCm: [50, 70],
  allowRotate: true,
  lockRatio: true,
  shadow: { blur: 20, spread: -6, alpha: 0.26, lift: 8 },
  build({ src, viewSide }) {
    const root = layer("studio-art-body studio-art--forex");
    root.dataset.viewSide = viewSide;

    const edge = layer("studio-art-edge studio-art-edge--cut");
    const face = layer("studio-art-face");
    face.appendChild(artworkImage(src));
    face.appendChild(layer("studio-art-matte"));

    root.appendChild(edge);
    root.appendChild(face);
    return root;
  }
};

/**
 * Wallpaper — not an object on the wall, it IS the wall. Sized as a fraction
 * of the surface, no thickness, no cast shadow; instead it picks up the scene's
 * ambient shading so it sits under the room light rather than over it.
 */
const wallpaperProduct = {
  id: "wallpaper",
  label: "Wallpaper",
  blurb: "Acoperă suprafața peretelui",
  sizeMode: "coverage",
  depthMm: 0,
  defaultCoverage: { w: 1, h: 1 },
  allowRotate: false,
  lockRatio: false,
  shadow: null,
  build({ src }) {
    const root = layer("studio-art-body studio-art--wallpaper");
    const face = layer("studio-art-face");
    const img = artworkImage(src);
    img.classList.add("studio-art-image--cover");
    face.appendChild(img);
    face.appendChild(layer("studio-art-seams"));
    face.appendChild(layer("studio-art-ambient"));
    root.appendChild(face);
    return root;
  }
};

/**
 * Banner — deliberately NOT treated as a picture. It hangs, so it gets
 * grommets, a slight vertical slack in the material and a shadow that falls
 * away from the surface rather than hugging it.
 */
const bannerProduct = {
  id: "banner",
  label: "Banner",
  blurb: "PVC cu capse, pentru interior sau exterior",
  sizeMode: "print",
  depthMm: 3,
  defaultSizeCm: [100, 70],
  allowRotate: false,
  lockRatio: false,
  shadow: { blur: 30, spread: 0, alpha: 0.3, lift: 22 },
  build({ src }) {
    const root = layer("studio-art-body studio-art--banner");

    const face = layer("studio-art-face");
    face.appendChild(artworkImage(src));
    face.appendChild(layer("studio-art-slack"));

    const grommets = layer("studio-art-grommets");
    for (let i = 0; i < 4; i++) grommets.appendChild(layer("studio-art-grommet"));

    root.appendChild(face);
    root.appendChild(grommets);
    return root;
  }
};

export const PRODUCTS = {
  canvas: canvasProduct,
  poster: posterProduct,
  framedPoster: framedPosterProduct,
  forex: forexProduct,
  wallpaper: wallpaperProduct,
  banner: bannerProduct
};

/** Stable display order for the selector. */
export const PRODUCT_ORDER = [
  "canvas",
  "poster",
  "framedPoster",
  "forex",
  "wallpaper",
  "banner"
];

export const getProduct = (id) => PRODUCTS[id] || PRODUCTS.canvas;
