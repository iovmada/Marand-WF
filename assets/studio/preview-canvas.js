/**
 * Marand Studio — PreviewCanvas / ArtworkLayer / ProductRenderer
 *
 * The stage is a stack of four layers:
 *
 *   .studio-scene      the room (drawn SVG or photo)
 *   .studio-wall       the SURFACE PLANE — carries the homography, so anything
 *                      inside it is genuinely in the plane of the wall
 *   .studio-art        the print, positioned in flat wall units
 *   .studio-handles    controls, OUTSIDE the transform so they stay square
 *
 * Wall units: the surface is always 1000 units wide, however wide it is in real
 * life. Height comes from the shape of the quad so a square in wall units looks
 * square on screen. Centimetres convert in through `unitsPerCm`, which is what
 * makes a 30x40 read visibly smaller than a 70x100 on the same wall.
 */

import { planeTransform, project, clamp } from "./geometry.js";
import { getProduct, SIZES } from "./products.js";
import { renderSceneBackground } from "./scenes.js";

const WALL_UNITS = 1000;

export class PreviewCanvas {
  constructor(root, { basePath = "" } = {}) {
    this.root = root;
    this.basePath = basePath;

    this.sceneLayer = root.querySelector("[data-studio-scene]");
    this.composite = root.querySelector("[data-studio-composite]");
    this.wallLayer = root.querySelector("[data-studio-wall]");
    this.handleLayer = root.querySelector("[data-studio-handles]");

    this.surface = null;
    this.productId = "canvas";
    this.asset = null;

    /** Artwork position/size in wall units; centre-anchored. */
    this.art = { x: 500, y: 380, w: 200, h: 280, rot: 0 };

    this.transform = { forward: null, inverse: null, css: "none" };
    this.listeners = new Set();

    this._observer = new ResizeObserver(() => this.layout());
    this._observer.observe(root);
  }

  onChange(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  emit() {
    this.listeners.forEach((fn) => fn(this));
  }

  /* ---------------------------------------------------------------- *
   * Surface
   * ---------------------------------------------------------------- */

  /**
   * A surface is the universal input: a quad, a real-world width and a
   * background. Marand scenes and user photos both arrive through here, which
   * is why AI wall detection can later feed it without touching the editor.
   */
  setSurface(surface) {
    this.surface = surface;
    this.root.style.setProperty("--stage-ratio", String(surface.aspect || 1.6));
    this.root.dataset.surfaceKind = surface.kind;

    if (surface.kind === "scene") {
      renderSceneBackground(surface.scene, this.sceneLayer, this.basePath);
    } else {
      this.sceneLayer.innerHTML = "";
      const img = document.createElement("img");
      img.className = "studio-scene-photo";
      img.alt = "";
      img.src = surface.photoUrl;
      this.sceneLayer.appendChild(img);
    }

    this.layout();
    this.centreArtwork();
  }

  setQuad(quad) {
    if (!this.surface) return;
    this.surface.quad = quad;
    this.layout();
  }

  /* ---------------------------------------------------------------- *
   * Geometry
   * ---------------------------------------------------------------- */

  stageSize() {
    return { w: this.root.clientWidth, h: this.root.clientHeight };
  }

  /** Quad in stage pixels, from the normalised quad on the surface. */
  quadPx() {
    const { w, h } = this.stageSize();
    return this.surface.quad.map(([x, y]) => [x * w, y * h]);
  }

  /** Wall height in units, derived from the quad so units stay isotropic. */
  wallHeightUnits() {
    const q = this.quadPx();
    const dist = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
    const wpx = (dist(q[0], q[1]) + dist(q[3], q[2])) / 2;
    const hpx = (dist(q[0], q[3]) + dist(q[1], q[2])) / 2;
    if (!wpx) return WALL_UNITS;
    return WALL_UNITS * (hpx / wpx);
  }

  unitsPerCm() {
    return WALL_UNITS / (this.surface?.wallWidthCm || 300);
  }

  layout() {
    if (!this.surface) return;
    const { w, h } = this.stageSize();
    if (!w || !h) return;

    const hUnits = this.wallHeightUnits();
    this.wallUnits = { w: WALL_UNITS, h: hUnits };

    this.wallLayer.style.width = `${WALL_UNITS}px`;
    this.wallLayer.style.height = `${hUnits}px`;

    this.transform = planeTransform(WALL_UNITS, hUnits, this.quadPx());
    this.wallLayer.style.transform = this.transform.css;

    this.renderArtwork();
    this.emit();
  }

  /** Wall units -> stage pixels. */
  project(x, y) {
    if (!this.transform.forward) return [0, 0];
    return project(this.transform.forward, x, y);
  }

  /** Stage pixels -> wall units. */
  unproject(x, y) {
    if (!this.transform.inverse) return [0, 0];
    return project(this.transform.inverse, x, y);
  }

  /* ---------------------------------------------------------------- *
   * Product + artwork
   * ---------------------------------------------------------------- */

  setProduct(id) {
    const previous = getProduct(this.productId);
    this.productId = id;
    const product = getProduct(id);

    /* Coverage products fill the wall; print products keep a physical size. */
    if (product.sizeMode === "coverage") {
      this.art.w = WALL_UNITS;
      this.art.h = this.wallUnits?.h || WALL_UNITS;
      this.art.x = WALL_UNITS / 2;
      this.art.y = (this.wallUnits?.h || WALL_UNITS) / 2;
      this.art.rot = 0;
    } else if (previous.sizeMode === "coverage") {
      /* Coming back from wallpaper — restore a sane physical size. */
      this.setSizeCm(...product.defaultSizeCm);
      this.centreArtwork();
    } else if (!product.allowRotate) {
      this.art.rot = 0;
    }

    this.buildProduct();
    this.renderArtwork();
    this.emit();
  }

  setAsset(asset) {
    this.asset = asset;
    this.buildProduct();
    if (asset) this.applyAssetRatio();
    this.renderArtwork();
    this.emit();
  }

  /** Keep the print's aspect ratio equal to the artwork's. */
  applyAssetRatio() {
    const product = getProduct(this.productId);
    if (!product.lockRatio || !this.asset) return;
    const area = this.art.w * this.art.h;
    const ratio = this.asset.ratio;
    this.art.h = Math.sqrt(area / ratio);
    this.art.w = this.art.h * ratio;
  }

  setSizeCm(wCm, hCm) {
    const k = this.unitsPerCm();
    this.art.w = wCm * k;
    this.art.h = hCm * k;
    this.sizeCm = { w: wCm, h: hCm };
  }

  /** Current size in centimetres, derived back out of wall units. */
  getSizeCm() {
    const k = this.unitsPerCm();
    return { w: this.art.w / k, h: this.art.h / k };
  }

  centreArtwork() {
    const hUnits = this.wallUnits?.h || WALL_UNITS;
    this.art.x = WALL_UNITS / 2;
    this.art.y = hUnits * 0.42;
    this.renderArtwork();
  }

  reset() {
    const product = getProduct(this.productId);
    if (product.sizeMode === "coverage") {
      this.setProduct(this.productId);
      return;
    }
    this.setSizeCm(...product.defaultSizeCm);
    this.applyAssetRatio();
    this.art.rot = 0;
    this.centreArtwork();
    this.emit();
  }

  /** ProductRenderer: rebuild the print's DOM for the current product. */
  buildProduct() {
    const product = getProduct(this.productId);
    this.wallLayer.innerHTML = "";

    this.artEl = document.createElement("div");
    this.artEl.className = "studio-art";
    this.artEl.dataset.product = product.id;
    this.artEl.setAttribute("role", "img");
    this.artEl.setAttribute(
      "aria-label",
      `Previzualizare ${product.label}${this.asset ? ` — ${this.asset.name}` : ""}`
    );

    const body = product.build({
      src: this.asset?.previewUrl || "",
      viewSide: this.surface?.viewSide || "right"
    });
    this.artEl.appendChild(body);
    this.wallLayer.appendChild(this.artEl);
  }

  /** ArtworkLayer: push current geometry into styles. */
  renderArtwork() {
    if (!this.artEl || !this.surface) return;
    const product = getProduct(this.productId);
    const { x, y, w, h, rot } = this.art;

    this.artEl.style.width = `${w}px`;
    this.artEl.style.height = `${h}px`;
    this.artEl.style.left = `${x - w / 2}px`;
    this.artEl.style.top = `${y - h / 2}px`;
    this.artEl.style.transform = rot ? `rotate(${rot}deg)` : "";

    /* Thickness and shadow are physical, so they scale with the wall. */
    const k = this.unitsPerCm();
    const edge = (product.depthMm / 10) * k;
    this.artEl.style.setProperty("--edge", `${edge}px`);

    if (product.shadow) {
      const s = product.shadow;
      const scale = k / 3;
      this.artEl.style.setProperty("--shadow-blur", `${s.blur * scale}px`);
      this.artEl.style.setProperty("--shadow-spread", `${s.spread * scale}px`);
      this.artEl.style.setProperty("--shadow-lift", `${s.lift * scale}px`);
      this.artEl.style.setProperty("--shadow-alpha", String(s.alpha));
    } else {
      this.artEl.style.setProperty("--shadow-blur", "0px");
      this.artEl.style.setProperty("--shadow-spread", "0px");
      this.artEl.style.setProperty("--shadow-lift", "0px");
      this.artEl.style.setProperty("--shadow-alpha", "0");
    }
  }

  /* ---------------------------------------------------------------- *
   * Mutation used by TransformControls
   * ---------------------------------------------------------------- */

  moveTo(xUnits, yUnits) {
    const margin = 0.35;
    const hUnits = this.wallUnits?.h || WALL_UNITS;
    this.art.x = clamp(xUnits, -this.art.w * margin, WALL_UNITS + this.art.w * margin);
    this.art.y = clamp(yUnits, -this.art.h * margin, hUnits + this.art.h * margin);
    this.renderArtwork();
    this.emit();
  }

  scaleBy(factor, { keepRatio = true } = {}) {
    const product = getProduct(this.productId);
    const minUnits = 8 * this.unitsPerCm();
    const maxUnits = WALL_UNITS * 2.2;

    let w = clamp(this.art.w * factor, minUnits, maxUnits);
    let h = keepRatio || product.lockRatio ? (w / this.art.w) * this.art.h : this.art.h;
    if (h < minUnits) {
      h = minUnits;
      w = (h / this.art.h) * this.art.w;
    }
    this.art.w = w;
    this.art.h = h;
    this.renderArtwork();
    this.emit();
  }

  setSizeUnits(w, h) {
    const minUnits = 8 * this.unitsPerCm();
    this.art.w = Math.max(minUnits, w);
    this.art.h = Math.max(minUnits, h);
    this.renderArtwork();
    this.emit();
  }

  rotateTo(deg) {
    if (!getProduct(this.productId).allowRotate) return;
    /* Snap near the horizontal so nothing ends up subtly crooked. */
    const snapped = Math.abs(deg) < 1.2 ? 0 : deg;
    this.art.rot = clamp(snapped, -25, 25);
    this.renderArtwork();
    this.emit();
  }

  /** Corners of the print in stage px, for drawing handles. */
  artCornersPx() {
    const { x, y, w, h, rot } = this.art;
    const rad = (rot * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const local = [
      [-w / 2, -h / 2],
      [w / 2, -h / 2],
      [w / 2, h / 2],
      [-w / 2, h / 2]
    ];
    return local.map(([lx, ly]) =>
      this.project(x + lx * cos - ly * sin, y + lx * sin + ly * cos)
    );
  }

  matchedSizeId() {
    const { w, h } = this.getSizeCm();
    const hit = SIZES.find(
      (s) => s.w && Math.abs(s.w - w) < 1.5 && Math.abs(s.h - h) < 1.5
    );
    return hit ? hit.id : "custom";
  }

  destroy() {
    this._observer.disconnect();
    this.listeners.clear();
  }
}
