/**
 * Marand Studio — BeforeAfter
 *
 * One composite, one clip. Rather than rendering the scene twice, the layer
 * holding the print is clipped horizontally, so the right-hand side falls
 * through to the untouched room underneath. Cheap, and always perfectly
 * registered — there is no second render that could drift out of alignment.
 */

import { clamp } from "./geometry.js";

export class BeforeAfter {
  constructor({ stage, composite, handle, track, toggle }) {
    this.stage = stage;
    this.composite = composite;
    this.handle = handle;
    this.track = track;
    this.toggle = toggle;
    this.value = 100;
    this.dragging = false;

    this._down = (e) => {
      this.dragging = true;
      this.track.setPointerCapture?.(e.pointerId);
      this.fromEvent(e);
    };
    this._move = (e) => {
      if (!this.dragging) return;
      e.preventDefault();
      this.fromEvent(e);
    };
    this._up = () => {
      this.dragging = false;
    };
    this._key = (e) => {
      const step = e.shiftKey ? 12 : 4;
      if (e.key === "ArrowLeft") this.set(this.value - step);
      else if (e.key === "ArrowRight") this.set(this.value + step);
      else if (e.key === "Home") this.set(0);
      else if (e.key === "End") this.set(100);
      else return;
      e.preventDefault();
    };

    this.track.addEventListener("pointerdown", this._down);
    this.track.addEventListener("pointermove", this._move);
    this.track.addEventListener("pointerup", this._up);
    this.track.addEventListener("pointercancel", this._up);
    this.handle.addEventListener("keydown", this._key);

    if (this.toggle) {
      this.toggle.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-ba]");
        if (!btn) return;
        this.set(btn.dataset.ba === "original" ? 0 : 100);
      });
    }

    this.set(100);
  }

  fromEvent(event) {
    const rect = this.track.getBoundingClientRect();
    this.set(((event.clientX - rect.left) / rect.width) * 100);
  }

  set(next) {
    this.value = clamp(next, 0, 100);
    /* Reveal the print only to the left of the divider. */
    this.composite.style.clipPath = `inset(0 ${100 - this.value}% 0 0)`;
    this.handle.style.left = `${this.value}%`;
    this.handle.setAttribute("aria-valuenow", String(Math.round(this.value)));
    this.stage.dataset.baState =
      this.value >= 99 ? "preview" : this.value <= 1 ? "original" : "split";

    if (this.toggle) {
      this.toggle.querySelectorAll("[data-ba]").forEach((btn) => {
        const isPreview = btn.dataset.ba === "preview";
        const active = isPreview ? this.value >= 99 : this.value <= 1;
        btn.classList.toggle("is-active", active);
        btn.setAttribute("aria-pressed", String(active));
      });
    }
  }

  /** Snap back to full preview — used whenever the composition changes. */
  reveal() {
    if (this.value < 100) this.set(100);
  }

  destroy() {
    this.track.removeEventListener("pointerdown", this._down);
    this.track.removeEventListener("pointermove", this._move);
    this.track.removeEventListener("pointerup", this._up);
    this.track.removeEventListener("pointercancel", this._up);
    this.handle.removeEventListener("keydown", this._key);
  }
}
