/**
 * Marand Studio — image loading
 *
 * Everything happens in the browser. A user photo is never uploaded anywhere:
 * it is decoded, downscaled and held as a blob URL for the lifetime of the tab,
 * then revoked. That is what makes the privacy promise on the page true rather
 * than a policy sentence.
 *
 * The editor NEVER touches the full-resolution decode. It gets a preview capped
 * at PREVIEW_MAX_EDGE; the original File object is kept by reference only (no
 * second decode) so a future "send to Marand" step can upload the real file.
 */

export const PREVIEW_MAX_EDGE = 2400;
export const THUMB_MAX_EDGE = 320;

/** Scenes the user shoots themselves are usually big; cap the input politely. */
export const MAX_INPUT_BYTES = 40 * 1024 * 1024;

const ACCEPTED = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif"
];

/** Some browsers report an empty type for HEIC, so fall back to the extension. */
function looksAccepted(file) {
  if (file.type && ACCEPTED.includes(file.type.toLowerCase())) return true;
  return /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name || "");
}

const isHeic = (file) =>
  /image\/hei[cf]/i.test(file.type || "") || /\.hei[cf]$/i.test(file.name || "");

export class ImageLoadError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}

/**
 * Decode a file to something drawable. createImageBitmap is preferred because
 * it honours EXIF orientation and decodes off the main thread; the <img> path
 * is the fallback for browsers that refuse the blob (notably HEIC on Chrome).
 */
async function decode(file) {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch (err) {
      /* fall through to the <img> path */
    }
  }

  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("decode failed"));
      el.src = url;
    });
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Stepped halving down to the target. Drawing 6000px straight into a 2400px
 * canvas produces visible aliasing; halving until we are within 2x does not.
 */
function downscale(source, maxEdge) {
  const sw = source.width;
  const sh = source.height;
  const longest = Math.max(sw, sh);
  const ratio = longest > maxEdge ? maxEdge / longest : 1;

  let w = Math.max(1, Math.round(sw * ratio));
  let h = Math.max(1, Math.round(sh * ratio));

  let canvas = document.createElement("canvas");
  let cw = sw;
  let ch = sh;
  canvas.width = cw;
  canvas.height = ch;
  let ctx = canvas.getContext("2d");
  ctx.drawImage(source, 0, 0);

  while (cw > w * 2 && ch > h * 2) {
    const next = document.createElement("canvas");
    next.width = Math.max(w, Math.floor(cw / 2));
    next.height = Math.max(h, Math.floor(ch / 2));
    const nctx = next.getContext("2d");
    nctx.imageSmoothingQuality = "high";
    nctx.drawImage(canvas, 0, 0, next.width, next.height);
    canvas = next;
    cw = next.width;
    ch = next.height;
  }

  if (cw !== w || ch !== h) {
    const out = document.createElement("canvas");
    out.width = w;
    out.height = h;
    const octx = out.getContext("2d");
    octx.imageSmoothingQuality = "high";
    octx.drawImage(canvas, 0, 0, w, h);
    canvas = out;
  }

  return canvas;
}

function toBlobUrl(canvas) {
  return new Promise((resolve) => {
    const done = (blob) => resolve(blob ? URL.createObjectURL(blob) : canvas.toDataURL("image/jpeg", 0.9));
    if (canvas.toBlob) canvas.toBlob(done, "image/webp", 0.92);
    else done(null);
  });
}

/**
 * Load a user file into a preview-ready asset.
 * Returns { previewUrl, thumbUrl, width, height, ratio, name, file, dispose }
 * where width/height describe the PREVIEW, and ratio is the original ratio.
 */
export async function loadImage(file) {
  if (!file) throw new ImageLoadError("Nu am primit niciun fișier.", "empty");

  if (!looksAccepted(file)) {
    throw new ImageLoadError(
      "Format neacceptat. Folosește JPG, PNG, WebP sau HEIC.",
      "type"
    );
  }

  if (file.size > MAX_INPUT_BYTES) {
    throw new ImageLoadError(
      "Imaginea depășește 40 MB. Trimite o variantă mai mică.",
      "size"
    );
  }

  let source;
  try {
    source = await decode(file);
  } catch (err) {
    throw new ImageLoadError(
      isHeic(file)
        ? "Browserul tău nu poate deschide HEIC. Salvează fotografia ca JPG și încearcă din nou."
        : "Nu am putut citi imaginea. Încearcă alt fișier.",
      isHeic(file) ? "heic" : "decode"
    );
  }

  if (!source.width || !source.height) {
    throw new ImageLoadError("Imaginea pare goală sau coruptă.", "decode");
  }

  const previewCanvas = downscale(source, PREVIEW_MAX_EDGE);
  const thumbCanvas = downscale(previewCanvas, THUMB_MAX_EDGE);

  const [previewUrl, thumbUrl] = await Promise.all([
    toBlobUrl(previewCanvas),
    toBlobUrl(thumbCanvas)
  ]);

  if (typeof source.close === "function") source.close();

  const asset = {
    previewUrl,
    thumbUrl,
    width: previewCanvas.width,
    height: previewCanvas.height,
    ratio: previewCanvas.width / previewCanvas.height,
    name: file.name || "imagine",
    /* Reference only — never decoded again in the editor. */
    file,
    dispose() {
      if (previewUrl.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
      if (thumbUrl.startsWith("blob:")) URL.revokeObjectURL(thumbUrl);
    }
  };

  return asset;
}

/**
 * Wire an element as a drag & drop + click target for a single image.
 * Returns a detach function.
 */
export function bindDropzone(element, input, onFile) {
  const stop = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const enter = (e) => {
    stop(e);
    element.classList.add("is-dragging");
  };
  const leave = (e) => {
    stop(e);
    element.classList.remove("is-dragging");
  };
  const drop = (e) => {
    stop(e);
    element.classList.remove("is-dragging");
    const file = e.dataTransfer?.files?.[0];
    if (file) onFile(file);
  };
  const pick = () => input.click();
  const change = () => {
    const file = input.files?.[0];
    if (file) onFile(file);
    /* Reset so choosing the same file twice still fires. */
    input.value = "";
  };
  const keyed = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      pick();
    }
  };

  element.addEventListener("dragenter", enter);
  element.addEventListener("dragover", enter);
  element.addEventListener("dragleave", leave);
  element.addEventListener("drop", drop);
  element.addEventListener("click", pick);
  element.addEventListener("keydown", keyed);
  input.addEventListener("change", change);

  return () => {
    element.removeEventListener("dragenter", enter);
    element.removeEventListener("dragover", enter);
    element.removeEventListener("dragleave", leave);
    element.removeEventListener("drop", drop);
    element.removeEventListener("click", pick);
    element.removeEventListener("keydown", keyed);
    input.removeEventListener("change", change);
  };
}
