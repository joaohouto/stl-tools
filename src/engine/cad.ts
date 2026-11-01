import * as THREE from 'three';
import earcut from 'earcut';
import {
  Clipper,
  ClipperOffset,
  EndType,
  FillRule,
  JoinType,
  Path64,
  Paths64,
  Point64,
} from 'clipper2-js';
import opentype from 'opentype.js';
import QRCode from 'qrcode';
import { loadFont } from './fontManager';

// ============================================================================
// UPSTREAM CLIPPER2-JS BUG FIXES
// 1. In clipper2-js@1.2.4, `ClipperOffset.prototype.offsetPolygon` translated C#'s
//    `ref int k` parameter by value (`const prev = cnt - 1`) without advancing
//    `prev = i` after `this.offsetPoint(group, path, i, prev)`.
// 2. `Clipper.stripDuplicates` translated C# `Point64` struct inequality `lastPt != path[i]`
//    into JS object reference inequality `lastPt !== path[i]`, failing to remove
//    duplicate consecutive vertices (`dx = 0, dy = 0`), which caused `getUnitNormal`
//    to emit zero vectors `(0, 0)` and carve inward slits/cracks ("rachaduras") during offset!
// ============================================================================
(ClipperOffset.prototype as unknown as Record<string, unknown>).offsetPolygon = function (
  this: {
    _groupDelta: number;
    offsetPoint: (group: unknown, path: Path64, i: number, prev: number) => void;
  },
  group: { outPath: Path64; outPaths: Paths64 },
  path: Path64
) {
  const area = Clipper.area(path);
  if (area < 0 !== this._groupDelta < 0) {
    const rect = Clipper.getBounds(path);
    const offsetMinDim = Math.abs(this._groupDelta) * 2;
    if (offsetMinDim > rect.width || offsetMinDim > rect.height) return;
  }
  group.outPath = new Path64();
  const cnt = path.length;
  let prev = cnt - 1;
  for (let i = 0; i < cnt; i++) {
    this.offsetPoint(group, path, i, prev);
    prev = i;
  }
  group.outPaths.push(group.outPath);
};

(Clipper as unknown as Record<string, unknown>).stripDuplicates = function (
  path: Path64,
  isClosedPath: boolean
): Path64 {
  const cnt = path.length;
  const result = new Path64();
  if (cnt === 0) return result;
  let lastPt = path[0];
  result.push(lastPt);
  for (let i = 1; i < cnt; i++) {
    const pt = path[i];
    if (lastPt.x !== pt.x || lastPt.y !== pt.y) {
      lastPt = pt;
      result.push(lastPt);
    }
  }
  while (
    isClosedPath &&
    result.length > 1 &&
    result[result.length - 1].x === result[0].x &&
    result[result.length - 1].y === result[0].y
  ) {
    result.pop();
  }
  return result;
};

export type Point2D = [number, number];
export type PolygonRing = Point2D[];
export type Polygons2D = PolygonRing[];

const CLIPPER_SCALE = 1000; // 0.001mm precision

/**
 * Sanitizes a 2D polygon ring by stripping consecutive near-duplicate vertices
 * and 180-degree hairline spike reversals that would produce zero normals or non-manifold edges.
 */
function cleanRing64(raw: Path64, minDistUnits = 4): Path64 {
  if (raw.length < 3) return new Path64();

  // Pass 1: Remove consecutive duplicates / sub-4-micron micro-steps
  const deduped = new Path64();
  for (let i = 0; i < raw.length; i++) {
    const pt = raw[i];
    if (deduped.length === 0) {
      deduped.push(pt);
    } else {
      const prev = deduped[deduped.length - 1];
      if (Math.abs(pt.x - prev.x) >= minDistUnits || Math.abs(pt.y - prev.y) >= minDistUnits) {
        deduped.push(pt);
      }
    }
  }
  while (
    deduped.length > 1 &&
    Math.abs(deduped[deduped.length - 1].x - deduped[0].x) < minDistUnits &&
    Math.abs(deduped[deduped.length - 1].y - deduped[0].y) < minDistUnits
  ) {
    deduped.pop();
  }
  if (deduped.length < 3) return new Path64();

  // Pass 2: Strip 180-degree collinear backtrack spikes (A -> B -> A)
  const cleaned = new Path64();
  const n = deduped.length;
  for (let i = 0; i < n; i++) {
    const prev = deduped[(i - 1 + n) % n];
    const curr = deduped[i];
    const next = deduped[(i + 1) % n];
    const dx1 = curr.x - prev.x;
    const dy1 = curr.y - prev.y;
    const dx2 = next.x - curr.x;
    const dy2 = next.y - curr.y;
    const l1 = Math.hypot(dx1, dy1);
    const l2 = Math.hypot(dx2, dy2);
    if (l1 < 1 || l2 < 1) continue;
    const dot = (dx1 * dx2 + dy1 * dy2) / (l1 * l2);
    // If edge reverses direction almost 180 degrees (< ~3.6 deg needle), drop the spike tip
    if (dot < -0.998) continue;
    cleaned.push(curr);
  }

  return cleaned.length >= 3 ? cleaned : new Path64();
}

function toPaths64(polys: Polygons2D): Paths64 {
  const paths = new Paths64();
  for (const ring of polys) {
    if (ring.length < 3) continue;
    const raw = new Path64();
    for (const [x, y] of ring) {
      raw.push(new Point64(Math.round(x * CLIPPER_SCALE), Math.round(y * CLIPPER_SCALE)));
    }
    const p = cleanRing64(raw, 4);
    if (p.length >= 3) {
      paths.push(p);
    }
  }
  return paths;
}

function fromPaths64(paths: Paths64): Polygons2D {
  const result: Polygons2D = [];
  for (const raw of paths) {
    const p = cleanRing64(raw, 3);
    if (p.length < 3) continue;
    const ring: PolygonRing = [];
    for (const pt of p) {
      ring.push([Number(pt.x) / CLIPPER_SCALE, Number(pt.y) / CLIPPER_SCALE]);
    }
    if (Math.abs(signedArea2D(ring)) >= 1e-4) {
      result.push(ring);
    }
  }
  return result;
}

/**
 * Signed area of a 2D ring (> 0 for counter-clockwise outer ring, < 0 for clockwise hole)
 */
export function signedArea2D(ring: PolygonRing): number {
  let area = 0;
  for (let i = 0, n = ring.length; i < n; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[(i + 1) % n];
    area += x1 * y2 - x2 * y1;
  }
  return area * 0.5;
}

export function pointInRing(pt: Point2D, ring: PolygonRing): boolean {
  const [x, y] = pt;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Clean & union self-intersecting or overlapping rings using Clipper2 NonZero/EvenOdd rule
 */
export function normalizePolygons(polys: Polygons2D, fillRule: FillRule = FillRule.NonZero): Polygons2D {
  if (polys.length === 0) return [];
  const subj = toPaths64(polys);
  const solved = Clipper.Union(subj, new Paths64(), fillRule);
  return fromPaths64(solved);
}

/**
 * Smooth, mathematically exact 2D Polygon Offset Engine using ClipperOffset (with patched offsetPolygon)
 */
export function offsetPolygons(
  polys: Polygons2D,
  deltaMm: number,
  join: 'round' | 'miter' | 'square' = 'round'
): Polygons2D {
  if (polys.length === 0) return [];
  const normalized = normalizePolygons(polys, FillRule.NonZero);
  if (Math.abs(deltaMm) < 1e-4) return normalized;

  const subj = toPaths64(normalized);
  const jt =
    join === 'round'
      ? JoinType.Round
      : join === 'miter'
      ? JoinType.Miter
      : JoinType.Square;

  // ArcTolerance = 8.0 on scale 1000 => 0.008mm chord accuracy (ultra smooth, zero jaggedness)
  const co = new ClipperOffset(2.0, 8.0);
  co.addPaths(subj, jt, EndType.Polygon);
  const sol = new Paths64();
  co.execute(Math.round(deltaMm * CLIPPER_SCALE), sol);
  return fromPaths64(sol);
}

export function unionPolygons(...polyList: Polygons2D[]): Polygons2D {
  const combined: Polygons2D = [];
  for (const p of polyList) {
    combined.push(...p);
  }
  if (combined.length === 0) return [];
  return normalizePolygons(combined, FillRule.NonZero);
}

export function subtractPolygons(subjPolys: Polygons2D, clipPolys: Polygons2D): Polygons2D {
  if (subjPolys.length === 0) return [];
  if (clipPolys.length === 0) return subjPolys;
  const subj = toPaths64(subjPolys);
  const clip = toPaths64(clipPolys);
  const diff = Clipper.Difference(subj, clip, FillRule.NonZero);
  return fromPaths64(diff);
}

export function intersectPolygons(subjPolys: Polygons2D, clipPolys: Polygons2D): Polygons2D {
  if (subjPolys.length === 0 || clipPolys.length === 0) return [];
  const subj = toPaths64(subjPolys);
  const clip = toPaths64(clipPolys);
  const inter = Clipper.Intersect(subj, clip, FillRule.NonZero);
  return fromPaths64(inter);
}

export function translatePolygons(polys: Polygons2D, dx: number, dy: number): Polygons2D {
  return polys.map((ring) => ring.map(([x, y]) => [x + dx, y + dy]));
}

export function scalePolygons(polys: Polygons2D, sx: number, sy: number = sx): Polygons2D {
  return polys.map((ring) => ring.map(([x, y]) => [x * sx, y * sy]));
}

export function rotatePolygons(polys: Polygons2D, angleDeg: number): Polygons2D {
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return polys.map((ring) =>
    ring.map(([x, y]) => [x * cos - y * sin, x * sin + y * cos])
  );
}

export function getBounds2D(polys: Polygons2D): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
} {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const ring of polys) {
    for (const [x, y] of ring) {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }

  if (!isFinite(minX)) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0, centerX: 0, centerY: 0 };
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
    centerX: (minX + maxX) * 0.5,
    centerY: (minY + maxY) * 0.5,
  };
}

export function centerPolygons(polys: Polygons2D, targetX = 0, targetY = 0): Polygons2D {
  const b = getBounds2D(polys);
  return translatePolygons(polys, targetX - b.centerX, targetY - b.centerY);
}

export function fitPolygonsToSize(polys: Polygons2D, maxSizeMm: number): Polygons2D {
  const b = getBounds2D(polys);
  const maxDim = Math.max(b.width, b.height);
  if (maxDim < 1e-5) return polys;
  const s = maxSizeMm / maxDim;
  const centered = centerPolygons(polys, 0, 0);
  return scalePolygons(centered, s, s);
}

export function perimeter2D(polys: Polygons2D): number {
  let total = 0;
  for (const ring of polys) {
    for (let i = 0; i < ring.length; i++) {
      const [x1, y1] = ring[i];
      const [x2, y2] = ring[(i + 1) % ring.length];
      total += Math.hypot(x2 - x1, y2 - y1);
    }
  }
  return total;
}

export function area2D(polys: Polygons2D): number {
  let total = 0;
  for (const ring of polys) {
    total += signedArea2D(ring);
  }
  return Math.abs(total);
}

// ============================================================================
// 2D PRIMITIVES & SHAPES GALLERY (CLEAN GEOMETRIC CONTOURS)
// ============================================================================

export function circlePolygon(radius: number, cx = 0, cy = 0, segments = 64): Polygons2D {
  const ring: PolygonRing = [];
  for (let i = 0; i < segments; i++) {
    const theta = (i / segments) * Math.PI * 2;
    ring.push([cx + Math.cos(theta) * radius, cy + Math.sin(theta) * radius]);
  }
  return [ring];
}

export function rectPolygon(width: number, height: number, cx = 0, cy = 0): Polygons2D {
  const hw = width * 0.5;
  const hh = height * 0.5;
  return [
    [
      [cx - hw, cy - hh],
      [cx + hw, cy - hh],
      [cx + hw, cy + hh],
      [cx - hw, cy + hh],
    ],
  ];
}

export function roundedRectPolygon(
  width: number,
  height: number,
  radius: number,
  cx = 0,
  cy = 0,
  cornerSegments = 16
): Polygons2D {
  const r = Math.max(0, Math.min(radius, width * 0.5 - 0.01, height * 0.5 - 0.01));
  if (r < 0.05) return rectPolygon(width, height, cx, cy);

  const hw = width * 0.5 - r;
  const hh = height * 0.5 - r;
  const corners = [
    { x: cx + hw, y: cy + hh, start: 0 },
    { x: cx - hw, y: cy + hh, start: Math.PI * 0.5 },
    { x: cx - hw, y: cy - hh, start: Math.PI },
    { x: cx + hw, y: cy - hh, start: Math.PI * 1.5 },
  ];

  const ring: PolygonRing = [];
  for (const c of corners) {
    for (let i = 0; i <= cornerSegments; i++) {
      const a = c.start + (i / cornerSegments) * (Math.PI * 0.5);
      ring.push([c.x + Math.cos(a) * r, c.y + Math.sin(a) * r]);
    }
  }
  return [ring];
}

/**
 * Generates any regular or custom polygon with smoothly filleted (rounded) corners
 */
export function roundedPolygonFromVertices(
  vertices: Point2D[],
  cornerRadius: number
): Polygons2D {
  if (cornerRadius <= 0.05) return normalizePolygons([vertices]);
  const shrunk = offsetPolygons([vertices], -cornerRadius, 'miter');
  if (shrunk.length === 0) return normalizePolygons([vertices]);
  return offsetPolygons(shrunk, cornerRadius, 'round');
}

/**
 * Helper to find outer boundary intersections along a horizontal line Y = y0
 */
function intersectHorizontalLine(polys: Polygons2D, y0: number): number[] {
  const xs: number[] = [];
  for (const ring of polys) {
    if (signedArea2D(ring) <= 0) continue;
    const n = ring.length;
    for (let i = 0; i < n; i++) {
      const [x1, y1] = ring[i];
      const [x2, y2] = ring[(i + 1) % n];
      if ((y1 <= y0 && y2 > y0) || (y2 <= y0 && y1 > y0)) {
        const t = (y0 - y1) / (y2 - y1);
        xs.push(x1 + t * (x2 - x1));
      }
    }
  }
  return xs.sort((a, b) => a - b);
}

/**
 * Helper to find outer boundary intersections along a vertical line X = x0
 */
function intersectVerticalLine(polys: Polygons2D, x0: number): number[] {
  const ys: number[] = [];
  for (const ring of polys) {
    if (signedArea2D(ring) <= 0) continue;
    const n = ring.length;
    for (let i = 0; i < n; i++) {
      const [x1, y1] = ring[i];
      const [x2, y2] = ring[(i + 1) % n];
      if ((x1 <= x0 && x2 > x0) || (x2 <= x0 && x1 > x0)) {
        const t = (x0 - x1) / (x2 - x1);
        ys.push(y1 + t * (y2 - y1));
      }
    }
  }
  return ys.sort((a, b) => a - b);
}

/**
 * Builds a 100% smooth capsule/stadium polygon between (x1, y1, r1) and (x2, y2, r2)
 * with zero sharp rectangular corners.
 */
function capsulePolygon(
  x1: number,
  y1: number,
  r1: number,
  x2: number,
  y2: number,
  r2: number
): Polygons2D {
  const c1 = circlePolygon(r1, x1, y1, 40);
  const c2 = circlePolygon(r2, x2, y2, 48);
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len < 1e-3) return unionPolygons(c1, c2);
  const nx = -dy / len;
  const ny = dx / len;
  const quad: Polygons2D = [
    [
      [x1 + nx * r1, y1 + ny * r1],
      [x1 - nx * r1, y1 - ny * r1],
      [x2 - nx * r2, y2 - ny * r2],
      [x2 + nx * r2, y2 + ny * r2],
    ],
  ];
  return unionPolygons(c1, c2, quad);
}

/**
 * Attaches a reinforced pendant/keyring loop that automatically detects the local boundary
 * of any shape (bone central shaft, heart cleft, cursive or serif letters, etc.) via raycast
 * and bridges into the solid interior with a smooth capsule so no rectangular corners ever stick out.
 */
export function attachKeyringTab(
  basePolys: Polygons2D,
  position:
    | 'top'
    | 'left'
    | 'right'
    | 'bottom'
    | 'topo'
    | 'esquerda'
    | 'direita'
    | 'canto_sup_esq'
    | 'canto_sup_dir'
    | 'canto_inf_esq'
    | 'canto_inf_dir'
    | 'sem_argola',
  holeDiameterMm: number,
  wallThicknessMm = 2.6
): Polygons2D {
  if (basePolys.length === 0 || position === 'sem_argola') return basePolys;
  const innerR = Math.max(1.0, holeDiameterMm * 0.5);
  const outerR = innerR + Math.max(1.8, wallThicknessMm);
  const bounds = getBounds2D(basePolys);
  const pos = String(position).toLowerCase();

  let ax = bounds.minX;
  let ay = bounds.centerY;
  let ux = -1;
  let uy = 0;
  let protrudeFactor = 0.55;

  if (pos === 'topo' || pos === 'top' || pos === 'bottom') {
    ux = 0;
    uy = pos === 'bottom' ? -1 : 1;
    // Raycast vertically at X = centerX (or nearest X within ±15% width that intersects the body)
    let bestX = bounds.centerX;
    let bestY: number | null = null;
    const searchOffsets = [0, -1, 1, -2, 2, -3.5, 3.5, -5, 5, -7, 7];
    for (const off of searchOffsets) {
      const testX = bounds.centerX + off;
      const hits = intersectVerticalLine(basePolys, testX);
      if (hits.length >= 2) {
        bestX = testX;
        bestY = uy > 0 ? hits[hits.length - 1] : hits[0];
        break;
      }
    }
    if (bestY !== null) {
      ax = bestX;
      ay = bestY;
      // If shape has higher side lobes (like bone or heart), raise the top pendant tab slightly so it clears the saddle cleanly
      protrudeFactor = 0.68;
    } else {
      ax = bounds.centerX;
      ay = uy > 0 ? bounds.maxY : bounds.minY;
      protrudeFactor = 0.58;
    }
  } else if (pos === 'esquerda' || pos === 'left') {
    ux = -1;
    uy = 0;
    // Measure vertical span of the leftmost feature (within 10mm or 20% width of minX)
    const sliceW = Math.min(11, Math.max(4, bounds.width * 0.18));
    let localMinY = Infinity;
    let localMaxY = -Infinity;
    for (const ring of basePolys) {
      if (signedArea2D(ring) <= 0) continue;
      for (const [x, y] of ring) {
        if (x <= bounds.minX + sliceW) {
          if (y < localMinY) localMinY = y;
          if (y > localMaxY) localMaxY = y;
        }
      }
    }
    const targetY = isFinite(localMinY) ? (localMinY + localMaxY) * 0.5 : bounds.centerY;
    const spanY = isFinite(localMinY) ? (localMaxY - localMinY) * 0.22 : 3.0;
    // Sample horizontal rays around targetY and pick the one that hits near the left boundary cleanly
    let bestHitX = Infinity;
    let bestHitY = targetY;
    for (let s = -4; s <= 4; s++) {
      const yTest = targetY + (s / 4) * Math.min(3.5, spanY);
      const hits = intersectHorizontalLine(basePolys, yTest);
      if (hits.length >= 2) {
        // Ensure solid interior thickness at this Y is at least 2.5mm
        const thickness = hits[1] - hits[0];
        if (thickness >= 2.0 && hits[0] < bestHitX) {
          bestHitX = hits[0];
          bestHitY = yTest;
        }
      }
    }
    if (isFinite(bestHitX)) {
      ax = bestHitX;
      ay = bestHitY;
    } else {
      ax = bounds.minX;
      ay = targetY;
    }
    protrudeFactor = 0.54;
  } else if (pos === 'direita' || pos === 'right') {
    ux = 1;
    uy = 0;
    const sliceW = Math.min(11, Math.max(4, bounds.width * 0.18));
    let localMinY = Infinity;
    let localMaxY = -Infinity;
    for (const ring of basePolys) {
      if (signedArea2D(ring) <= 0) continue;
      for (const [x, y] of ring) {
        if (x >= bounds.maxX - sliceW) {
          if (y < localMinY) localMinY = y;
          if (y > localMaxY) localMaxY = y;
        }
      }
    }
    const targetY = isFinite(localMinY) ? (localMinY + localMaxY) * 0.5 : bounds.centerY;
    const spanY = isFinite(localMinY) ? (localMaxY - localMinY) * 0.22 : 3.0;
    let bestHitX = -Infinity;
    let bestHitY = targetY;
    for (let s = -4; s <= 4; s++) {
      const yTest = targetY + (s / 4) * Math.min(3.5, spanY);
      const hits = intersectHorizontalLine(basePolys, yTest);
      if (hits.length >= 2) {
        const lastIdx = hits.length - 1;
        const thickness = hits[lastIdx] - hits[lastIdx - 1];
        if (thickness >= 2.0 && hits[lastIdx] > bestHitX) {
          bestHitX = hits[lastIdx];
          bestHitY = yTest;
        }
      }
    }
    if (isFinite(bestHitX)) {
      ax = bestHitX;
      ay = bestHitY;
    } else {
      ax = bounds.maxX;
      ay = targetY;
    }
    protrudeFactor = 0.54;
  } else {
    // 4 Corner positions: canto_sup_esq, canto_sup_dir, canto_inf_esq, canto_inf_dir
    const isRight = pos.includes('dir');
    const isTop = pos.includes('sup');
    ux = isRight ? 0.70710678 : -0.70710678;
    uy = isTop ? 0.70710678 : -0.70710678;

    // Restrict search to the left or right end region of the keychain so we anchor on the outer letter/icon
    const regionW = Math.min(18, Math.max(6, bounds.width * 0.28));
    let bestScore = -Infinity;
    for (const ring of basePolys) {
      if (signedArea2D(ring) <= 0) continue;
      for (const [x, y] of ring) {
        if (isRight && x < bounds.maxX - regionW) continue;
        if (!isRight && x > bounds.minX + regionW) continue;
        const score = x * ux + y * uy;
        if (score > bestScore) {
          bestScore = score;
          ax = x;
          ay = y;
        }
      }
    }
    protrudeFactor = 0.52;
  }

  const tabX = ax + ux * outerR * protrudeFactor;
  const tabY = ay + uy * outerR * protrudeFactor;
  const inX = ax - ux * outerR * 0.65;
  const inY = ay - uy * outerR * 0.65;

  const tabSolid = capsulePolygon(inX, inY, outerR * 0.85, tabX, tabY, outerR);
  const innerHole = circlePolygon(innerR, tabX, tabY, 44);

  return subtractPolygons(unionPolygons(basePolys, tabSolid), innerHole);
}

export interface ShapePreset {
  id: string;
  label: string;
}

/**
 * Official Phosphor Icons (`viewBox="0 0 256 256"`, Fill weight) vector definitions
 * shared between the 2D Shadcn UI ShapeSelect and the 3D CAD geometry engine.
 */
export const PHOSPHOR_SHAPE_SVGS: Record<string, { label: string; viewBox: string; d: string }> = {
  coracao: {
    label: 'Coração',
    viewBox: '0 0 256 256',
    // Phosphor heart-fill with smooth lobes and gently rounded bottom tip
    d: 'M 128 69 C 115 50 95 40 72 40 C 39 40 16 65 16 98 C 16 116 24 132 37 145 L 116 222 C 123 229 133 229 140 222 L 219 145 C 232 132 240 116 240 98 C 240 65 217 40 184 40 C 161 40 141 50 128 69 Z',
  },
  estrela: {
    label: 'Estrela 5 Pontas',
    viewBox: '0 0 256 256',
    // Phosphor star-fill
    d: 'M 135 20 L 164 81 L 231 91 C 238 92 241 101 236 106 L 187 153 L 199 220 C 200 227 193 232 186 229 L 128 197 L 70 229 C 63 232 56 227 57 220 L 69 153 L 20 106 C 15 101 18 92 25 91 L 92 81 L 121 20 C 124 13 132 13 135 20 Z',
  },
  osso: {
    label: 'Osso Pet',
    viewBox: '0 0 256 256',
    // Phosphor bone-fill (horizontal orientation for pet tags & keychains)
    d: 'M 56 68 C 74 68 89 80 93 96 H 163 C 167 80 182 68 200 68 C 221 68 238 85 238 106 C 238 116 234 123 228 128 C 234 133 238 140 238 150 C 238 171 221 188 200 188 C 182 188 167 176 163 160 H 93 C 89 176 74 188 56 188 C 35 188 18 171 18 150 C 18 140 22 133 28 128 C 22 123 18 116 18 106 C 18 85 35 68 56 68 Z',
  },
  circulo: {
    label: 'Círculo / Medalha',
    viewBox: '0 0 256 256',
    // Phosphor circle-fill
    d: 'M 128 24 C 185.4 24 232 70.6 232 128 C 232 185.4 185.4 232 128 232 C 70.6 232 24 185.4 24 128 C 24 70.6 70.6 24 128 24 Z',
  },
  hexagono: {
    label: 'Hexágono',
    viewBox: '0 0 256 256',
    // Phosphor hexagon-fill
    d: 'M 220 73 L 136 25 C 131 22 125 22 120 25 L 36 73 C 31 76 28 81 28 87 V 169 C 28 175 31 180 36 183 L 120 231 C 125 234 131 234 136 231 L 220 183 C 225 180 228 175 228 169 V 87 C 228 81 225 76 220 73 Z',
  },
  escudo: {
    label: 'Escudo / Brasão',
    viewBox: '0 0 256 256',
    // Phosphor shield-fill
    d: 'M 208 40 H 48 C 39 40 32 47 32 56 V 112 C 32 180 88 218 123 231 C 126 232 130 232 133 231 C 168 218 224 180 224 112 V 56 C 224 47 217 40 208 40 Z',
  },
  patinha: {
    label: 'Patinha Pet',
    viewBox: '0 0 256 256',
    // Phosphor paw-print-fill
    d: 'M 212 88 C 225 88 236 99 236 112 C 236 125 225 136 212 136 C 199 136 188 125 188 112 C 188 99 199 88 212 88 Z M 44 88 C 57 88 68 99 68 112 C 68 125 57 136 44 136 C 31 136 20 125 20 112 C 20 99 31 88 44 88 Z M 92 44 C 105 44 116 55 116 68 C 116 81 105 92 92 92 C 79 92 68 81 68 68 C 68 55 79 44 92 44 Z M 164 44 C 177 44 188 55 188 68 C 188 81 177 92 164 92 C 151 92 140 81 140 68 C 140 55 151 44 164 44 Z M 184 164 C 192 178 188 197 174 206 C 162 214 146 208 128 208 C 110 208 94 214 82 206 C 68 197 64 178 72 164 C 84 142 102 120 128 120 C 154 120 172 142 184 164 Z',
  },
  urso: {
    label: 'Ursinho',
    viewBox: '0 0 256 256',
    // Phosphor bear silhouette
    d: 'M 64 36 C 85 36 102 51 104 71 C 112 69 120 68 128 68 C 136 68 144 69 152 71 C 154 51 171 36 192 36 C 214 36 232 54 232 76 C 232 92 222 106 208 112 C 216 125 220 140 220 156 C 220 202 179 236 128 236 C 77 236 36 202 36 156 C 36 140 40 125 48 112 C 34 106 24 92 24 76 C 24 54 42 36 64 36 Z',
  },
  gato: {
    label: 'Gatinho',
    viewBox: '0 0 256 256',
    // Phosphor cat-fill
    d: 'M 216 40 L 172 72 C 158 67 143 64 128 64 C 113 64 98 67 84 72 L 40 40 C 33 35 24 40 24 48 V 128 C 24 181 71 224 128 224 C 185 224 232 181 232 128 V 48 C 232 40 223 35 216 40 Z',
  },
  coroa: {
    label: 'Coroa Real',
    viewBox: '0 0 256 256',
    // Phosphor crown-simple-fill
    d: 'M 239 97 C 235 90 226 88 219 92 L 173 120 L 141 53 C 136 43 120 43 115 53 L 83 120 L 37 92 C 30 88 21 90 17 97 C 14 102 14 108 16 113 L 45 193 C 48 202 56 208 66 208 H 190 C 200 208 208 202 211 193 L 240 113 C 242 108 242 102 239 97 Z',
  },
  controle: {
    label: 'Controle Gamer',
    viewBox: '0 0 256 256',
    // Phosphor game-controller-fill
    d: 'M 176 56 H 80 C 47 56 20 80 14 113 L 4 166 C 0 190 18 212 42 212 C 55 212 67 205 74 194 L 98 156 H 158 L 182 194 C 189 205 201 212 214 212 C 238 212 256 190 252 166 L 242 113 C 236 80 209 56 176 56 Z',
  },
  raio: {
    label: 'Raio / Flash',
    viewBox: '0 0 256 256',
    // Phosphor lightning-fill
    d: 'M 214 116 C 212 113 209 112 205 112 H 152 L 168 32 C 169 27 166 22 161 21 C 158 20 155 21 153 23 L 41 127 C 38 130 37 135 39 139 C 41 142 44 144 48 144 H 104 L 88 224 C 87 229 90 234 95 235 C 98 236 101 235 103 233 L 215 129 C 218 126 218 120 214 116 Z',
  },
};

export const BUILTIN_SHAPES: ShapePreset[] = Object.entries(PHOSPHOR_SHAPE_SVGS).map(
  ([id, item]) => ({
    id,
    label: item.label,
  })
);

export function shapeGalleryToPolygons(shapeId: string, sizeMm: number): Polygons2D {
  const r = sizeMm * 0.5;
  if (shapeId === 'circulo') {
    return circlePolygon(r, 0, 0, 72);
  }
  if (shapeId === 'osso') {
    // High-resolution smooth dog bone matching Phosphor bone-fill proportions
    const kx = sizeMm * 0.32;
    const ky = sizeMm * 0.135;
    const kr = sizeMm * 0.165;
    const bar = roundedRectPolygon(kx * 2.1, ky * 1.9, sizeMm * 0.06);
    const c1 = circlePolygon(kr, -kx, ky, 44);
    const c2 = circlePolygon(kr, -kx, -ky, 44);
    const c3 = circlePolygon(kr, kx, ky, 44);
    const c4 = circlePolygon(kr, kx, -ky, 44);
    return fitPolygonsToSize(unionPolygons(bar, c1, c2, c3, c4), sizeMm);
  }

  const phosphorItem = PHOSPHOR_SHAPE_SVGS[shapeId];
  if (phosphorItem) {
    const rawRings = parseSvgPathData(phosphorItem.d);
    const normalized = normalizePolygons(rawRings, FillRule.NonZero);
    return fitPolygonsToSize(normalized, sizeMm);
  }

  return circlePolygon(r, 0, 0, 64);
}

// ============================================================================
// TEXT & SVG TO 2D POLYGONS
// ============================================================================

function pushPtDedup(ring: PolygonRing, x: number, y: number) {
  if (ring.length > 0) {
    const [px, py] = ring[ring.length - 1];
    if (Math.hypot(x - px, y - py) < 1e-4) return;
  }
  ring.push([x, y]);
}

function flattenOpenTypePath(path: opentype.Path, curveSteps = 12): Polygons2D {
  const rings: Polygons2D = [];
  let current: PolygonRing = [];
  let cx = 0;
  let cy = 0;
  let startX = 0;
  let startY = 0;

  for (const cmd of path.commands) {
    if (cmd.type === 'M') {
      if (current.length >= 3) rings.push(current);
      current = [[cmd.x, -cmd.y]];
      cx = cmd.x;
      cy = -cmd.y;
      startX = cx;
      startY = cy;
    } else if (cmd.type === 'L') {
      cx = cmd.x;
      cy = -cmd.y;
      pushPtDedup(current, cx, cy);
    } else if (cmd.type === 'Q') {
      const x0 = cx;
      const y0 = cy;
      const x1 = cmd.x1;
      const y1 = -cmd.y1;
      const x2 = cmd.x;
      const y2 = -cmd.y;
      for (let i = 1; i <= curveSteps; i++) {
        const t = i / curveSteps;
        const mt = 1 - t;
        const x = mt * mt * x0 + 2 * mt * t * x1 + t * t * x2;
        const y = mt * mt * y0 + 2 * mt * t * y1 + t * t * y2;
        pushPtDedup(current, x, y);
      }
      cx = x2;
      cy = y2;
    } else if (cmd.type === 'C') {
      const x0 = cx;
      const y0 = cy;
      const x1 = cmd.x1;
      const y1 = -cmd.y1;
      const x2 = cmd.x2;
      const y2 = -cmd.y2;
      const x3 = cmd.x;
      const y3 = -cmd.y;
      for (let i = 1; i <= curveSteps; i++) {
        const t = i / curveSteps;
        const mt = 1 - t;
        const x =
          mt * mt * mt * x0 +
          3 * mt * mt * t * x1 +
          3 * mt * t * t * x2 +
          t * t * t * x3;
        const y =
          mt * mt * mt * y0 +
          3 * mt * mt * t * y1 +
          3 * mt * t * t * y2 +
          t * t * t * y3;
        pushPtDedup(current, x, y);
      }
      cx = x3;
      cy = y3;
    } else if (cmd.type === 'Z') {
      if (current.length >= 3) {
        rings.push(current);
      }
      current = [];
      cx = startX;
      cy = startY;
    }
  }
  if (current.length >= 3) rings.push(current);

  return normalizePolygons(rings, FillRule.NonZero);
}

export interface TypographyContext {
  kerning?: number;
  weight?: number;
  lineHeight?: number;
}

let activeTypographyContext: TypographyContext = {
  kerning: 0,
  weight: 0,
  lineHeight: 1.15,
};

export function setTypographyContext(ctx: TypographyContext) {
  activeTypographyContext = {
    kerning: Number(ctx.kerning ?? 0),
    weight: Number(ctx.weight ?? 0),
    lineHeight: Number(ctx.lineHeight ?? 1.15),
  };
}

/**
 * Converts a single or multi-line string into 2D Polygons scaled so that the capital height / bounding height matches heightMm
 */
export async function textToPolygons(
  text: string,
  fontId: string,
  heightMm: number,
  lineSpacing?: number
): Promise<Polygons2D> {
  const clean = text.trim();
  if (!clean) return [];

  const effLineSpacing = lineSpacing ?? activeTypographyContext.lineHeight ?? 1.15;
  const kerningMm = activeTypographyContext.kerning ?? 0;
  const weightMm = activeTypographyContext.weight ?? 0;

  const font = await loadFont(fontId);
  const lines = clean.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];

  const allLinePolys: Polygons2D = [];
  const baseFontSize = 100;

  const refPath = font.getPath('H', 0, 0, baseFontSize);
  const refBounds = getBounds2D(flattenOpenTypePath(refPath, 10));
  const capH = Math.max(1, refBounds.height);
  const approxScale = heightMm / capH;
  const kerningUnits = approxScale > 1e-4 ? kerningMm / approxScale : 0;

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    let rawPolys: Polygons2D = [];

    if (Math.abs(kerningUnits) < 1e-2) {
      const otPath = font.getPath(line, 0, 0, baseFontSize);
      rawPolys = flattenOpenTypePath(otPath, 12);
    } else {
      const chars = Array.from(line);
      let cursorX = 0;
      const lineGlyphPolys: Polygons2D = [];
      for (let i = 0; i < chars.length; i++) {
        const ch = chars[i];
        if (i > 0) {
          const prevGlyph = font.charToGlyph(chars[i - 1]);
          const currGlyph = font.charToGlyph(ch);
          const kernVal = font.getKerningValue(prevGlyph, currGlyph) || 0;
          cursorX += kernVal * (baseFontSize / (font.unitsPerEm || 1000));
        }
        if (ch.trim() !== '') {
          const chPath = font.getPath(ch, cursorX, 0, baseFontSize);
          const chPolys = flattenOpenTypePath(chPath, 12);
          lineGlyphPolys.push(...chPolys);
        }
        cursorX += font.getAdvanceWidth(ch, baseFontSize) + kerningUnits;
      }
      rawPolys = normalizePolygons(lineGlyphPolys, FillRule.NonZero);
    }

    const centeredLine = centerPolygons(rawPolys, 0, -idx * baseFontSize * effLineSpacing);
    allLinePolys.push(...centeredLine);
  }

  const normalized = normalizePolygons(allLinePolys, FillRule.NonZero);
  const bounds = getBounds2D(normalized);
  if (bounds.height < 1e-4) return [];

  const scale = (heightMm * lines.length) / bounds.height;
  let scaled = scalePolygons(centerPolygons(normalized, 0, 0), scale, scale);

  if (Math.abs(weightMm) >= 0.02) {
    const safeWeight = Math.max(-heightMm * 0.05, Math.min(heightMm * 0.12, weightMm));
    const weighted = offsetPolygons(scaled, safeWeight, 'round');
    if (weighted.length > 0) {
      scaled = weighted;
    }
  }

  return scaled;
}

/**
 * Generates circular arc text 2D polygons along a circle of radius `radiusMm`.
 * - `anchorAngleDeg`: 0 = Top (12h), 90 = Right (3h), 180 = Bottom (6h), -90/270 = Left (9h)
 * - `flip`: false = clockwise reading (ideal for top arc), true = counter-clockwise upright reading (ideal for bottom arc)
 */
export async function circularTextToPolygons(
  text: string,
  fontId: string,
  letterHeightMm: number,
  radiusMm: number,
  options: {
    anchorAngleDeg?: number;
    letterSpacingMm?: number;
    flip?: boolean;
  } = {}
): Promise<Polygons2D> {
  const clean = text.trim();
  if (!clean || radiusMm <= 1) return [];

  const {
    anchorAngleDeg = 0,
    letterSpacingMm = 1.2,
    flip = false,
  } = options;

  const effLetterSpacing = letterSpacingMm + (activeTypographyContext.kerning ?? 0);
  const weightMm = activeTypographyContext.weight ?? 0;

  const font = await loadFont(fontId);
  const baseSize = 100;
  const refPath = font.getPath('H', 0, 0, baseSize);
  const refBounds = getBounds2D(flattenOpenTypePath(refPath, 10));
  const capH = Math.max(1, refBounds.height);
  const scale = letterHeightMm / capH;

  const chars = Array.from(clean);
  const advances = chars.map((c) => font.getAdvanceWidth(c, baseSize) * scale);
  const totalWidth =
    advances.reduce((a, b) => a + b, 0) +
    effLetterSpacing * Math.max(chars.length - 1, 0);
  const totalAngle = totalWidth / radiusMm;

  const dir = flip ? -1 : 1;
  const anchorRad = (anchorAngleDeg * Math.PI) / 180;
  const startAngle = anchorRad - (dir * totalAngle) * 0.5;

  let cumulative = startAngle;
  const allPolys: Polygons2D = [];

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    const adv = advances[i];
    const halfAngle = (adv * 0.5) / radiusMm;
    const centerAngle = cumulative + dir * halfAngle;
    cumulative += dir * ((adv + effLetterSpacing) / radiusMm);

    if (ch.trim() === '') continue;

    const otPath = font.getPath(ch, 0, 0, baseSize);
    const rawGlyph = flattenOpenTypePath(otPath, 12);
    if (rawGlyph.length === 0) continue;

    const scaledGlyph = scalePolygons(rawGlyph, scale, scale);
    // Center glyph horizontally by -adv/2 and vertically by -letterHeightMm/2 so the arc passes through glyph center
    const centeredGlyph = translatePolygons(scaledGlyph, -adv * 0.5, -letterHeightMm * 0.5);

    const rotDeg = -(centerAngle * 180) / Math.PI + (flip ? 180 : 0);
    const rotatedGlyph = rotatePolygons(centeredGlyph, rotDeg);

    const gx = radiusMm * Math.sin(centerAngle);
    const gy = radiusMm * Math.cos(centerAngle);
    const placedGlyph = translatePolygons(rotatedGlyph, gx, gy);

    allPolys.push(...placedGlyph);
  }

  let result = normalizePolygons(allPolys, FillRule.NonZero);
  if (Math.abs(weightMm) >= 0.02 && result.length > 0) {
    const safeWeight = Math.max(-letterHeightMm * 0.05, Math.min(letterHeightMm * 0.12, weightMm));
    const weighted = offsetPolygons(result, safeWeight, 'round');
    if (weighted.length > 0) {
      result = weighted;
    }
  }
  return result;
}

/**
 * Generates individual letter polygons for channel letters (Letra-Caixa) with per-letter metrics
 */
export async function textToIndividualLetterPolygons(
  text: string,
  fontId: string,
  letterHeightMm: number,
  spacingMm = 12
): Promise<{ char: string; polys: Polygons2D; width: number; height: number }[]> {
  const clean = text.replace(/\s+/g, '');
  if (!clean) return [];
  const font = await loadFont(fontId);
  const baseSize = 100;

  const refPath = font.getPath('H', 0, 0, baseSize);
  const refBounds = getBounds2D(flattenOpenTypePath(refPath, 10));
  const scale = letterHeightMm / Math.max(1, refBounds.height);

  const items: { char: string; polys: Polygons2D; width: number; height: number }[] = [];
  let cursorX = 0;

  for (const ch of clean) {
    const p = font.getPath(ch, 0, 0, baseSize);
    const raw = flattenOpenTypePath(p, 12);
    const scaled = scalePolygons(raw, scale, scale);
    const b = getBounds2D(scaled);
    if (b.width < 0.1) continue;

    const positioned = translatePolygons(
      scaled,
      cursorX - b.minX,
      -b.minY - letterHeightMm * 0.5
    );
    const pb = getBounds2D(positioned);
    items.push({
      char: ch,
      polys: positioned,
      width: pb.width,
      height: pb.height,
    });
    cursorX += pb.width + spacingMm;
  }

  if (items.length > 0) {
    const totalWidth = cursorX - spacingMm;
    const shiftX = -totalWidth * 0.5;
    for (const item of items) {
      item.polys = translatePolygons(item.polys, shiftX, 0);
    }
  }

  return items;
}

/**
 * Ramer-Douglas-Peucker 2D ring simplification to eliminate redundant/microscopic vertices
 */
export function simplifyRing(points: PolygonRing, tolerance: number): PolygonRing {
  if (points.length <= 4) return points;
  const sqTolerance = tolerance * tolerance;

  function getSqSegDist(p: Point2D, p1: Point2D, p2: Point2D): number {
    let x = p1[0], y = p1[1];
    let dx = p2[0] - x, dy = p2[1] - y;
    if (dx !== 0 || dy !== 0) {
      const t = ((p[0] - x) * dx + (p[1] - y) * dy) / (dx * dx + dy * dy);
      if (t > 1) {
        x = p2[0];
        y = p2[1];
      } else if (t > 0) {
        x += dx * t;
        y += dy * t;
      }
    }
    dx = p[0] - x;
    dy = p[1] - y;
    return dx * dx + dy * dy;
  }

  function simplifyDPStep(pts: Point2D[], first: number, last: number, simplified: Point2D[]) {
    let maxSqDist = sqTolerance;
    let index = -1;
    for (let i = first + 1; i < last; i++) {
      const sqDist = getSqSegDist(pts[i], pts[first], pts[last]);
      if (sqDist > maxSqDist) {
        index = i;
        maxSqDist = sqDist;
      }
    }
    if (index > -1) {
      if (index - first > 1) simplifyDPStep(pts, first, index, simplified);
      simplified.push(pts[index]);
      if (last - index > 1) simplifyDPStep(pts, index, last, simplified);
    }
  }

  const last = points.length - 1;
  const simplified = [points[0]];
  simplifyDPStep(points, 0, last, simplified);
  simplified.push(points[last]);
  return simplified;
}

/**
 * Parses an SVG string (<path d="...">, <rect>, <circle>, <ellipse>, <polygon>) into 2D Polygons scaled to targetSizeMm.
 * Supports complex multi-path logos (e.g. 100+ paths like logo-curso.svg), strips <defs>/<clipPath>/<mask>,
 * normalizes compound paths with holes using EvenOdd, and unions all elements cleanly.
 */
export function svgToPolygons(svgContent: string, targetSizeMm: number): Polygons2D {
  if (!svgContent || !svgContent.includes('<')) {
    return shapeGalleryToPolygons('coracao', targetSizeMm);
  }

  try {
    // Strip <defs>, <clipPath>, <mask>, <style>, <symbol> so clip rects/masks are never mistaken for geometry
    const cleanedSvg = svgContent.replace(
      /<(defs|clipPath|mask|style|symbol|pattern|marker)\b[\s\S]*?<\/\1>/gi,
      ''
    );

    const elementRingGroups: Polygons2D[] = [];
    let match: RegExpExecArray | null;

    // 1. Parse all <path ...> elements
    const pathTagRegex = /<path\b([^>]*)>/gi;
    let pathCount = 0;
    while ((match = pathTagRegex.exec(cleanedSvg)) !== null && pathCount < 600) {
      const attrs = match[1];
      if (/\bfill\s*=\s*["']\s*(none|transparent)\s*["']/i.test(attrs)) continue;
      if (/display\s*:\s*none/i.test(attrs)) continue;
      const dMatch = /\bd\s*=\s*["']([^"']+)["']/i.exec(attrs);
      if (!dMatch) continue;
      pathCount++;
      const parsed = parseSvgPathData(dMatch[1]).filter((r) => r.length >= 3);
      if (parsed.length > 0) {
        elementRingGroups.push(parsed);
      }
    }

    // Fallback if <path> tags didn't match standard format
    if (elementRingGroups.length === 0) {
      const rawDRegex = /\bd=["']([^"']+)["']/gi;
      while ((match = rawDRegex.exec(cleanedSvg)) !== null && pathCount < 600) {
        pathCount++;
        const parsed = parseSvgPathData(match[1]).filter((r) => r.length >= 3);
        if (parsed.length > 0) elementRingGroups.push(parsed);
      }
    }

    // 2. Parse <polygon ...> elements
    const polyRegex = /<polygon\b([^>]*)>/gi;
    while ((match = polyRegex.exec(cleanedSvg)) !== null && elementRingGroups.length < 600) {
      const attrs = match[1];
      if (/\bfill\s*=\s*["']\s*(none|transparent)\s*["']/i.test(attrs)) continue;
      const ptsMatch = /\bpoints\s*=\s*["']([^"']+)["']/i.exec(attrs);
      if (!ptsMatch) continue;
      const nums = ptsMatch[1]
        .trim()
        .split(/[\s,]+/)
        .map(Number)
        .filter((n) => !isNaN(n));
      const ring: PolygonRing = [];
      for (let i = 0; i + 1 < nums.length; i += 2) {
        ring.push([nums[i], -nums[i + 1]]);
      }
      if (ring.length >= 3) elementRingGroups.push([ring]);
    }

    // 3. Parse <circle ...> elements
    const circleRegex = /<circle\b([^>]*)>/gi;
    while ((match = circleRegex.exec(cleanedSvg)) !== null && elementRingGroups.length < 600) {
      const tag = match[1];
      if (/\bfill\s*=\s*["']\s*(none|transparent)\s*["']/i.test(tag)) continue;
      const cx = Number((/\bcx=["']([^"']+)["']/i.exec(tag) || [])[1] || 0);
      const cy = Number((/\bcy=["']([^"']+)["']/i.exec(tag) || [])[1] || 0);
      const r = Number((/\br=["']([^"']+)["']/i.exec(tag) || [])[1] || 0);
      if (r > 0) {
        elementRingGroups.push(circlePolygon(r, cx, -cy, 36));
      }
    }

    // 4. Parse <rect ...> elements (outside clipPath/defs)
    const rectRegex = /<rect\b([^>]*)>/gi;
    while ((match = rectRegex.exec(cleanedSvg)) !== null && elementRingGroups.length < 600) {
      const tag = match[1];
      if (/\bfill\s*=\s*["']\s*(none|transparent)\s*["']/i.test(tag)) continue;
      const x = Number((/\bx=["']([^"']+)["']/i.exec(tag) || [])[1] || 0);
      const y = Number((/\by=["']([^"']+)["']/i.exec(tag) || [])[1] || 0);
      const w = Number((/\bwidth=["']([^"']+)["']/i.exec(tag) || [])[1] || 0);
      const h = Number((/\bheight=["']([^"']+)["']/i.exec(tag) || [])[1] || 0);
      if (w > 0 && h > 0) {
        elementRingGroups.push(rectPolygon(w, h, x + w * 0.5, -(y + h * 0.5)));
      }
    }

    if (elementRingGroups.length === 0) {
      return shapeGalleryToPolygons('coracao', targetSizeMm);
    }

    // Compute overall raw bounds so we can scale into targetSizeMm BEFORE running Clipper / RDP!
    // Scaling to targetSizeMm first makes Clipper's 0.001mm precision and RDP tolerance 100% independent of SVG viewBox!
    const allRawRings: Polygons2D = [];
    for (const grp of elementRingGroups) {
      allRawRings.push(...grp);
    }
    const rawBounds = getBounds2D(allRawRings);
    const maxRawDim = Math.max(rawBounds.width, rawBounds.height);
    if (maxRawDim < 1e-5) {
      return shapeGalleryToPolygons('coracao', targetSizeMm);
    }
    const scale = targetSizeMm / maxRawDim;
    const cx0 = rawBounds.centerX;
    const cy0 = rawBounds.centerY;

    // Normalize each <path> individually with EvenOdd (preserving inner holes in letters/icons)
    // and collect into a master Paths64 for a single fast Union.
    const combinedPaths = new Paths64();
    for (const grp of elementRingGroups) {
      const scaledGrp: Polygons2D = grp.map((ring) => {
        const scaledRing: PolygonRing = ring.map(([x, y]) => [
          (x - cx0) * scale,
          (y - cy0) * scale,
        ]);
        return scaledRing.length > 36 ? simplifyRing(scaledRing, 0.025) : scaledRing;
      });
      const subj = toPaths64(scaledGrp);
      if (subj.length === 0) continue;
      if (subj.length === 1) {
        // Ensure single outer ring has positive (CCW) orientation for Union
        if (Clipper.area(subj[0]) < 0) {
          subj[0].reverse();
        }
        combinedPaths.push(subj[0]);
      } else {
        // Compound path (e.g. letter 'O', 'A', 'D', 'R' or emblem with cutouts): solve with EvenOdd
        const solvedPath = Clipper.Union(subj, new Paths64(), FillRule.EvenOdd);
        for (const sp of solvedPath) {
          combinedPaths.push(sp);
        }
      }
    }

    const finalUnion = Clipper.Union(combinedPaths, new Paths64(), FillRule.NonZero);
    const resultPolys = fromPaths64(finalUnion);
    if (resultPolys.length === 0) {
      return shapeGalleryToPolygons('coracao', targetSizeMm);
    }
    return fitPolygonsToSize(resultPolys, targetSizeMm);
  } catch (err) {
    console.warn('[svgToPolygons] Sanitizing complex SVG fallback:', err);
    return shapeGalleryToPolygons('coracao', targetSizeMm);
  }
}

/**
 * Samples an SVG elliptical arc (A/a command) into line segments
 */
function sampleSvgArc(
  x1: number,
  y1: number,
  rxIn: number,
  ryIn: number,
  phiDeg: number,
  largeArcFlag: number,
  sweepFlag: number,
  x2: number,
  y2: number
): Point2D[] {
  let rx = Math.abs(rxIn);
  let ry = Math.abs(ryIn);
  if (rx < 1e-5 || ry < 1e-5 || (Math.abs(x1 - x2) < 1e-5 && Math.abs(y1 - y2) < 1e-5)) {
    return [[x2, -y2]];
  }
  const phi = (phiDeg * Math.PI) / 180;
  const cosPhi = Math.cos(phi);
  const sinPhi = Math.sin(phi);

  const dx2 = (x1 - x2) * 0.5;
  const dy2 = (y1 - y2) * 0.5;
  const x1p = cosPhi * dx2 + sinPhi * dy2;
  const y1p = -sinPhi * dx2 + cosPhi * dy2;

  const x1pSq = x1p * x1p;
  const y1pSq = y1p * y1p;
  let rxSq = rx * rx;
  let rySq = ry * ry;

  const lambda = x1pSq / rxSq + y1pSq / rySq;
  if (lambda > 1) {
    const sqrtLambda = Math.sqrt(lambda);
    rx *= sqrtLambda;
    ry *= sqrtLambda;
    rxSq = rx * rx;
    rySq = ry * ry;
  }

  const sign = largeArcFlag === sweepFlag ? -1 : 1;
  const num = Math.max(0, rxSq * rySq - rxSq * y1pSq - rySq * x1pSq);
  const den = rxSq * y1pSq + rySq * x1pSq;
  const coef = sign * Math.sqrt(den > 1e-12 ? num / den : 0);

  const cxp = coef * ((rx * y1p) / ry);
  const cyp = coef * (-(ry * x1p) / rx);

  const cx = cosPhi * cxp - sinPhi * cyp + (x1 + x2) * 0.5;
  const cy = sinPhi * cxp + cosPhi * cyp + (y1 + y2) * 0.5;

  const vecAngle = (ux: number, uy: number, vx: number, vy: number) => {
    const dot = ux * vx + uy * vy;
    const len = Math.hypot(ux, uy) * Math.hypot(vx, vy);
    const ang = Math.acos(Math.max(-1, Math.min(1, len > 0 ? dot / len : 1)));
    return ux * vy - uy * vx < 0 ? -ang : ang;
  };

  const theta1 = vecAngle(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
  let dTheta = vecAngle(
    (x1p - cxp) / rx,
    (y1p - cyp) / ry,
    (-x1p - cxp) / rx,
    (-y1p - cyp) / ry
  );

  if (sweepFlag === 0 && dTheta > 0) dTheta -= Math.PI * 2;
  else if (sweepFlag !== 0 && dTheta < 0) dTheta += Math.PI * 2;

  const steps = Math.max(6, Math.min(32, Math.ceil((Math.abs(dTheta) / (Math.PI * 0.5)) * 8)));
  const pts: Point2D[] = [];
  for (let s = 1; s <= steps; s++) {
    const theta = theta1 + (s / steps) * dTheta;
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);
    const px = cosPhi * rx * cosT - sinPhi * ry * sinT + cx;
    const py = sinPhi * rx * cosT + cosPhi * ry * sinT + cy;
    pts.push([px, -py]);
  }
  return pts;
}

function parseSvgPathData(d: string): Polygons2D {
  const tokens = d.match(/[a-zA-Z]|[-+]?(?:\d*\.\d+|\d+)(?:[eE][-+]?\d+)?/g);
  if (!tokens) return [];

  const rings: Polygons2D = [];
  let current: PolygonRing = [];
  let i = 0;
  let cmd = '';
  let cx = 0;
  let cy = 0;
  let sx = 0;
  let sy = 0;
  let prevCtrlX = 0;
  let prevCtrlY = 0;

  const nextNum = () => Number(tokens[i++]);
  const hasNum = () => i < tokens.length && !/^[a-zA-Z]$/.test(tokens[i]);

  while (i < tokens.length) {
    if (/^[a-zA-Z]$/.test(tokens[i])) {
      cmd = tokens[i++];
    }

    switch (cmd) {
      case 'M':
      case 'm': {
        if (current.length >= 3) rings.push(current);
        const x = nextNum();
        const y = nextNum();
        cx = cmd === 'm' ? cx + x : x;
        cy = cmd === 'm' ? cy + y : y;
        sx = cx;
        sy = cy;
        prevCtrlX = cx;
        prevCtrlY = cy;
        current = [[cx, -cy]];
        cmd = cmd === 'm' ? 'l' : 'L';
        break;
      }
      case 'L':
      case 'l': {
        while (hasNum()) {
          const x = nextNum();
          const y = nextNum();
          cx = cmd === 'l' ? cx + x : x;
          cy = cmd === 'l' ? cy + y : y;
          prevCtrlX = cx;
          prevCtrlY = cy;
          pushPtDedup(current, cx, -cy);
        }
        break;
      }
      case 'H':
      case 'h': {
        while (hasNum()) {
          const x = nextNum();
          cx = cmd === 'h' ? cx + x : x;
          prevCtrlX = cx;
          prevCtrlY = cy;
          pushPtDedup(current, cx, -cy);
        }
        break;
      }
      case 'V':
      case 'v': {
        while (hasNum()) {
          const y = nextNum();
          cy = cmd === 'v' ? cy + y : y;
          prevCtrlX = cx;
          prevCtrlY = cy;
          pushPtDedup(current, cx, -cy);
        }
        break;
      }
      case 'C':
      case 'c': {
        while (hasNum()) {
          const x1 = cmd === 'c' ? cx + nextNum() : nextNum();
          const y1 = cmd === 'c' ? cy + nextNum() : nextNum();
          const x2 = cmd === 'c' ? cx + nextNum() : nextNum();
          const y2 = cmd === 'c' ? cy + nextNum() : nextNum();
          const x = cmd === 'c' ? cx + nextNum() : nextNum();
          const y = cmd === 'c' ? cy + nextNum() : nextNum();
          const steps = 10;
          for (let s = 1; s <= steps; s++) {
            const t = s / steps;
            const mt = 1 - t;
            const px =
              mt * mt * mt * cx +
              3 * mt * mt * t * x1 +
              3 * mt * t * t * x2 +
              t * t * t * x;
            const py =
              mt * mt * mt * cy +
              3 * mt * mt * t * y1 +
              3 * mt * t * t * y2 +
              t * t * t * y;
            pushPtDedup(current, px, -py);
          }
          prevCtrlX = x2;
          prevCtrlY = y2;
          cx = x;
          cy = y;
        }
        break;
      }
      case 'S':
      case 's': {
        while (hasNum()) {
          const x1 = 2 * cx - prevCtrlX;
          const y1 = 2 * cy - prevCtrlY;
          const x2 = cmd === 's' ? cx + nextNum() : nextNum();
          const y2 = cmd === 's' ? cy + nextNum() : nextNum();
          const x = cmd === 's' ? cx + nextNum() : nextNum();
          const y = cmd === 's' ? cy + nextNum() : nextNum();
          const steps = 10;
          for (let s = 1; s <= steps; s++) {
            const t = s / steps;
            const mt = 1 - t;
            const px =
              mt * mt * mt * cx +
              3 * mt * mt * t * x1 +
              3 * mt * t * t * x2 +
              t * t * t * x;
            const py =
              mt * mt * mt * cy +
              3 * mt * mt * t * y1 +
              3 * mt * t * t * y2 +
              t * t * t * y;
            pushPtDedup(current, px, -py);
          }
          prevCtrlX = x2;
          prevCtrlY = y2;
          cx = x;
          cy = y;
        }
        break;
      }
      case 'Q':
      case 'q': {
        while (hasNum()) {
          const x1 = cmd === 'q' ? cx + nextNum() : nextNum();
          const y1 = cmd === 'q' ? cy + nextNum() : nextNum();
          const x = cmd === 'q' ? cx + nextNum() : nextNum();
          const y = cmd === 'q' ? cy + nextNum() : nextNum();
          const steps = 10;
          for (let s = 1; s <= steps; s++) {
            const t = s / steps;
            const mt = 1 - t;
            const px = mt * mt * cx + 2 * mt * t * x1 + t * t * x;
            const py = mt * mt * cy + 2 * mt * t * y1 + t * t * y;
            pushPtDedup(current, px, -py);
          }
          prevCtrlX = x1;
          prevCtrlY = y1;
          cx = x;
          cy = y;
        }
        break;
      }
      case 'T':
      case 't': {
        while (hasNum()) {
          const x1 = 2 * cx - prevCtrlX;
          const y1 = 2 * cy - prevCtrlY;
          const x = cmd === 't' ? cx + nextNum() : nextNum();
          const y = cmd === 't' ? cy + nextNum() : nextNum();
          const steps = 10;
          for (let s = 1; s <= steps; s++) {
            const t = s / steps;
            const mt = 1 - t;
            const px = mt * mt * cx + 2 * mt * t * x1 + t * t * x;
            const py = mt * mt * cy + 2 * mt * t * y1 + t * t * y;
            pushPtDedup(current, px, -py);
          }
          prevCtrlX = x1;
          prevCtrlY = y1;
          cx = x;
          cy = y;
        }
        break;
      }
      case 'A':
      case 'a': {
        while (hasNum()) {
          const rx = nextNum();
          const ry = nextNum();
          const xAxisRot = nextNum();
          const largeArc = nextNum();
          const sweep = nextNum();
          const x = cmd === 'a' ? cx + nextNum() : nextNum();
          const y = cmd === 'a' ? cy + nextNum() : nextNum();
          const arcPts = sampleSvgArc(cx, cy, rx, ry, xAxisRot, largeArc, sweep, x, y);
          for (const [px, py] of arcPts) {
            pushPtDedup(current, px, py);
          }
          prevCtrlX = x;
          prevCtrlY = y;
          cx = x;
          cy = y;
        }
        break;
      }
      case 'Z':
      case 'z': {
        if (current.length >= 3) rings.push(current);
        current = [];
        cx = sx;
        cy = sy;
        prevCtrlX = cx;
        prevCtrlY = cy;
        break;
      }
      default: {
        if (hasNum()) nextNum();
        break;
      }
    }
  }
  if (current.length >= 3) rings.push(current);
  return rings;
}

/**
 * Generates 2D polygons of a real scannable QR Code
 */
export function qrToPolygons(content: string, totalSizeMm: number): Polygons2D {
  const text = content.trim() || 'https://stltools.com';
  const qr = QRCode.create(text, { errorCorrectionLevel: 'M' });
  const size = qr.modules.size;
  const data = qr.modules.data;
  const cellMm = totalSizeMm / size;
  const half = totalSizeMm * 0.5;

  const rects: Polygons2D = [];
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (data[row * size + col]) {
        const cx = -half + (col + 0.5) * cellMm;
        const cy = half - (row + 0.5) * cellMm;
        rects.push(...rectPolygon(cellMm + 0.02, cellMm + 0.02, cx, cy));
      }
    }
  }
  return normalizePolygons(rects, FillRule.NonZero);
}

// ============================================================================
// 3D EXTRUSION & SOLID GEOMETRY BUILDERS
// ============================================================================

interface ShapeHierarchy {
  outer: PolygonRing;
  holes: PolygonRing[];
}

function buildPolygonHierarchy(polys: Polygons2D): ShapeHierarchy[] {
  const outers: { ring: PolygonRing; area: number }[] = [];
  const holes: { ring: PolygonRing; area: number }[] = [];

  for (const ring of polys) {
    const a = signedArea2D(ring);
    if (Math.abs(a) < 1e-4) continue;
    if (a > 0) {
      outers.push({ ring, area: a });
    } else {
      holes.push({ ring, area: Math.abs(a) });
    }
  }

  outers.sort((a, b) => a.area - b.area);

  const groups: ShapeHierarchy[] = outers.map((o) => ({ outer: o.ring, holes: [] }));

  for (const h of holes) {
    const testPt = h.ring[0];
    for (const g of groups) {
      if (pointInRing(testPt, g.outer)) {
        g.holes.push(h.ring);
        break;
      }
    }
  }

  return groups;
}

export interface ExtrudeOptions {
  height: number;
  zOffset?: number;
}

/**
 * Extrudes any 2D Polygons (with arbitrary islands and holes) along the Z axis into a watertight THREE.BufferGeometry
 */
export function extrudePolygons(polys: Polygons2D, options: ExtrudeOptions): THREE.BufferGeometry {
  const { height, zOffset = 0 } = options;
  const groups = buildPolygonHierarchy(polys);

  const positions: number[] = [];
  const normals: number[] = [];

  const z0 = zOffset;
  const z1 = zOffset + height;

  const pushTopTri = (ax: number, ay: number, bx: number, by: number, cx: number, cy: number) => {
    positions.push(ax, ay, z1, bx, by, z1, cx, cy, z1);
    normals.push(0, 0, 1, 0, 0, 1, 0, 0, 1);
  };

  const pushBottomTri = (ax: number, ay: number, bx: number, by: number, cx: number, cy: number) => {
    positions.push(ax, ay, z0, bx, by, z0, cx, cy, z0);
    normals.push(0, 0, -1, 0, 0, -1, 0, 0, -1);
  };

  const pushSideWallTri = (
    ax: number, ay: number, az: number,
    bx: number, by: number, bz: number,
    cx: number, cy: number, cz: number,
    nx: number, ny: number
  ) => {
    positions.push(ax, ay, az, bx, by, bz, cx, cy, cz);
    normals.push(nx, ny, 0, nx, ny, 0, nx, ny, 0);
  };

  for (const group of groups) {
    const flatCoords: number[] = [];
    const holeIndices: number[] = [];
    const allPts: Point2D[] = [];

    for (const [x, y] of group.outer) {
      flatCoords.push(x, y);
      allPts.push([x, y]);
    }

    for (const hole of group.holes) {
      holeIndices.push(allPts.length);
      for (const [x, y] of hole) {
        flatCoords.push(x, y);
        allPts.push([x, y]);
      }
    }

    const indices = earcut(flatCoords, holeIndices, 2);

    for (let i = 0; i < indices.length; i += 3) {
      const p0 = allPts[indices[i]];
      const p1 = allPts[indices[i + 1]];
      const p2 = allPts[indices[i + 2]];

      const cross =
        (p1[0] - p0[0]) * (p2[1] - p0[1]) - (p1[1] - p0[1]) * (p2[0] - p0[0]);
      if (Math.abs(cross) < 1e-5) continue;

      if (cross > 0) {
        pushTopTri(p0[0], p0[1], p1[0], p1[1], p2[0], p2[1]);
        pushBottomTri(p0[0], p0[1], p2[0], p2[1], p1[0], p1[1]);
      } else {
        pushTopTri(p0[0], p0[1], p2[0], p2[1], p1[0], p1[1]);
        pushBottomTri(p0[0], p0[1], p1[0], p1[1], p2[0], p2[1]);
      }
    }

    const allRings = [group.outer, ...group.holes];
    for (const ring of allRings) {
      const n = ring.length;
      for (let i = 0; i < n; i++) {
        const [x1, y1] = ring[i];
        const [x2, y2] = ring[(i + 1) % n];
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.hypot(dx, dy) || 1;
        const nx = dy / len;
        const ny = -dx / len;

        pushSideWallTri(x1, y1, z0, x2, y2, z0, x2, y2, z1, nx, ny);
        pushSideWallTri(x1, y1, z0, x2, y2, z1, x1, y1, z1, nx, ny);
      }
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  return geom;
}

export function extrudeProfileAlongX(profileYZ: Polygons2D, widthX: number): THREE.BufferGeometry {
  const geom = extrudePolygons(profileYZ, { height: widthX, zOffset: -widthX * 0.5 });
  const pos = geom.getAttribute('position') as THREE.BufferAttribute;
  const norm = geom.getAttribute('normal') as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const py = pos.getX(i);
    const pz = pos.getY(i);
    const px = pos.getZ(i);
    pos.setXYZ(i, px, py, pz);

    const ny = norm.getX(i);
    const nz = norm.getY(i);
    const nx = norm.getZ(i);
    norm.setXYZ(i, nx, ny, nz);
  }
  pos.needsUpdate = true;
  norm.needsUpdate = true;
  return geom;
}

export function mergeGeometries(geoms: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const valid = geoms
    .filter((g) => g && g.getAttribute('position')?.count > 0)
    .map((g) => (g.index ? g.toNonIndexed() : g));
  if (valid.length === 0) {
    return new THREE.BufferGeometry();
  }
  if (valid.length === 1) {
    return valid[0].clone();
  }

  let totalVerts = 0;
  for (const g of valid) {
    totalVerts += g.getAttribute('position').count;
  }

  const positions = new Float32Array(totalVerts * 3);
  const normals = new Float32Array(totalVerts * 3);

  let offset = 0;
  for (const g of valid) {
    const p = g.getAttribute('position') as THREE.BufferAttribute;
    const n = g.getAttribute('normal') as THREE.BufferAttribute;
    positions.set(p.array as Float32Array, offset);
    if (n) {
      normals.set(n.array as Float32Array, offset);
    }
    offset += p.count * 3;
  }

  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  return merged;
}

export function transformGeometry(
  geom: THREE.BufferGeometry,
  opts: {
    translate?: [number, number, number];
    rotateDeg?: [number, number, number];
    scale?: [number, number, number];
  }
): THREE.BufferGeometry {
  const cloned = geom.clone();
  const mat = new THREE.Matrix4();

  if (opts.scale) {
    mat.scale(new THREE.Vector3(...opts.scale));
  }
  if (opts.rotateDeg) {
    const [rx, ry, rz] = opts.rotateDeg;
    const euler = new THREE.Euler(
      (rx * Math.PI) / 180,
      (ry * Math.PI) / 180,
      (rz * Math.PI) / 180,
      'XYZ'
    );
    const rotMat = new THREE.Matrix4().makeRotationFromEuler(euler);
    mat.premultiply(rotMat);
  }
  if (opts.translate) {
    const transMat = new THREE.Matrix4().makeTranslation(...opts.translate);
    mat.premultiply(transMat);
  }

  cloned.applyMatrix4(mat);
  return cloned;
}
