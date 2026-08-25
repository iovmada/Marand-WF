/**
 * Marand Studio — TransformControls
 *
 * Pointer Events throughout, so mouse, touch and pen share one code path and
 * two-finger pinch is a natural extension rather than a separate touch branch.
 *
 * All arithmetic happens in WALL UNITS, not screen pixels. Dragging a print
 * across a wall seen at an angle therefore follows the wall instead of sliding
 * flatly across the screen — the difference you feel immediately on the angled
 * scenes (bucătărie, birou, restaurant, comercial).
 */

import { getProduct } from "./products.js";

const HANDLE_CORNERS = ["nw", "ne", "se", "sw"];

export class TransformControls {
  constructor(canvas, { onCommit } = {}) {
    this.canvas = canvas;
    this.onCommit = onCommit || (() => {});
    this.layer = canvas.handleLayer;
    this.pointers = new Map();
    this.mode = null;
    this.quadMode = false;

    this.buildHandles();

    this._onDown = this.handleDown.bind(this);
    this._onMove = this.handleMove.bind(this);
    this._onUp = this.handleUp.bind(this);
    this._onKey = this.handleKey.bind(this);
    this._onWheel = this.handleWheel.bind(this);

    const stage = canvas.root;
    stage.addEventListener("pointerdown", this._onDown);
    stage.addEventListener("pointermove", this._onMove);
    stage.addEventListener("pointerup", this._onUp);
    stage.addEventListener("pointercancel", this._onUp);
    stage.addEventListener("keydown", this._onKey);
    stage.addEventListener("wheel", this._onWheel, { passive: false });

    this.unsub = canvas.onChange(() => this.syncHandles());
  }

  /* ---------------------------------------------------------------- *
   * Handles
   * ---------------------------------------------------------------- */

  buildHandles() {
    this.layer.innerHTML = "";

    /* SVG, not a clipped div: we need a stroked quad, and a clip-path on a
       filled box cannot produce an outline that follows perspective. */
    const ns = "http://www.w3.org/2000/svg";
    this.frameSvg = document.createElementNS(ns, "svg");
    this.frameSvg.setAttribute("class", "studio-frame-outline");
    this.frameSvg.setAttribute("aria-hidden", "true");
    this.framePoly = document.createElementNS(ns, "polygon");
    this.frameSvg.appendChild(this.framePoly);
    this.layer.appendChild(this.frameSvg);

    this.cornerEls = HANDLE_CORNERS.map((corner) => {
      const el = document.createElement("button");
      el.type = "button";
      el.className = "studio-handle studio-handle--corner";
      el.dataset.handle = corner;
      el.setAttribute("aria-label", "Redimensionează printul");
      el.tabIndex = -1;
      this.layer.appendChild(el);
      return el;
    });

    this.rotateEl = document.createElement("button");
    this.rotateEl.type = "button";
    this.rotateEl.className = "studio-handle studio-handle--rotate";
    this.rotateEl.dataset.handle = "rotate";
    this.rotateEl.setAttribute("aria-label", "Rotește printul");
    this.rotateEl.tabIndex = -1;
    this.rotateEl.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5a7 7 0 1 1-6.3 4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M5 4v5h5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    this.layer.appendChild(this.rotateEl);

    /* Perspective corners — only offered on user photos, where we have no
       idea where the wall is until someone (or later, a detector) says so. */
    this.quadEls = HANDLE_CORNERS.map((corner, index) => {
      const el = document.createElement("button");
      el.type = "button";
      el.className = "studio-handle studio-handle--quad";
      el.dataset.quad = String(index);
      el.setAttribute("aria-label", "Ajustează colțul peretelui");
      el.tabIndex = -1;
      this.layer.appendChild(el);
      return el;
    });
  }

  setQuadMode(on) {
    this.quadMode = on;
    this.layer.dataset.quadMode = on ? "on" : "off";
    this.syncHandles();
  }

  syncHandles() {
    const canvas = this.canvas;
    if (!canvas.surface || !canvas.artEl) return;

    const product = getProduct(canvas.productId);
    const corners = canvas.artCornersPx();

    this.cornerEls.forEach((el, i) => {
      el.style.left = `${corners[i][0]}px`;
      el.style.top = `${corners[i][1]}px`;
      el.hidden = this.quadMode;
    });

    /* Outline follows the projected corners exactly, so it stays glued to the
       print even in perspective. */
    const { w: stageW, h: stageH } = canvas.stageSize();
    this.frameSvg.setAttribute("viewBox", `0 0 ${stageW} ${stageH}`);
    this.framePoly.setAttribute(
      "points",
      corners.map(([x, y]) => `${x},${y}`).join(" ")
    );
    this.frameSvg.hidden = this.quadMode;

    const top = [
      (corners[0][0] + corners[1][0]) / 2,
      (corners[0][1] + corners[1][1]) / 2
    ];
    const bottom = [
      (corners[3][0] + corners[2][0]) / 2,
      (corners[3][1] + corners[2][1]) / 2
    ];
    const dx = top[0] - bottom[0];
    const dy = top[1] - bottom[1];
    const len = Math.hypot(dx, dy) || 1;
    this.rotateEl.style.left = `${top[0] + (dx / len) * 34}px`;
    this.rotateEl.style.top = `${top[1] + (dy / len) * 34}px`;
    this.rotateEl.hidden = !product.allowRotate || this.quadMode;

    this.quadEls.forEach((el, i) => {
      const [nx, ny] = canvas.surface.quad[i];
      el.style.left = `${nx * stageW}px`;
      el.style.top = `${ny * stageH}px`;
      el.hidden = !this.quadMode;
    });
  }

  /* ---------------------------------------------------------------- *
   * Pointer handling
   * ---------------------------------------------------------------- */

  stagePoint(event) {
    const rect = this.canvas.root.getBoundingClientRect();
    return [event.clientX - rect.left, event.clientY - rect.top];
  }

  wallPoint(event) {
    const [x, y] = this.stagePoint(event);
    return this.canvas.unproject(x, y);
  }

  handleDown(event) {
    const target = event.target.closest("[data-handle], [data-quad]");
    const onArt = event.target.closest(".studio-art");
    if (!target && !onArt) return;

    event.preventDefault();
    this.canvas.root.setPointerCapture?.(event.pointerId);
    this.canvas.root.focus({ preventScroll: true });

    this.pointers.set(event.pointerId, {
      stage: this.stagePoint(event),
      wall: this.wallPoint(event)
    });

    if (this.pointers.size === 2) {
      this.beginPinch();
      return;
    }

    const art = { ...this.canvas.art };

    if (target?.dataset.quad !== undefined) {
      this.mode = { type: "quad", index: Number(target.dataset.quad) };
    } else if (target?.dataset.handle === "rotate") {
      this.mode = { type: "rotate", startRot: art.rot };
    } else if (target?.dataset.handle) {
      this.mode = { type: "resize", corner: target.dataset.handle, art };
    } else {
      this.mode = {
        type: "drag",
        art,
        grab: this.wallPoint(event)
      };
    }

    this.canvas.root.dataset.interacting = "true";
  }

  beginPinch() {
    const [a, b] = [...this.pointers.values()];
    const dist = Math.hypot(b.wall[0] - a.wall[0], b.wall[1] - a.wall[1]);
    const angle = Math.atan2(b.stage[1] - a.stage[1], b.stage[0] - a.stage[0]);
    this.mode = {
      type: "pinch",
      startDist: dist || 1,
      startAngle: angle,
      art: { ...this.canvas.art },
      startCentre: [
        (a.wall[0] + b.wall[0]) / 2,
        (a.wall[1] + b.wall[1]) / 2
      ]
    };
  }

  handleMove(event) {
    if (!this.pointers.has(event.pointerId)) return;
    this.pointers.set(event.pointerId, {
      stage: this.stagePoint(event),
      wall: this.wallPoint(event)
    });
    if (!this.mode) return;

    event.preventDefault();
    const canvas = this.canvas;

    if (this.mode.type === "pinch" && this.pointers.size >= 2) {
      const [a, b] = [...this.pointers.values()];
      const dist = Math.hypot(b.wall[0] - a.wall[0], b.wall[1] - a.wall[1]);
      const factor = dist / this.mode.startDist;
      canvas.art.w = this.mode.art.w;
      canvas.art.h = this.mode.art.h;
      canvas.scaleBy(factor);

      const centre = [
        (a.wall[0] + b.wall[0]) / 2,
        (a.wall[1] + b.wall[1]) / 2
      ];
      canvas.moveTo(
        this.mode.art.x + (centre[0] - this.mode.startCentre[0]),
        this.mode.art.y + (centre[1] - this.mode.startCentre[1])
      );

      const product = getProduct(canvas.productId);
      if (product.allowRotate) {
        const angle = Math.atan2(
          b.stage[1] - a.stage[1],
          b.stage[0] - a.stage[0]
        );
        const delta = ((angle - this.mode.startAngle) * 180) / Math.PI;
        canvas.rotateTo(this.mode.art.rot + delta);
      }
      return;
    }

    if (this.mode.type === "drag") {
      const [wx, wy] = this.wallPoint(event);
      canvas.moveTo(
        this.mode.art.x + (wx - this.mode.grab[0]),
        this.mode.art.y + (wy - this.mode.grab[1])
      );
      return;
    }

    if (this.mode.type === "resize") {
      const [wx, wy] = this.wallPoint(event);
      const { art, corner } = this.mode;
      const rad = (-art.rot * Math.PI) / 180;
      const dx = wx - art.x;
      const dy = wy - art.y;
      /* Undo rotation so the corner maths stays axis aligned. */
      const lx = dx * Math.cos(rad) - dy * Math.sin(rad);
      const ly = dx * Math.sin(rad) + dy * Math.cos(rad);

      let w = Math.abs(lx) * 2;
      let h = Math.abs(ly) * 2;

      const product = getProduct(canvas.productId);
      if (product.lockRatio) {
        const ratio = art.w / art.h;
        /* Follow whichever axis the pointer pushed further. */
        if (w / ratio > h) h = w / ratio;
        else w = h * ratio;
      }
      canvas.setSizeUnits(w, h);
      void corner;
      return;
    }

    if (this.mode.type === "rotate") {
      const [wx, wy] = this.wallPoint(event);
      const deg =
        (Math.atan2(wx - canvas.art.x, -(wy - canvas.art.y)) * 180) / Math.PI;
      canvas.rotateTo(deg);
      return;
    }

    if (this.mode.type === "quad") {
      const [sx, sy] = this.stagePoint(event);
      const { w, h } = canvas.stageSize();
      const quad = canvas.surface.quad.map((p) => [...p]);
      quad[this.mode.index] = [
        Math.min(1.2, Math.max(-0.2, sx / w)),
        Math.min(1.2, Math.max(-0.2, sy / h))
      ];
      canvas.setQuad(quad);
    }
  }

  handleUp(event) {
    this.pointers.delete(event.pointerId);
    if (this.pointers.size === 0) {
      this.mode = null;
      delete this.canvas.root.dataset.interacting;
      this.onCommit();
    } else if (this.mode?.type === "pinch") {
      /* One finger lifted mid-pinch — restart as a drag from where we are. */
      const [remaining] = [...this.pointers.values()];
      this.mode = {
        type: "drag",
        art: { ...this.canvas.art },
        grab: remaining.wall
      };
    }
  }

  handleKey(event) {
    const step = event.shiftKey ? 24 : 6;
    const canvas = this.canvas;
    const map = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step]
    };
    if (map[event.key]) {
      event.preventDefault();
      canvas.moveTo(canvas.art.x + map[event.key][0], canvas.art.y + map[event.key][1]);
      this.onCommit();
      return;
    }
    if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      canvas.scaleBy(1.06);
      this.onCommit();
    }
    if (event.key === "-" || event.key === "_") {
      event.preventDefault();
      canvas.scaleBy(1 / 1.06);
      this.onCommit();
    }
  }

  handleWheel(event) {
    if (!event.target.closest(".studio-art") && !event.ctrlKey) return;
    event.preventDefault();
    const factor = event.deltaY < 0 ? 1.05 : 1 / 1.05;
    this.canvas.scaleBy(factor);
    this.onCommit();
  }

  destroy() {
    const stage = this.canvas.root;
    stage.removeEventListener("pointerdown", this._onDown);
    stage.removeEventListener("pointermove", this._onMove);
    stage.removeEventListener("pointerup", this._onUp);
    stage.removeEventListener("pointercancel", this._onUp);
    stage.removeEventListener("keydown", this._onKey);
    stage.removeEventListener("wheel", this._onWheel);
    this.unsub?.();
  }
}
