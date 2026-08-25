/**
 * Marand Studio — AI extension points
 *
 * NOTHING HERE CALLS AI. This file exists so that adding AI later is a matter
 * of registering a provider, not of rewriting the editor.
 *
 * The design rests on one observation: every capability on the roadmap either
 * produces a QUAD, a MASK, a SCALE or a SUGGESTION. The editor already speaks
 * exactly those four languages, so a provider only has to return one of them.
 *
 *   surface.detect     photo            -> { quad, wallWidthCm?, confidence? }
 *   surface.depth      photo            -> { depthMapUrl }            (informs quad)
 *   occlusion.mask     photo            -> { maskUrl }   plant/lamp in front of art
 *   object.remove      photo + region   -> { photoUrl }  cleared wall
 *   size.recommend     photo + quad     -> { widthCm, heightCm, reason }
 *   room.segment       photo            -> { regions: [{label, quad}] }
 *
 * Registering a provider:
 *
 *   import { AI } from "./ai-hooks.js";
 *   AI.register("surface.detect", async ({ photoUrl }) => {
 *     const res = await fetch("/api/studio/detect-wall", {
 *       method: "POST",
 *       body: JSON.stringify({ photoUrl })
 *     });
 *     return res.json();          // { quad: [[x,y],...], wallWidthCm: 320 }
 *   });
 *
 * The editor calls AI.run(...) and falls back to its manual behaviour whenever
 * a capability is absent, so the page keeps working with zero providers — which
 * is exactly the state it ships in.
 */

const providers = new Map();

export const AI_CAPABILITIES = [
  "surface.detect",
  "surface.depth",
  "occlusion.mask",
  "object.remove",
  "size.recommend",
  "room.segment"
];

export const AI = {
  register(capability, handler) {
    if (!AI_CAPABILITIES.includes(capability)) {
      console.warn(`[studio] unknown AI capability: ${capability}`);
    }
    providers.set(capability, handler);
    document.dispatchEvent(
      new CustomEvent("studio:ai-registered", { detail: { capability } })
    );
  },

  unregister(capability) {
    providers.delete(capability);
  },

  has(capability) {
    return providers.has(capability);
  },

  list() {
    return [...providers.keys()];
  },

  /**
   * Run a capability if present. Always resolves — a failing provider must
   * never take the editor down with it, because the manual path still works.
   */
  async run(capability, payload) {
    const handler = providers.get(capability);
    if (!handler) return null;
    try {
      return await handler(payload);
    } catch (err) {
      console.warn(`[studio] AI provider "${capability}" failed`, err);
      return null;
    }
  }
};

/**
 * Occlusion is the one capability that needs a hook in the render path rather
 * than a one-off call, so it gets a dedicated helper. Applying a mask is a
 * single CSS property on the artwork element — the mask makes a pot plant sit
 * in FRONT of the canvas instead of behind it.
 */
export function applyOcclusionMask(artEl, maskUrl) {
  if (!artEl) return;
  if (!maskUrl) {
    artEl.style.webkitMaskImage = "";
    artEl.style.maskImage = "";
    return;
  }
  artEl.style.webkitMaskImage = `url("${maskUrl}")`;
  artEl.style.maskImage = `url("${maskUrl}")`;
  artEl.style.webkitMaskSize = "100% 100%";
  artEl.style.maskSize = "100% 100%";
}
