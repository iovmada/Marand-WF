/**
 * Marand Studio — scene manifest
 *
 * A scene is a background plus ONE piece of real information: the quad of the
 * surface a print can land on, and how wide that surface is in centimetres.
 * Everything else (perspective, scale, drag limits) is derived from those two.
 *
 * ----------------------------------------------------------------------------
 * ON THE ARTWORK IN THESE SCENES
 * ----------------------------------------------------------------------------
 * The repository contains no interior photography, so every scene ships with a
 * drawn interior. These are rendered rather than flat: directional light on
 * every plane, ambient occlusion along the corners, blurred contact shadows and
 * — on polished floors — reflections. They still read as illustration, which is
 * the honest option until real photographs exist.
 *
 * EVERY gradient and filter id is namespaced per scene. This matters: the
 * selector renders all eight scenes into one document alongside the editor
 * stage, so unnamespaced ids collide and the first definition silently wins for
 * every scene — which is exactly why per-scene lighting used to be discarded.
 *
 * To swap in a real photograph:
 *   1. drop the file at  assets/studio/scenes/<id>.jpg  — that is enough to see
 *      it, because renderSceneBackground tries that path for every scene and
 *      only falls back to the drawing when the file is missing
 *   2. calibrate  wallQuad  and  wallWidthCm  for that photo, which
 *      /studio/?calibrate=1 generates for you visually
 * The `photo` field stays available for a filename that is not <id>.jpg.
 */

/* ------------------------------------------------------------------ *
 * Shared rendering toolkit
 * ------------------------------------------------------------------ */

/**
 * Per-scene defs. `light` is the side the main light arrives from, and the
 * plane gradients are oriented from it so every surface agrees on one source.
 */
function defs(uid, p) {
  const fromLeft = p.light !== "right";
  return `
    <defs>
      <!-- back wall: bright where the light lands, falling off across the plane -->
      <linearGradient id="bw-${uid}" x1="${fromLeft ? 0 : 1}" y1="0" x2="${fromLeft ? 1 : 0}" y2="0.35">
        <stop offset="0" stop-color="${p.wallLit}"/>
        <stop offset="0.62" stop-color="${p.wall}"/>
        <stop offset="1" stop-color="${p.wallShade}"/>
      </linearGradient>

      <!-- side walls sit off-axis to the light, so they stay darker -->
      <linearGradient id="swl-${uid}" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="${fromLeft ? p.wall : p.sideDark}"/>
        <stop offset="1" stop-color="${fromLeft ? p.wallLit : p.side}"/>
      </linearGradient>
      <linearGradient id="swr-${uid}" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="${fromLeft ? p.side : p.wallLit}"/>
        <stop offset="1" stop-color="${fromLeft ? p.sideDark : p.wall}"/>
      </linearGradient>

      <linearGradient id="ceil-${uid}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${p.ceilShade}"/>
        <stop offset="1" stop-color="${p.ceiling}"/>
      </linearGradient>

      <linearGradient id="fl-${uid}" x1="0" y1="0" x2="0.25" y2="1">
        <stop offset="0" stop-color="${p.floorFar}"/>
        <stop offset="1" stop-color="${p.floor}"/>
      </linearGradient>

      <!-- ambient occlusion: contact darkening along plane junctions -->
      <linearGradient id="aoDown-${uid}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#000" stop-opacity="0.3"/>
        <stop offset="1" stop-color="#000" stop-opacity="0"/>
      </linearGradient>
      <linearGradient id="aoUp-${uid}" x1="0" y1="1" x2="0" y2="0">
        <stop offset="0" stop-color="#000" stop-opacity="0.34"/>
        <stop offset="1" stop-color="#000" stop-opacity="0"/>
      </linearGradient>
      <linearGradient id="aoSide-${uid}" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#000" stop-opacity="0.26"/>
        <stop offset="1" stop-color="#000" stop-opacity="0"/>
      </linearGradient>

      <linearGradient id="glass-${uid}" x1="0" y1="0" x2="0.6" y2="1">
        <stop offset="0" stop-color="#ffffff" stop-opacity="0.95"/>
        <stop offset="1" stop-color="#dfeaf2" stop-opacity="0.5"/>
      </linearGradient>

      <!-- pool of daylight spilling onto the floor -->
      <linearGradient id="pool-${uid}" x1="0" y1="0" x2="0.4" y2="1">
        <stop offset="0" stop-color="#fff6e2" stop-opacity="0.5"/>
        <stop offset="1" stop-color="#fff6e2" stop-opacity="0"/>
      </linearGradient>

      <radialGradient id="vig-${uid}" cx="0.5" cy="0.44" r="0.78">
        <stop offset="0.52" stop-color="#000" stop-opacity="0"/>
        <stop offset="1" stop-color="#000" stop-opacity="${p.vignette}"/>
      </radialGradient>

      <filter id="blur-${uid}" x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur stdDeviation="14"/>
      </filter>
      <filter id="soft-${uid}" x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur stdDeviation="6"/>
      </filter>${
        p.detail === "full"
          ? `
      <filter id="grain-${uid}" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/>
        <feColorMatrix type="saturate" values="0"/>
      </filter>`
          : ""
      }
    </defs>`;
}

/**
 * One-point perspective shell with lit planes and corner occlusion.
 * `back` is the back-wall rect; floor, ceiling and side walls follow from it.
 */
function shell(uid, back, p) {
  const { x0, x1, y0, y1 } = back;
  return `
    <polygon points="0,0 1600,0 ${x1},${y0} ${x0},${y0}" fill="url(#ceil-${uid})"/>
    <polygon points="${x0},${y1} ${x1},${y1} 1600,1000 0,1000" fill="url(#fl-${uid})"/>
    <polygon points="0,0 ${x0},${y0} ${x0},${y1} 0,1000" fill="url(#swl-${uid})"/>
    <polygon points="1600,0 ${x1},${y0} ${x1},${y1} 1600,1000" fill="url(#swr-${uid})"/>
    <rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" fill="url(#bw-${uid})"/>

    <!-- occlusion: ceiling junction, floor junction, both vertical corners -->
    <rect x="${x0}" y="${y0}" width="${x1 - x0}" height="70" fill="url(#aoDown-${uid})"/>
    <rect x="${x0}" y="${y1 - 90}" width="${x1 - x0}" height="90" fill="url(#aoUp-${uid})"/>
    <rect x="${x0}" y="${y0}" width="54" height="${y1 - y0}" fill="url(#aoSide-${uid})"/>
    <g transform="translate(${x1},0) scale(-1,1)">
      <rect x="0" y="${y0}" width="54" height="${y1 - y0}" fill="url(#aoSide-${uid})"/>
    </g>

    <!-- floor picks up the shadow cast by the back wall -->
    <rect x="${x0}" y="${y1}" width="${x1 - x0}" height="46" fill="url(#aoDown-${uid})" opacity="0.75"/>

    <rect x="${x0}" y="${y1 - 16}" width="${x1 - x0}" height="16" fill="${p.trim}"/>
    <rect x="${x0}" y="${y1 - 16}" width="${x1 - x0}" height="4" fill="#fff" opacity="0.35"/>`;
}

/** Soft blurred contact shadow beneath an object. */
const contact = (uid, cx, cy, rx, ry, o = 0.34) =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#000" opacity="${o}" filter="url(#blur-${uid})"/>`;

/** Mirror a group below its contact line — polished floors only. */
const reflect = (uid, y, inner, o = 0.14) => `
  <g transform="translate(0,${2 * y}) scale(1,-1)" opacity="${o}" filter="url(#soft-${uid})">
    ${inner}
  </g>`;

const grain = (uid, p) =>
  p.detail === "full"
    ? `<rect x="0" y="0" width="1600" height="1000" filter="url(#grain-${uid})" opacity="0.05" style="mix-blend-mode:multiply"/>`
    : "";

const vignette = (uid) =>
  `<rect x="0" y="0" width="1600" height="1000" fill="url(#vig-${uid})"/>`;

/** Window with glazing bars, plus the light it throws across the floor. */
const windowPane = (uid, x, y, w, h, pool) => `
  <rect x="${x - 10}" y="${y - 10}" width="${w + 20}" height="${h + 20}" fill="#fff" opacity="0.5"/>
  <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#glass-${uid})"/>
  <line x1="${x + w / 2}" y1="${y}" x2="${x + w / 2}" y2="${y + h}" stroke="#fff" stroke-width="7" opacity="0.8"/>
  <line x1="${x}" y1="${y + h * 0.42}" x2="${x + w}" y2="${y + h * 0.42}" stroke="#fff" stroke-width="6" opacity="0.7"/>
  <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="#fff" stroke-width="9" opacity="0.75"/>
  ${pool ? `<polygon points="${pool}" fill="url(#pool-${uid})"/>` : ""}`;

/* ------------------------------------------------------------------ *
 * Furniture — shaded, each carrying its own contact shadow
 * ------------------------------------------------------------------ */

const sofa = (uid, cx, y, p) => `
  ${contact(uid, cx, y + 142, 250, 20)}
  <rect x="${cx - 236}" y="${y - 52}" width="472" height="66" rx="16" fill="${p.uphLit}"/>
  <rect x="${cx - 236}" y="${y}" width="472" height="112" rx="14" fill="${p.uph}"/>
  <rect x="${cx - 220}" y="${y + 6}" width="140" height="52" rx="12" fill="${p.uphLit}"/>
  <rect x="${cx - 70}" y="${y + 6}" width="140" height="52" rx="12" fill="${p.uphLit}"/>
  <rect x="${cx + 80}" y="${y + 6}" width="140" height="52" rx="12" fill="${p.uphLit}"/>
  <rect x="${cx - 236}" y="${y + 96}" width="472" height="16" rx="8" fill="#000" opacity="0.12"/>
  <rect x="${cx - 210}" y="${y + 112}" width="20" height="26" fill="${p.woodDark}"/>
  <rect x="${cx + 190}" y="${y + 112}" width="20" height="26" fill="${p.woodDark}"/>`;

const bed = (uid, cx, y, p) => `
  ${contact(uid, cx, y + 156, 280, 22)}
  <rect x="${cx - 250}" y="${y - 96}" width="500" height="104" rx="12" fill="${p.woodDark}"/>
  <rect x="${cx - 238}" y="${y - 84}" width="476" height="80" rx="8" fill="${p.uphLit}"/>
  <rect x="${cx - 272}" y="${y}" width="544" height="150" rx="14" fill="${p.linen}"/>
  <rect x="${cx - 272}" y="${y}" width="544" height="34" rx="14" fill="#fff" opacity="0.45"/>
  <rect x="${cx - 244}" y="${y + 8}" width="196" height="58" rx="14" fill="#fff" opacity="0.7"/>
  <rect x="${cx + 48}" y="${y + 8}" width="196" height="58" rx="14" fill="#fff" opacity="0.7"/>
  <rect x="${cx - 272}" y="${y + 104}" width="544" height="46" fill="${p.uph}" opacity="0.55"/>`;

const desk = (uid, cx, y, p) => `
  ${contact(uid, cx, y + 140, 230, 16)}
  <rect x="${cx - 214}" y="${y}" width="428" height="14" rx="5" fill="${p.wood}"/>
  <rect x="${cx - 214}" y="${y + 14}" width="428" height="6" fill="#000" opacity="0.18"/>
  <rect x="${cx - 198}" y="${y + 20}" width="12" height="120" fill="${p.metal}"/>
  <rect x="${cx + 186}" y="${y + 20}" width="12" height="120" fill="${p.metal}"/>
  <rect x="${cx - 74}" y="${y - 78}" width="158" height="78" rx="5" fill="#26262a"/>
  <rect x="${cx - 68}" y="${y - 72}" width="146" height="62" rx="3" fill="#3b4048"/>
  <rect x="${cx - 68}" y="${y - 72}" width="146" height="62" rx="3" fill="url(#glass-${uid})" opacity="0.18"/>
  <rect x="${cx - 14}" y="${y - 6}" width="28" height="8" fill="#26262a"/>`;

const counter = (uid, cx, y, p) => `
  ${contact(uid, cx, y + 168, 300, 16)}
  <rect x="${cx - 300}" y="${y}" width="600" height="18" rx="5" fill="${p.stoneLit}"/>
  <rect x="${cx - 288}" y="${y + 18}" width="576" height="150" fill="${p.cab}"/>
  <rect x="${cx - 288}" y="${y + 18}" width="576" height="10" fill="#000" opacity="0.16"/>
  <rect x="${cx - 130}" y="${y + 40}" width="260" height="106" fill="#000" opacity="0.08"/>
  <rect x="${cx - 288}" y="${y + 88}" width="576" height="3" fill="#fff" opacity="0.3"/>`;

const receptionDesk = (uid, cx, y, p) => `
  <rect x="${cx - 262}" y="${y}" width="524" height="26" rx="7" fill="${p.stoneLit}"/>
  <rect x="${cx - 262}" y="${y + 26}" width="524" height="8" fill="#000" opacity="0.2"/>
  <rect x="${cx - 244}" y="${y + 34}" width="488" height="146" fill="${p.cab}"/>
  <rect x="${cx - 210}" y="${y + 74}" width="420" height="5" fill="#fff" opacity="0.4"/>
  <rect x="${cx - 244}" y="${y + 152}" width="488" height="28" fill="#000" opacity="0.14"/>`;

const cafeTable = (uid, cx, y, p) => `
  ${contact(uid, cx, y + 132, 110, 14)}
  <rect x="${cx - 186}" y="${y - 32}" width="64" height="80" rx="10" fill="${p.uph}"/>
  <rect x="${cx + 122}" y="${y - 32}" width="64" height="80" rx="10" fill="${p.uph}"/>
  <ellipse cx="${cx}" cy="${y}" rx="98" ry="26" fill="${p.wood}"/>
  <ellipse cx="${cx}" cy="${y - 5}" rx="98" ry="26" fill="${p.woodLit}"/>
  <rect x="${cx - 7}" y="${y}" width="14" height="112" fill="${p.metal}"/>
  <ellipse cx="${cx}" cy="${y + 116}" rx="48" ry="12" fill="${p.metal}"/>`;

const plant = (uid, x, y, s, p) => `
  ${contact(uid, x, y + 88 * s, 44 * s, 10 * s, 0.3)}
  <g transform="translate(${x},${y}) scale(${s})">
    <path d="M0,0 C-42,-72 -18,-142 4,-180 C28,-142 46,-74 6,0 Z" fill="${p.leafLit}"/>
    <path d="M0,-8 C-74,-54 -86,-118 -80,-150 C-42,-126 -12,-68 0,-8 Z" fill="${p.leaf}"/>
    <path d="M2,-8 C76,-58 90,-114 84,-146 C46,-120 14,-66 2,-8 Z" fill="${p.leaf}" opacity="0.86"/>
    <path d="M-36,0 L36,0 L26,88 L-26,88 Z" fill="${p.pot}"/>
    <path d="M-36,0 L36,0 L33,26 L-33,26 Z" fill="#000" opacity="0.12"/>
  </g>`;

const shelfUnit = (uid, x, y, p) => `
  ${contact(uid, x + 76, y + 306, 90, 12)}
  <rect x="${x}" y="${y}" width="152" height="300" fill="${p.cab}"/>
  <rect x="${x}" y="${y}" width="152" height="8" fill="#fff" opacity="0.28"/>
  <rect x="${x}" y="${y + 96}" width="152" height="7" fill="#000" opacity="0.2"/>
  <rect x="${x}" y="${y + 196}" width="152" height="7" fill="#000" opacity="0.2"/>
  <rect x="${x + 16}" y="${y + 38}" width="42" height="54" fill="#000" opacity="0.14"/>
  <rect x="${x + 78}" y="${y + 138}" width="54" height="56" fill="#000" opacity="0.14"/>
  <rect x="${x + 22}" y="${y + 232}" width="60" height="58" fill="#000" opacity="0.12"/>`;

const pendant = (uid, x, yTop, len, p) => `
  <line x1="${x}" y1="${yTop}" x2="${x}" y2="${yTop + len}" stroke="${p.metal}" stroke-width="3"/>
  <path d="M${x - 26},${yTop + len + 28} L${x + 26},${yTop + len + 28} L${x + 14},${yTop + len} L${x - 14},${yTop + len} Z" fill="${p.metal}"/>
  <ellipse cx="${x}" cy="${yTop + len + 28}" rx="26" ry="7" fill="#fff8e6" opacity="0.9"/>`;

const rail = (uid, cx, y, p) => `
  <rect x="${cx - 320}" y="${y}" width="640" height="12" rx="5" fill="${p.trim}"/>
  <rect x="${cx - 320}" y="${y + 12}" width="640" height="8" fill="#000" opacity="0.16"/>`;

/* ------------------------------------------------------------------ *
 * Palettes
 * ------------------------------------------------------------------ */

const BASE = {
  light: "left",
  detail: "thumb",
  wallLit: "#f7f3ec",
  wall: "#eae5db",
  wallShade: "#d9d3c7",
  side: "#ded8cc",
  sideDark: "#cbc4b6",
  ceiling: "#f5f2ec",
  ceilShade: "#e7e3db",
  floor: "#bfa47f",
  floorFar: "#a68c6d",
  trim: "#f8f6f1",
  uph: "#cfc6b6",
  uphLit: "#dfd7c9",
  linen: "#efeae0",
  wood: "#b99a74",
  woodLit: "#caac87",
  woodDark: "#8c7254",
  metal: "#a8acb1",
  leaf: "#6f8064",
  leafLit: "#84957b",
  pot: "#c9bea9",
  stoneLit: "#f2efe9",
  cab: "#d5cdbf",
  vignette: 0.24
};

const pal = (over) => ({ ...BASE, ...over });

/* ------------------------------------------------------------------ *
 * Scenes
 * ------------------------------------------------------------------ */

export const SCENES = [
  {
    id: "living",
    label: "Living",
    photo: "living.jpg",
    wallWidthCm: 530,
    viewSide: "right",
    // frontal back wall; scale from the 4-module sofa
    wallQuad: [
      [0.145, 0.038],
      [0.953, 0.032],
      [0.953, 0.78],
      [0.145, 0.752]
    ],
    draw(detail = "thumb") {
      const uid = "living";
      const p = pal({ detail, light: "left", floor: "#c2a781", floorFar: "#a98f6c" });
      const back = { x0: 260, x1: 1340, y0: 90, y1: 760 };
      return `${defs(uid, p)}
        ${shell(uid, back, p)}
        ${windowPane(uid, 66, 250, 150, 320, "216,570 216,250 470,1000 40,1000")}
        ${sofa(uid, 800, 660, p)}
        ${plant(uid, 1258, 866, 0.86, p)}
        ${grain(uid, p)}${vignette(uid)}`;
    }
  },
  {
    id: "dormitor",
    label: "Dormitor",
    photo: "dormitor.jpg",
    wallWidthCm: 490,
    viewSide: "left",
    // frontal; wall runs off the top of frame, so the top corners sit slightly negative
    wallQuad: [
      [0.015, -0.02],
      [0.925, -0.03],
      [0.925, 0.788],
      [0.015, 0.78]
    ],
    draw(detail = "thumb") {
      const uid = "dorm";
      const p = pal({
        detail,
        light: "right",
        wallLit: "#f4ece0",
        wall: "#ece4d7",
        wallShade: "#dbd2c3",
        floor: "#c9b493",
        floorFar: "#ad9673",
        vignette: 0.3
      });
      const back = { x0: 304, x1: 1296, y0: 100, y1: 720 };
      return `${defs(uid, p)}
        ${shell(uid, back, p)}
        ${bed(uid, 800, 660, p)}
        ${plant(uid, 1404, 900, 0.72, p)}
        ${pendant(uid, 380, 100, 150, p)}
        ${grain(uid, p)}${vignette(uid)}`;
    }
  },
  {
    id: "bucatarie",
    label: "Bucătărie",
    photo: "bucatarie.jpg",
    wallWidthCm: 360,
    viewSide: "left",
    // left wall in strong perspective; near edge at frame left
    wallQuad: [
      [0.0, 0.0],
      [0.59, 0.2],
      [0.59, 0.692],
      [0.0, 0.988]
    ],
    draw(detail = "thumb") {
      const uid = "kitchen";
      const p = pal({
        detail,
        light: "right",
        wallLit: "#f4f5f4",
        wall: "#e6e8e7",
        wallShade: "#d4d7d6",
        side: "#dcdedd",
        sideDark: "#c6cac9",
        floor: "#cdcac4",
        floorFar: "#b3b0aa",
        cab: "#d3cec4",
        stoneLit: "#f6f5f1",
        vignette: 0.2
      });
      const back = { x0: 752, x1: 1520, y0: 150, y1: 720 };
      return `${defs(uid, p)}
        ${shell(uid, back, p)}
        ${rail(uid, 1140, 330, p)}
        ${counter(uid, 1140, 560, p)}
        ${pendant(uid, 980, 150, 130, p)}
        ${pendant(uid, 1300, 150, 130, p)}
        ${grain(uid, p)}${vignette(uid)}`;
    }
  },
  {
    id: "birou",
    label: "Birou",
    photo: "birou.jpg",
    wallWidthCm: 360,
    viewSide: "left",
    // left wall in perspective; corner at x=0.618
    wallQuad: [
      [0.0, 0.0],
      [0.618, 0.128],
      [0.618, 0.684],
      [0.0, 0.972]
    ],
    draw(detail = "thumb") {
      const uid = "office";
      const p = pal({
        detail,
        light: "right",
        wallLit: "#f4f5f7",
        wall: "#e7e9ec",
        wallShade: "#d4d7dc",
        side: "#dcdee2",
        sideDark: "#c5c8ce",
        floor: "#c7c5c1",
        floorFar: "#adaba7",
        cab: "#d2d0cb",
        vignette: 0.2
      });
      const back = { x0: 800, x1: 1540, y0: 160, y1: 710 };
      return `${defs(uid, p)}
        ${shell(uid, back, p)}
        ${shelfUnit(uid, 1370, 400, p)}
        ${desk(uid, 1120, 570, p)}
        ${grain(uid, p)}${vignette(uid)}`;
    }
  },
  {
    id: "receptie",
    label: "Recepție",
    photo: "receptie.jpg",
    wallWidthCm: 600,
    viewSide: "right",
    // wide frontal lobby wall between the stone piers; scale from the counter
    wallQuad: [
      [0.15, 0.06],
      [0.945, 0.06],
      [0.945, 0.86],
      [0.15, 0.86]
    ],
    draw(detail = "thumb") {
      const uid = "reception";
      const p = pal({
        detail,
        light: "left",
        wallLit: "#f8f7f4",
        wall: "#eeece8",
        wallShade: "#dedbd5",
        side: "#e4e1dc",
        sideDark: "#cfccc6",
        floor: "#d5d2cc",
        floorFar: "#bfbcb6",
        cab: "#33343a",
        stoneLit: "#f7f6f2",
        vignette: 0.18
      });
      const back = { x0: 144, x1: 1456, y0: 60, y1: 740 };
      const deskBody = receptionDesk(uid, 800, 620, p);
      return `${defs(uid, p)}
        ${shell(uid, back, p)}
        ${reflect(uid, 806, deskBody, 0.16)}
        ${contact(uid, 800, 806, 275, 16)}
        ${deskBody}
        ${plant(uid, 236, 880, 0.82, p)}
        ${plant(uid, 1394, 900, 0.74, p)}
        ${grain(uid, p)}${vignette(uid)}`;
    }
  },
  {
    id: "restaurant",
    label: "Restaurant / cafenea",
    photo: "restaurant.jpg",
    wallWidthCm: 370,
    viewSide: "right",
    // right-hand plaster wall, mild perspective, near edge at frame right
    wallQuad: [
      [0.31, 0.048],
      [1.0, 0.0],
      [1.0, 0.972],
      [0.31, 0.872]
    ],
    draw(detail = "thumb") {
      const uid = "resto";
      const p = pal({
        detail,
        light: "left",
        wallLit: "#efe6d6",
        wall: "#e2d8c7",
        wallShade: "#cdc2ae",
        side: "#d8ccb8",
        sideDark: "#bfb29c",
        floor: "#9d8463",
        floorFar: "#826b4f",
        uph: "#8f7f68",
        uphLit: "#a08f76",
        wood: "#7d6444",
        woodLit: "#8f7351",
        vignette: 0.34
      });
      const back = { x0: 80, x1: 848, y0: 150, y1: 720 };
      return `${defs(uid, p)}
        ${shell(uid, back, p)}
        ${cafeTable(uid, 430, 600, p)}
        ${pendant(uid, 430, 150, 190, p)}
        ${plant(uid, 128, 900, 0.66, p)}
        ${grain(uid, p)}${vignette(uid)}`;
    }
  },
  {
    id: "hotel",
    label: "Hotel",
    photo: "hotel.jpg",
    wallWidthCm: 460,
    viewSide: "left",
    // frontal; right edge taken at the curtain, scale from the headboard
    wallQuad: [
      [0.098, 0.094],
      [0.85, 0.098],
      [0.85, 0.788],
      [0.098, 0.768]
    ],
    draw(detail = "thumb") {
      const uid = "hotel";
      const p = pal({
        detail,
        light: "right",
        wallLit: "#f2ece1",
        wall: "#e7dfd2",
        wallShade: "#d3cabb",
        side: "#dcd3c4",
        sideDark: "#c4baa9",
        floor: "#ab9271",
        floorFar: "#8f7757",
        uph: "#b8a58e",
        uphLit: "#c9b99f",
        vignette: 0.3
      });
      const back = { x0: 272, x1: 1328, y0: 80, y1: 730 };
      return `${defs(uid, p)}
        ${shell(uid, back, p)}
        ${windowPane(uid, 1408, 250, 130, 310, "1408,560 1408,250 1180,1000 1580,1000")}
        ${bed(uid, 800, 668, p)}
        ${pendant(uid, 452, 80, 140, p)}
        ${grain(uid, p)}${vignette(uid)}`;
    }
  },
  {
    id: "comercial",
    label: "Spațiu comercial",
    photo: "comercial.jpg",
    wallWidthCm: 490,
    viewSide: "left",
    // long left retail wall in strong perspective
    wallQuad: [
      [0.0, 0.0],
      [0.593, 0.26],
      [0.593, 0.632],
      [0.0, 0.924]
    ],
    draw(detail = "thumb") {
      const uid = "retail";
      const p = pal({
        detail,
        light: "right",
        wallLit: "#f9f8f6",
        wall: "#efeeeb",
        wallShade: "#dedcd8",
        side: "#e5e3df",
        sideDark: "#cfcdc9",
        floor: "#d8d6d2",
        floorFar: "#c2c0bc",
        cab: "#dedbd5",
        vignette: 0.16
      });
      const back = { x0: 832, x1: 1560, y0: 140, y1: 740 };
      const shelves = `${shelfUnit(uid, 900, 420, p)}${shelfUnit(uid, 1310, 420, p)}`;
      return `${defs(uid, p)}
        ${shell(uid, back, p)}
        ${reflect(uid, 726, shelves, 0.12)}
        ${shelves}
        ${rail(uid, 1190, 290, p)}
        ${pendant(uid, 1040, 140, 110, p)}
        ${pendant(uid, 1400, 140, 110, p)}
        ${grain(uid, p)}${vignette(uid)}`;
    }
  }
];

export const getScene = (id) => SCENES.find((s) => s.id === id) || SCENES[0];

/**
 * The default surface for a user-supplied photo. We cannot detect the wall
 * without AI, so we start with a generous centred rectangle and let the user
 * drag the four corners. `ai-hooks.js` documents how a detector replaces this.
 */
export const DEFAULT_USER_QUAD = [
  [0.2, 0.16],
  [0.8, 0.16],
  [0.8, 0.74],
  [0.2, 0.74]
];

export const DEFAULT_USER_WALL_CM = 300;

/**
 * Render a scene background as either a photo or the drawn interior.
 * `detail` is "full" in the editor (adds film grain) and "thumb" in the
 * selector, where eight of these render at once and feTurbulence would cost
 * far more than it returns at 210px wide.
 */
/**
 * Remembers which scenes actually have a photograph on disk, so the probe
 * below costs at most one conditional request per scene per session rather
 * than one per click. Once real photos exist it costs nothing at all.
 */
const photoPresence = new Map();

/**
 * Render a scene background as either a photo or the drawn interior.
 *
 * `detail` is "full" in the editor (adds film grain) and "thumb" in the
 * selector, where eight of these render at once and feTurbulence would cost
 * far more than it returns at 210px wide.
 */
export function renderSceneBackground(scene, host, basePath = "", detail = "full") {
  host.innerHTML = "";

  const drawn = () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 1600 1000");
    svg.setAttribute("preserveAspectRatio", "xMidYMid slice");
    svg.setAttribute("class", "studio-scene-svg");
    svg.setAttribute("aria-hidden", "true");
    svg.innerHTML = scene.draw(detail);
    host.appendChild(svg);
  };

  /**
   * Photographs win whenever one exists. `photo` may be set explicitly, but if
   * it is not we still try scenes/<id>.jpg once and fall back to the drawing
   * when the file is missing — so dropping eight files into scenes/ is enough
   * to see them, with no flag to flip and no code to touch. Only wallQuad and
   * wallWidthCm still want calibrating, and /studio/?calibrate=1 does that.
   */
  const candidate = scene.photo || `${scene.id}.jpg`;

  if (photoPresence.get(candidate) === false) {
    drawn();
    return;
  }

  const img = document.createElement("img");
  img.className = "studio-scene-photo";
  img.alt = "";
  img.decoding = "async";
  img.addEventListener("load", () => photoPresence.set(candidate, true));
  img.addEventListener("error", () => {
    photoPresence.set(candidate, false);
    if (!host.isConnected) return;
    img.remove();
    if (!host.querySelector(".studio-scene-svg")) drawn();
  });
  img.src = `${basePath}scenes/${candidate}`;
  host.appendChild(img);
}
