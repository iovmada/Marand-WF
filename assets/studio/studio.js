/**
 * Marand Studio — StudioPage
 *
 * The orchestrator. Owns the step state, builds the selectors, and wires the
 * editor together. Deliberately the only module that knows about the page's
 * DOM: products, scenes, geometry and transforms stay reusable.
 */

import { PRODUCT_ORDER, PRODUCTS, SIZES, getProduct } from "./products.js";
import { SCENES, DEFAULT_USER_QUAD, DEFAULT_USER_WALL_CM, getScene } from "./scenes.js";
import { loadImage, bindDropzone } from "./image-loader.js";
import { PreviewCanvas } from "./preview-canvas.js";
import { TransformControls } from "./transform-controls.js";
import { BeforeAfter } from "./before-after.js";
import { AI, applyOcclusionMask } from "./ai-hooks.js";
import { productThumb } from "./product-thumbs.js";

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

class StudioPage {
  constructor(root) {
    this.root = root;
    this.basePath = root.dataset.studioBase || "../assets/studio/";
    this.imagesBase = root.dataset.studioImages || "../assets/images/";

    this.artwork = null;
    this.spacePhoto = null;
    this.surfaceKind = "scene";
    this.sceneId = SCENES[0].id;

    this.cacheDom();
    this.buildProductCards();
    this.buildSceneCards();
    this.buildSizeChips();
    this.bindHero();
    this.bindUploads();
    this.bindTabs();
    this.bindEditorControls();
    this.updateSteps();
  }

  cacheDom() {
    const r = this.root;
    this.el = {
      steps: $$("[data-studio-step]", r),
      dropzone: $("[data-studio-dropzone]", r),
      fileInput: $("[data-studio-file]", r),
      thumb: $("[data-studio-thumb]", r),
      thumbName: $("[data-studio-thumb-name]", r),
      thumbMeta: $("[data-studio-thumb-meta]", r),
      imageState: $("[data-studio-image-state]", r),
      error: $("[data-studio-error]", r),
      products: $("[data-studio-products]", r),
      scenes: $("[data-studio-scenes]", r),
      spaceDropzone: $("[data-studio-space-dropzone]", r),
      spaceFileInput: $("[data-studio-space-file]", r),
      spaceState: $("[data-studio-space-state]", r),
      spaceThumb: $("[data-studio-space-thumb]", r),
      editor: $("[data-studio-editor]", r),
      stage: $("[data-studio-stage]", r),
      sizes: $("[data-studio-sizes]", r),
      sizeReadout: $("[data-studio-size-readout]", r),
      reset: $("[data-studio-reset]", r),
      perspective: $("[data-studio-perspective]", r),
      sheetToggle: $("[data-studio-sheet-toggle]", r),
      sheet: $("[data-studio-sheet]", r),
      baHandle: $("[data-studio-ba-handle]", r),
      baTrack: $("[data-studio-ba-track]", r),
      baToggle: $("[data-studio-ba-toggle]", r),
      composite: $("[data-studio-composite]", r),
      productMini: $("[data-studio-product-mini]", r)
    };
  }

  /* ---------------------------------------------------------------- *
   * Step 2 — products
   * ---------------------------------------------------------------- */

  buildProductCards() {
    this.el.products.innerHTML = "";
    PRODUCT_ORDER.forEach((id) => {
      const product = PRODUCTS[id];
      const card = document.createElement("button");
      card.type = "button";
      card.className = "studio-product-card";
      card.dataset.product = id;
      card.setAttribute("aria-pressed", "false");
      card.innerHTML = `
        <span class="studio-product-visual" data-visual="${id}" aria-hidden="true">${productThumb(
          id,
          this.artwork?.previewUrl || null,
          this.imagesBase
        )}</span>
        <span class="studio-product-name">${product.label}</span>
        <span class="studio-product-blurb">${product.blurb}</span>`;
      card.addEventListener("click", () => this.selectProduct(id));
      this.el.products.appendChild(card);
    });

    /* Compact switcher reused inside the editor sidebar. */
    if (this.el.productMini) {
      this.el.productMini.innerHTML = "";
      PRODUCT_ORDER.forEach((id) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "studio-chip";
        btn.dataset.productMini = id;
        btn.textContent = PRODUCTS[id].label;
        btn.addEventListener("click", () => this.selectProduct(id));
        this.el.productMini.appendChild(btn);
      });
    }
  }

  /**
   * Repaint the card thumbnails. Only does anything for products still on the
   * drawn SVG fallback — photographed products ignore the artwork URL.
   */
  refreshProductThumbs() {
    const href = this.artwork?.previewUrl || null;
    $$("[data-visual]", this.el.products).forEach((host) => {
      host.innerHTML = productThumb(host.dataset.visual, href, this.imagesBase);
    });
  }

  selectProduct(id) {
    this.productId = id;
    $$("[data-product]", this.el.products).forEach((card) => {
      const active = card.dataset.product === id;
      card.classList.toggle("is-active", active);
      card.setAttribute("aria-pressed", String(active));
    });
    $$("[data-product-mini]", this.root).forEach((btn) =>
      btn.classList.toggle("is-active", btn.dataset.productMini === id)
    );

    if (this.canvas) {
      this.canvas.setProduct(id);
      this.afterGeometryChange();
    }
    this.syncSizeAvailability();
    this.updateSteps();
  }

  /* ---------------------------------------------------------------- *
   * Step 3 — scenes
   * ---------------------------------------------------------------- */

  buildSceneCards() {
    this.el.scenes.innerHTML = "";
    SCENES.forEach((scene) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "studio-scene-card";
      card.dataset.scene = scene.id;
      card.setAttribute("aria-pressed", "false");

      const thumb = document.createElement("span");
      thumb.className = "studio-scene-thumb";
      thumb.setAttribute("aria-hidden", "true");
      if (scene.photo) {
        const img = document.createElement("img");
        img.src = `${this.basePath}scenes/${scene.photo}`;
        img.alt = "";
        thumb.appendChild(img);
      } else {
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("viewBox", "0 0 1600 1000");
        svg.setAttribute("preserveAspectRatio", "xMidYMid slice");
        svg.innerHTML = scene.draw();
        thumb.appendChild(svg);
      }

      const label = document.createElement("span");
      label.className = "studio-scene-name";
      label.textContent = scene.label;

      card.append(thumb, label);
      card.addEventListener("click", () => this.selectScene(scene.id));
      this.el.scenes.appendChild(card);
    });
  }

  selectScene(id) {
    this.sceneId = id;
    this.surfaceKind = "scene";
    $$("[data-scene]", this.el.scenes).forEach((card) => {
      const active = card.dataset.scene === id;
      card.classList.toggle("is-active", active);
      card.setAttribute("aria-pressed", String(active));
    });
    this.openEditor();
  }

  /* ---------------------------------------------------------------- *
   * Sizes
   * ---------------------------------------------------------------- */

  buildSizeChips() {
    this.el.sizes.innerHTML = "";
    SIZES.forEach((size) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "studio-chip";
      btn.dataset.size = size.id;
      btn.textContent = size.label;
      btn.addEventListener("click", () => this.applySize(size));
      this.el.sizes.appendChild(btn);
    });
  }

  applySize(size) {
    if (!this.canvas) return;
    if (size.id === "custom") {
      /* Custom keeps the artwork's own ratio at the current width. */
      const current = this.canvas.getSizeCm();
      const ratio = this.artwork?.ratio || 1;
      this.canvas.setSizeCm(current.w, current.w / ratio);
    } else {
      /* Follow the artwork's orientation rather than forcing portrait. */
      const landscape = (this.artwork?.ratio || 1) > 1;
      this.canvas.setSizeCm(
        landscape ? size.h : size.w,
        landscape ? size.w : size.h
      );
    }
    this.canvas.renderArtwork();
    this.afterGeometryChange();
  }

  syncSizeAvailability() {
    const product = getProduct(this.productId || "canvas");
    const coverage = product.sizeMode === "coverage";
    this.el.sizes.closest("[data-studio-size-group]")?.toggleAttribute("hidden", coverage);
  }

  syncSizeChips() {
    if (!this.canvas) return;
    const active = this.canvas.matchedSizeId();
    $$("[data-size]", this.el.sizes).forEach((btn) =>
      btn.classList.toggle("is-active", btn.dataset.size === active)
    );
    const { w, h } = this.canvas.getSizeCm();
    if (this.el.sizeReadout) {
      this.el.sizeReadout.textContent = `${Math.round(w)} × ${Math.round(h)} cm`;
    }
  }

  /* ---------------------------------------------------------------- *
   * Hero + uploads
   * ---------------------------------------------------------------- */

  bindHero() {
    $$("[data-studio-start]", this.root).forEach((btn) => {
      btn.addEventListener("click", () => {
        const target = btn.dataset.studioStart;
        if (target === "space") {
          this.setTab("mine");
          this.scrollToStep(this.artwork ? "space" : "image");
        } else {
          this.scrollToStep("image");
        }
        if (target !== "space" && !this.artwork) {
          setTimeout(() => this.el.fileInput.click(), 320);
        }
      });
    });
  }

  bindUploads() {
    bindDropzone(this.el.dropzone, this.el.fileInput, (file) =>
      this.ingestArtwork(file)
    );
    bindDropzone(this.el.spaceDropzone, this.el.spaceFileInput, (file) =>
      this.ingestSpace(file)
    );
    $$("[data-studio-change]", this.root).forEach((btn) =>
      btn.addEventListener("click", () => this.el.fileInput.click())
    );
    $$("[data-studio-space-change]", this.root).forEach((btn) =>
      btn.addEventListener("click", () => this.el.spaceFileInput.click())
    );
  }

  showError(message) {
    this.el.error.textContent = message || "";
    this.el.error.hidden = !message;
  }

  async ingestArtwork(file) {
    this.showError("");
    this.el.dropzone.classList.add("is-busy");
    try {
      const asset = await loadImage(file);
      this.artwork?.dispose();
      this.artwork = asset;

      this.el.thumb.innerHTML = "";
      const img = document.createElement("img");
      img.src = asset.thumbUrl;
      img.alt = "";
      this.el.thumb.appendChild(img);
      this.el.thumbName.textContent = asset.name;
      this.el.thumbMeta.textContent = `${asset.width} × ${asset.height} px preview`;
      this.el.imageState.dataset.state = "ready";

      this.refreshProductThumbs();
      if (!this.productId) this.selectProduct("canvas");
      if (this.canvas) {
        this.canvas.setAsset(asset);
        this.afterGeometryChange();
      }
      this.updateSteps();
      this.scrollToStep("product");
    } catch (err) {
      this.showError(err.message || "Nu am putut încărca imaginea.");
    } finally {
      this.el.dropzone.classList.remove("is-busy");
    }
  }

  async ingestSpace(file) {
    this.showError("");
    this.el.spaceDropzone.classList.add("is-busy");
    try {
      const asset = await loadImage(file);
      this.spacePhoto?.dispose();
      this.spacePhoto = asset;
      this.surfaceKind = "photo";

      this.el.spaceThumb.innerHTML = "";
      const img = document.createElement("img");
      img.src = asset.thumbUrl;
      img.alt = "";
      this.el.spaceThumb.appendChild(img);
      this.el.spaceState.dataset.state = "ready";

      $$("[data-scene]", this.el.scenes).forEach((c) =>
        c.classList.remove("is-active")
      );
      this.openEditor();
    } catch (err) {
      this.showError(err.message || "Nu am putut încărca fotografia.");
    } finally {
      this.el.spaceDropzone.classList.remove("is-busy");
    }
  }

  bindTabs() {
    $$("[data-studio-tab]", this.root).forEach((btn) =>
      btn.addEventListener("click", () => this.setTab(btn.dataset.studioTab))
    );
  }

  setTab(name) {
    $$("[data-studio-tab]", this.root).forEach((btn) => {
      const active = btn.dataset.studioTab === name;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-selected", String(active));
    });
    $$("[data-studio-panel]", this.root).forEach((panel) => {
      panel.hidden = panel.dataset.studioPanel !== name;
    });
  }

  /* ---------------------------------------------------------------- *
   * Editor
   * ---------------------------------------------------------------- */

  async openEditor() {
    if (!this.artwork) {
      this.scrollToStep("image");
      this.showError("Încarcă mai întâi imaginea pe care vrei să o printezi.");
      return;
    }

    this.el.editor.hidden = false;

    if (!this.canvas) {
      this.canvas = new PreviewCanvas(this.el.stage, { basePath: this.basePath });
      this.canvas.onChange(() => this.syncSizeChips());
      this.controls = new TransformControls(this.canvas, {
        onCommit: () => this.beforeAfter?.reveal()
      });
      this.beforeAfter = new BeforeAfter({
        stage: this.el.stage,
        composite: this.el.composite,
        handle: this.el.baHandle,
        track: this.el.baTrack,
        toggle: this.el.baToggle
      });
    }

    const surface = await this.buildSurface();
    this.canvas.setSurface(surface);
    this.canvas.setProduct(this.productId || "canvas");
    this.canvas.setAsset(this.artwork);
    this.canvas.reset();

    this.controls.setQuadMode(false);
    this.el.perspective?.toggleAttribute("hidden", surface.kind !== "photo");
    this.el.perspective?.classList.remove("is-active");

    this.afterGeometryChange();
    this.updateSteps();
    this.scrollToStep("editor");
  }

  /**
   * Build the surface descriptor. This is the single place an AI wall detector
   * would plug in — everything downstream only sees quad + wallWidthCm.
   */
  async buildSurface() {
    if (this.surfaceKind === "scene") {
      const scene = getScene(this.sceneId);
      return {
        kind: "scene",
        scene,
        quad: scene.wallQuad.map((p) => [...p]),
        wallWidthCm: scene.wallWidthCm,
        viewSide: scene.viewSide,
        aspect: 1.6
      };
    }

    const detected = await AI.run("surface.detect", {
      photoUrl: this.spacePhoto.previewUrl
    });

    const mask = await AI.run("occlusion.mask", {
      photoUrl: this.spacePhoto.previewUrl
    });
    this.pendingMask = mask?.maskUrl || null;

    return {
      kind: "photo",
      photoUrl: this.spacePhoto.previewUrl,
      quad: (detected?.quad || DEFAULT_USER_QUAD).map((p) => [...p]),
      wallWidthCm: detected?.wallWidthCm || DEFAULT_USER_WALL_CM,
      viewSide: "right",
      aspect: this.spacePhoto.ratio
    };
  }

  bindEditorControls() {
    this.el.reset?.addEventListener("click", () => {
      this.canvas?.reset();
      this.controls?.setQuadMode(false);
      this.el.perspective?.classList.remove("is-active");
      this.afterGeometryChange();
    });

    this.el.perspective?.addEventListener("click", () => {
      const on = !this.el.perspective.classList.contains("is-active");
      this.el.perspective.classList.toggle("is-active", on);
      this.el.perspective.setAttribute("aria-pressed", String(on));
      this.controls?.setQuadMode(on);
    });

    this.el.sheetToggle?.addEventListener("click", () => {
      const open = this.el.sheet.classList.toggle("is-open");
      this.el.sheetToggle.setAttribute("aria-expanded", String(open));
    });
  }

  afterGeometryChange() {
    this.syncSizeAvailability();
    this.syncSizeChips();
    this.beforeAfter?.reveal();
    if (this.pendingMask) applyOcclusionMask(this.canvas?.artEl, this.pendingMask);
  }

  /* ---------------------------------------------------------------- *
   * Step state
   * ---------------------------------------------------------------- */

  updateSteps() {
    const done = {
      image: Boolean(this.artwork),
      product: Boolean(this.productId),
      space: Boolean(this.canvas && !this.el.editor.hidden)
    };
    this.el.steps.forEach((step) => {
      const name = step.dataset.studioStep;
      const unlocked =
        name === "image" ||
        (name === "product" && done.image) ||
        (name === "space" && done.image);
      step.dataset.state = done[name] ? "done" : unlocked ? "active" : "locked";
    });
  }

  scrollToStep(name) {
    const target =
      name === "editor"
        ? this.el.editor
        : this.el.steps.find((s) => s.dataset.studioStep === name);
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

/* Boot once the DOM is ready; the page works with JS off down to the hero. */
function boot() {
  const root = document.querySelector("[data-studio-root]");
  if (!root) return;
  const page = new StudioPage(root);
  /* Exposed for future providers to register against from the console or a
     separate bundle, without this module having to import them. */
  window.MarandStudio = { page, AI };

  /* Internal scene-calibration tool. Dynamically imported so it costs normal
     visitors nothing: /studio/?calibrate=1 */
  if (new URLSearchParams(window.location.search).has("calibrate")) {
    import("./calibrate.js")
      .then((m) => m.mountCalibrator(page))
      .catch((err) => console.warn("[studio] calibrator failed to load", err));
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
