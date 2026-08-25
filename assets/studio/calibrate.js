/**
 * Marand Studio — scene calibrator (internal tool)
 *
 * Open /studio/?calibrate=1
 *
 * Adding a real photograph as a Marand scene needs two pieces of data that
 * cannot be guessed from the file: the four corners of the wall, and how wide
 * that wall is in centimetres. Hand-writing those coordinates is the only
 * genuinely fiddly part of the whole feature, so this does it visually:
 *
 *   1. upload the room photo under "Spațiul meu"
 *   2. drag the four green corners onto the corners of the wall
 *   3. type the real wall width — the print resizes live, so you can sanity
 *      check it against something of known size in the shot
 *   4. copy the generated object straight into SCENES in scenes.js
 *   5. drop the photo at assets/studio/scenes/<id>.jpg
 *
 * Never loaded for normal visitors: studio.js dynamic-imports this only when
 * the query flag is present.
 */

const styles = `
  position: fixed;
  left: 16px;
  bottom: 16px;
  z-index: 9999;
  width: max-content;
  max-width: 340px;
  max-height: calc(100vh - 32px);
  overflow: auto;
  padding: 16px;
  border-radius: 16px;
  background: rgba(18, 18, 20, 0.94);
  backdrop-filter: blur(10px);
  color: #f2f2f2;
  font: 12px/1.5 "Roboto Mono", ui-monospace, monospace;
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.45);
`;

const field = (label, id, value, extra = "") => `
  <label style="display:block;margin-bottom:8px">
    <span style="display:block;opacity:.6;margin-bottom:3px">${label}</span>
    <input id="${id}" value="${value}" ${extra}
      style="width:100%;padding:6px 8px;border:1px solid #3a3a3e;border-radius:8px;
             background:#26262a;color:#fff;font:inherit" />
  </label>`;

export function mountCalibrator(page) {
  const panel = document.createElement("div");
  panel.setAttribute("style", styles);
  panel.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px">
      <strong style="font-size:12px;letter-spacing:.06em">CALIBRARE SCENĂ</strong>
      <button id="cal-toggle" type="button"
        style="margin-left:auto;border:0;background:none;color:#9dfd43;cursor:pointer;font:inherit">deschide</button>
      <button id="cal-close" type="button"
        style="border:0;background:none;color:#888;cursor:pointer;font:inherit">✕</button>
    </div>
    <div id="cal-body" hidden style="margin-top:12px">

    <p id="cal-hint" style="margin:0 0 12px;opacity:.65">
      Încarcă o fotografie la „Spațiul meu", apoi trage cele 4 colțuri verzi pe colțurile peretelui.
    </p>

    ${field("id (și numele fișierului)", "cal-id", "scena-noua")}
    ${field("label (afișat în UI)", "cal-label", "Scenă nouă")}
    ${field("lățime perete (cm)", "cal-width", "300", 'type="number" min="60" step="10"')}
    ${field("viewSide (left / right)", "cal-side", "right")}

    <pre id="cal-out" style="margin:12px 0 8px;padding:10px;border-radius:10px;background:#0e0e10;
      white-space:pre-wrap;word-break:break-word;font:inherit;color:#9dfd43;max-height:230px;overflow:auto"></pre>

    <button id="cal-copy" type="button"
      style="width:100%;padding:9px;border:0;border-radius:9px;background:#9dfd43;color:#14140f;
             font:inherit;font-weight:700;cursor:pointer">Copiază pentru scenes.js</button>
    <p id="cal-status" style="margin:8px 0 0;opacity:.6;min-height:1.4em"></p>
    </div>
  `;
  document.body.appendChild(panel);

  const el = (id) => panel.querySelector(`#${id}`);
  const out = el("cal-out");
  const status = el("cal-status");

  const round = (n) => Math.round(n * 1000) / 1000;

  function snippet() {
    const canvas = page.canvas;
    if (!canvas?.surface) {
      return "// Încarcă o fotografie la „Spațiul meu\" ca să începi.";
    }
    const id = el("cal-id").value.trim() || "scena-noua";
    const label = el("cal-label").value.trim() || "Scenă nouă";
    const width = Number(el("cal-width").value) || 300;
    const side = el("cal-side").value.trim() === "left" ? "left" : "right";
    const quad = canvas.surface.quad
      .map(([x, y]) => `      [${round(x)}, ${round(y)}]`)
      .join(",\n");

    return `  {
    id: "${id}",
    label: "${label}",
    photo: "${id}.jpg",
    wallWidthCm: ${width},
    viewSide: "${side}",
    wallQuad: [
${quad}
    ],
    draw() { return ""; }   // unused once photo is set
  },`;
  }

  function refresh() {
    out.textContent = snippet();
  }

  /* Apply the typed wall width immediately, so the print's size on screen is
     a live check: if a 50 cm print looks wrong against the furniture, the
     number is wrong. */
  function applyWidth() {
    const canvas = page.canvas;
    const width = Number(el("cal-width").value);
    if (canvas?.surface && width > 0) {
      canvas.surface.wallWidthCm = width;
      canvas.layout();
      canvas.renderArtwork();
    }
    refresh();
  }

  panel.addEventListener("input", (e) => {
    if (e.target.id === "cal-width") applyWidth();
    else refresh();
  });

  el("cal-copy").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(out.textContent);
      status.textContent = "Copiat. Lipește în SCENES din scenes.js.";
    } catch {
      status.textContent = "Copiere blocată — selectează manual textul.";
    }
  });

  el("cal-close").addEventListener("click", () => panel.remove());

  const toggle = el("cal-toggle");
  toggle.addEventListener("click", () => {
    const body = el("cal-body");
    const open = body.hasAttribute("hidden");
    body.toggleAttribute("hidden", !open);
    panel.style.width = open ? "340px" : "max-content";
    toggle.textContent = open ? "închide" : "deschide";
  });

  /* Follow every corner drag live. */
  const attach = () => {
    if (!page.canvas || attach.done) return;
    attach.done = true;
    page.canvas.onChange(refresh);
    page.controls?.setQuadMode(true);
    el("cal-hint").textContent =
      "Trage colțurile verzi pe colțurile peretelui, apoi verifică lățimea în cm.";
    refresh();
  };

  /* The editor does not exist until a photo is loaded, so poll briefly. */
  const timer = setInterval(() => {
    attach();
    if (attach.done) clearInterval(timer);
  }, 400);

  refresh();
  console.info("[studio] calibrator active — /studio/?calibrate=1");
}
