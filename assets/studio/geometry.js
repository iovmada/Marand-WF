/**
 * Marand Studio — geometry
 *
 * The whole editor is built on one idea: every surface a print can land on
 * (a wall in a Marand scene, a wall in the user's own photo) is described as
 * a QUAD — four corners in stage coordinates. Artwork is positioned in flat
 * "wall space" and projected onto that quad with a homography, so a print
 * genuinely sits in the plane of the wall instead of being pasted flat on top.
 *
 * The same quad is the seam for future AI work: wall detection only has to
 * output four corners and the editor needs no changes at all.
 */

/**
 * Solve an 8x8 linear system with Gauss-Jordan + partial pivoting.
 * Returns null for singular input (degenerate quad) so callers can fall back.
 */
function solve(matrix, rhs) {
  const n = rhs.length;
  const m = matrix.map((row, i) => [...row, rhs[i]]);

  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(m[row][col]) > Math.abs(m[pivot][col])) pivot = row;
    }
    if (Math.abs(m[pivot][col]) < 1e-10) return null;
    if (pivot !== col) {
      const tmp = m[pivot];
      m[pivot] = m[col];
      m[col] = tmp;
    }

    const div = m[col][col];
    for (let k = col; k <= n; k++) m[col][k] /= div;

    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = m[row][col];
      if (factor === 0) continue;
      for (let k = col; k <= n; k++) m[row][k] -= factor * m[col][k];
    }
  }

  return m.map((row) => row[n]);
}

/**
 * Homography mapping four source points to four destination points.
 * Points are [x, y] pairs, ordered top-left, top-right, bottom-right, bottom-left.
 *
 * Returns a 3x3 matrix as a flat array of 9 numbers (row major), or null.
 */
export function computeHomography(src, dst) {
  const a = [];
  const b = [];

  for (let i = 0; i < 4; i++) {
    const [x, y] = src[i];
    const [u, v] = dst[i];
    a.push([x, y, 1, 0, 0, 0, -x * u, -y * u]);
    b.push(u);
    a.push([0, 0, 0, x, y, 1, -x * v, -y * v]);
    b.push(v);
  }

  const h = solve(a, b);
  if (!h) return null;
  return [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1];
}

/**
 * Serialise a homography as a CSS matrix3d(). CSS matrix3d is COLUMN major and
 * operates on (x, y, z, 1), so the perspective row of the homography lands in
 * the w components (indices 3 and 7) rather than in a trailing row.
 *
 * Apply to an element with `transform-origin: 0 0` whose box is exactly the
 * source rectangle passed to computeHomography().
 */
export function toMatrix3d(h) {
  if (!h) return "none";
  const [h11, h12, h13, h21, h22, h23, h31, h32] = h;
  const v = [
    h11, h21, 0, h31,
    h12, h22, 0, h32,
    0, 0, 1, 0,
    h13, h23, 0, 1
  ];
  return `matrix3d(${v.map((n) => (Math.abs(n) < 1e-6 ? 0 : n)).join(",")})`;
}

/** Invert a 3x3 matrix (flat, row major). Returns null if singular. */
export function invert3(h) {
  const [a, b, c, d, e, f, g, i, j] = h;
  const A = e * j - f * i;
  const B = -(d * j - f * g);
  const C = d * i - e * g;
  const det = a * A + b * B + c * C;
  if (Math.abs(det) < 1e-12) return null;

  return [
    A / det,
    -(b * j - c * i) / det,
    (b * f - c * e) / det,
    B / det,
    (a * j - c * g) / det,
    -(a * f - c * d) / det,
    C / det,
    -(a * i - b * g) / det,
    (a * e - b * d) / det
  ];
}

/** Apply a 3x3 homography to a point, returning [x, y] after dehomogenising. */
export function project(h, x, y) {
  const w = h[6] * x + h[7] * y + h[8];
  if (Math.abs(w) < 1e-9) return [0, 0];
  return [(h[0] * x + h[1] * y + h[2]) / w, (h[3] * x + h[4] * y + h[5]) / w];
}

/** Convenience: build the forward/inverse pair for a wall plane. */
export function planeTransform(wallWidth, wallHeight, quad) {
  const src = [
    [0, 0],
    [wallWidth, 0],
    [wallWidth, wallHeight],
    [0, wallHeight]
  ];
  const forward = computeHomography(src, quad);
  return {
    forward,
    inverse: forward ? invert3(forward) : null,
    css: toMatrix3d(forward)
  };
}

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/** Largest rect of a given aspect ratio that fits inside w x h. */
export function fitRatio(ratio, w, h) {
  if (w / h > ratio) return { width: h * ratio, height: h };
  return { width: w, height: w / ratio };
}
