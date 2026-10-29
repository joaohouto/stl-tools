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
// UPSTREAM CLIPPER2-JS BUG FIX
// In clipper2-js@1.2.4, `ClipperOffset.prototype.offsetPolygon` and `offsetOpenPath`
// translated C#'s `ref int k` parameter by value (`const prev = cnt - 1`) without
// advancing `prev = i` after `this.offsetPoint(group, path, i, prev)`.
// That caused every polygon offset (`InflatePaths`) to compare vertex `i` against `cnt - 1`,
// producing severe sawtooth/spiky artifacts on curves. Patching the prototype fixes it globally.
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

export type Point2D = [number, number];
export type PolygonRing = Point2D[];
export type Polygons2D = PolygonRing[];

const CLIPPER_SCALE = 1000; // 0.001mm precision

function toPaths64(polys: Polygons2D): Paths64 {
  const paths = new Paths64();
  for (const ring of polys) {
    if (ring.length < 3) continue;
    const p = new Path64();
    for (const [x, y] of ring) {
      p.push(new Point64(Math.round(x * CLIPPER_SCALE), Math.round(y * CLIPPER_SCALE)));
    }
    paths.push(p);
  }
  return paths;
}

function fromPaths64(paths: Paths64): Polygons2D {
  const result: Polygons2D = [];
  for (const p of paths) {
    if (p.length < 3) continue;
    const ring: PolygonRing = [];
    for (const pt of p) {
      ring.push([Number(pt.x) / CLIPPER_SCALE, Number(pt.y) / CLIPPER_SCALE]);
    }
    result.push(ring);
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
 * Attaches a reinforced pendant/keyring loop ('top' or 'left') that automatically detects
 * the exact local boundary of any shape (bone central shaft, heart cleft, cursive letters, etc.)
 * and bridges into the solid interior so it never floats or detaches.
 */
export function attachKeyringTab(
  basePolys: Polygons2D,
  position: 'top' | 'left',
  holeDiameterMm: number,
  wallThicknessMm = 2.6
): Polygons2D {
  if (basePolys.length === 0) return basePolys;
  const innerR = Math.max(1.0, holeDiameterMm * 0.5);
  const outerR = innerR + Math.max(1.8, wallThicknessMm);
  const baseBounds = getBounds2D(basePolys);

  if (position === 'top') {
    const tabX = 0;
    const vStrip = intersectPolygons(basePolys, rectPolygon(outerR * 0.8, 2000, tabX, 0));
    const sb = vStrip.length > 0 ? getBounds2D(vStrip) : baseBounds;
    const tabY = sb.maxY + outerR * 0.55;
    const anchorY = sb.centerY;
    const neckH = Math.max(outerR, tabY - anchorY);
    // Stadium/arch tab with full width 2 * outerR so it never overhangs or traps a pocket on concave tops
    const neck = rectPolygon(outerR * 2.0, neckH, tabX, anchorY + neckH * 0.5);
    const outerLoop = circlePolygon(outerR, tabX, tabY, 48);
    const innerHole = circlePolygon(innerR, tabX, tabY, 40);
    const tabSolid = unionPolygons(neck, outerLoop);
    return subtractPolygons(unionPolygons(basePolys, tabSolid), innerHole);
  } else {
    // 'left': find the vertical center of the leftmost region of the contour
    const leftSlice = intersectPolygons(
      basePolys,
      rectPolygon(outerR * 1.8, 2000, baseBounds.minX + outerR * 0.9, 0)
    );
    const sliceBounds = leftSlice.length > 0 ? getBounds2D(leftSlice) : baseBounds;
    const tabY = sliceBounds.centerY;

    const hStrip = intersectPolygons(basePolys, rectPolygon(2000, outerR * 0.8, 0, tabY));
    const sb = hStrip.length > 0 ? getBounds2D(hStrip) : baseBounds;
    const tabX = sb.minX - outerR * 0.55;
    const anchorX = Math.min(sb.centerX, sb.minX + outerR * 1.4);
    const neckW = Math.max(outerR, anchorX - tabX);
    // Full height 2 * outerR stadium bridge so it blends flush into the contour
    const neck = rectPolygon(neckW, outerR * 2.0, tabX + neckW * 0.5, tabY);
    const outerLoop = circlePolygon(outerR, tabX, tabY, 48);
    const innerHole = circlePolygon(innerR, tabX, tabY, 40);
    const tabSolid = unionPolygons(neck, outerLoop);
    return subtractPolygons(unionPolygons(basePolys, tabSolid), innerHole);
  }
}

export interface ShapePreset {
  id: string;
  label: string;
}

export const BUILTIN_SHAPES: ShapePreset[] = [
  { id: 'coracao', label: 'Coração' },
  { id: 'estrela', label: 'Estrela 5 Pontas' },
  { id: 'osso', label: 'Osso Pet' },
  { id: 'circulo', label: 'Círculo / Medalha' },
  { id: 'hexagono', label: 'Hexágono' },
  { id: 'escudo', label: 'Escudo / Brasão' },
  { id: 'patinha', label: 'Patinha Pet' },
  { id: 'urso', label: 'Ursinho' },
  { id: 'gato', label: 'Gatinho' },
  { id: 'coroa', label: 'Coroa Real' },
  { id: 'controle', label: 'Controle Gamer' },
  { id: 'raio', label: 'Raio / Flash' },
];

export function shapeGalleryToPolygons(shapeId: string, sizeMm: number): Polygons2D {
  const r = sizeMm * 0.5;
  switch (shapeId) {
    case 'circulo':
      return circlePolygon(r, 0, 0, 72);

    case 'hexagono': {
      // Flat-topped or pointy-topped regular hexagon with smooth rounded corners
      const hexVerts: Point2D[] = [];
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
        hexVerts.push([Math.cos(a) * r, Math.sin(a) * r]);
      }
      return fitPolygonsToSize(roundedPolygonFromVertices(hexVerts, sizeMm * 0.06), sizeMm);
    }

    case 'estrela': {
      const ring: PolygonRing = [];
      const points = 5;
      const outerR = r;
      const innerR = r * 0.46;
      for (let i = 0; i < points * 2; i++) {
        const rad = i % 2 === 0 ? outerR : innerR;
        const a = (i / (points * 2)) * Math.PI * 2 + Math.PI * 0.5;
        ring.push([Math.cos(a) * rad, Math.sin(a) * rad]);
      }
      return fitPolygonsToSize(
        offsetPolygons(offsetPolygons([ring], -sizeMm * 0.025, 'round'), sizeMm * 0.045, 'round'),
        sizeMm
      );
    }

    case 'coracao': {
      // Simple, plump, tangent geometric heart: exact square + 2 tangent semicircular lobes,
      // rotated -45 deg with a softly rounded bottom tip (no sharp needle point!)
      const s = sizeMm * 0.52;
      const baseSquare = rectPolygon(s, s, 0, 0);
      const lobeL = circlePolygon(s * 0.5, -s * 0.5, 0, 56);
      const lobeR = circlePolygon(s * 0.5, 0, s * 0.5, 56);
      const rawHeart = rotatePolygons(unionPolygons(baseSquare, lobeL, lobeR), -45);
      const roundedTip = offsetPolygons(
        offsetPolygons(rawHeart, -s * 0.14, 'round'),
        s * 0.14,
        'round'
      );
      return fitPolygonsToSize(roundedTip, sizeMm);
    }

    case 'osso': {
      const bar = roundedRectPolygon(sizeMm * 0.64, sizeMm * 0.30, sizeMm * 0.06);
      const kx = sizeMm * 0.30;
      const ky = sizeMm * 0.135;
      const kr = sizeMm * 0.165;
      const c1 = circlePolygon(kr, -kx, ky, 40);
      const c2 = circlePolygon(kr, -kx, -ky, 40);
      const c3 = circlePolygon(kr, kx, ky, 40);
      const c4 = circlePolygon(kr, kx, -ky, 40);
      const merged = unionPolygons(bar, c1, c2, c3, c4);
      // Smooth inner armpits of the bone slightly
      const smoothed = offsetPolygons(offsetPolygons(merged, 1.2, 'round'), -1.2, 'round');
      return fitPolygonsToSize(smoothed, sizeMm);
    }

    case 'escudo': {
      // Classic heraldic crest shield with smooth curved sides and gently rounded bottom tip
      const svgShield = `<svg viewBox="0 0 100 100"><path d="M 50 6 L 88 18 L 88 48 C 88 73 70 88 50 96 C 30 88 12 73 12 48 L 12 18 Z"/></svg>`;
      const poly = svgToPolygons(svgShield, sizeMm);
      return fitPolygonsToSize(
        offsetPolygons(offsetPolygons(poly, -sizeMm * 0.03, 'round'), sizeMm * 0.03, 'round'),
        sizeMm
      );
    }

    case 'patinha': {
      const mainPad = unionPolygons(
        circlePolygon(r * 0.34, 0, -r * 0.22, 40),
        circlePolygon(r * 0.25, -r * 0.20, -r * 0.32, 36),
        circlePolygon(r * 0.25, r * 0.20, -r * 0.32, 36)
      );
      const t1 = circlePolygon(r * 0.14, -r * 0.48, r * 0.14, 32);
      const t2 = circlePolygon(r * 0.15, -r * 0.18, r * 0.42, 32);
      const t3 = circlePolygon(r * 0.15, r * 0.18, r * 0.42, 32);
      const t4 = circlePolygon(r * 0.14, r * 0.48, r * 0.14, 32);
      return fitPolygonsToSize(unionPolygons(mainPad, t1, t2, t3, t4), sizeMm);
    }

    case 'urso': {
      const head = circlePolygon(r * 0.72, 0, -r * 0.08, 56);
      const earL = circlePolygon(r * 0.32, -r * 0.52, r * 0.45, 40);
      const earR = circlePolygon(r * 0.32, r * 0.52, r * 0.45, 40);
      const merged = unionPolygons(head, earL, earR);
      return fitPolygonsToSize(
        offsetPolygons(offsetPolygons(merged, 1.0, 'round'), -1.0, 'round'),
        sizeMm
      );
    }

    case 'gato': {
      const head = circlePolygon(r * 0.72, 0, -r * 0.12, 56);
      const earL: Polygons2D = [
        [
          [-r * 0.68, r * 0.05],
          [-r * 0.10, r * 0.45],
          [-r * 0.56, r * 0.82],
        ],
      ];
      const earR: Polygons2D = [
        [
          [r * 0.68, r * 0.05],
          [r * 0.56, r * 0.82],
          [r * 0.10, r * 0.45],
        ],
      ];
      const merged = unionPolygons(head, earL, earR);
      return fitPolygonsToSize(
        offsetPolygons(offsetPolygons(merged, -sizeMm * 0.03, 'round'), sizeMm * 0.03, 'round'),
        sizeMm
      );
    }

    case 'coroa': {
      const ring: PolygonRing = [
        [-r * 0.75, -r * 0.55],
        [r * 0.75, -r * 0.55],
        [r * 0.90, r * 0.45],
        [r * 0.42, -r * 0.05],
        [0, r * 0.65],
        [-r * 0.42, -r * 0.05],
        [-r * 0.90, r * 0.45],
      ];
      return fitPolygonsToSize(
        offsetPolygons(offsetPolygons([ring], -sizeMm * 0.025, 'round'), sizeMm * 0.04, 'round'),
        sizeMm
      );
    }

    case 'controle': {
      // Classic modern gamepad silhouette (ergonomic angled grips, central body, and top shoulder bumpers)
      const svgGamepad = `<svg viewBox="0 0 100 100"><path d="M 32 22 L 68 22 C 78 22 86 28 90 40 L 95 62 C 98 76 88 86 76 84 C 68 82 63 74 58 62 L 42 62 C 37 74 32 82 24 84 C 12 86 2 76 5 62 L 10 40 C 14 28 22 22 32 22 Z"/></svg>`;
      const poly = svgToPolygons(svgGamepad, sizeMm);
      return fitPolygonsToSize(
        offsetPolygons(offsetPolygons(poly, -sizeMm * 0.02, 'round'), sizeMm * 0.02, 'round'),
        sizeMm
      );
    }

    case 'raio': {
      const ring: PolygonRing = [
        [r * 0.15, r * 0.95],
        [-r * 0.55, -r * 0.05],
        [-r * 0.05, -r * 0.05],
        [-r * 0.25, -r * 0.95],
        [r * 0.55, r * 0.08],
        [r * 0.05, r * 0.08],
      ];
      return fitPolygonsToSize(roundedPolygonFromVertices(ring, sizeMm * 0.025), sizeMm);
    }

    default:
      return circlePolygon(r, 0, 0, 64);
  }
}

// ============================================================================
// TEXT & SVG TO 2D POLYGONS
// ============================================================================

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
      current.push([cx, cy]);
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
        current.push([x, y]);
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
        current.push([x, y]);
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

/**
 * Converts a single or multi-line string into 2D Polygons scaled so that the capital height / bounding height matches heightMm
 */
export async function textToPolygons(
  text: string,
  fontId: string,
  heightMm: number,
  lineSpacing = 1.15
): Promise<Polygons2D> {
  const clean = text.trim();
  if (!clean) return [];

  const font = await loadFont(fontId);
  const lines = clean.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];

  const allLinePolys: Polygons2D = [];
  const baseFontSize = 100;

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    const otPath = font.getPath(line, 0, 0, baseFontSize);
    const rawPolys = flattenOpenTypePath(otPath, 12);
    const centeredLine = centerPolygons(rawPolys, 0, -idx * baseFontSize * lineSpacing);
    allLinePolys.push(...centeredLine);
  }

  const normalized = normalizePolygons(allLinePolys, FillRule.NonZero);
  const bounds = getBounds2D(normalized);
  if (bounds.height < 1e-4) return [];

  const scale = (heightMm * lines.length) / bounds.height;
  const scaled = scalePolygons(centerPolygons(normalized, 0, 0), scale, scale);
  return scaled;
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
 * Parses an SVG string (<path d="...">, <rect>, <circle>, <polygon>) into 2D Polygons scaled to targetSizeMm
 */
export function svgToPolygons(svgContent: string, targetSizeMm: number): Polygons2D {
  if (!svgContent || !svgContent.includes('<')) {
    return shapeGalleryToPolygons('coracao', targetSizeMm);
  }

  const rings: Polygons2D = [];

  const pathRegex = /\bd=["']([^"']+)["']/gi;
  let match: RegExpExecArray | null;
  while ((match = pathRegex.exec(svgContent)) !== null) {
    const d = match[1];
    const parsed = parseSvgPathData(d);
    rings.push(...parsed);
  }

  const polyRegex = /<polygon[^>]*\bpoints=["']([^"']+)["']/gi;
  while ((match = polyRegex.exec(svgContent)) !== null) {
    const nums = match[1]
      .trim()
      .split(/[\s,]+/)
      .map(Number)
      .filter((n) => !isNaN(n));
    const ring: PolygonRing = [];
    for (let i = 0; i + 1 < nums.length; i += 2) {
      ring.push([nums[i], -nums[i + 1]]);
    }
    if (ring.length >= 3) rings.push(ring);
  }

  const circleRegex = /<circle[^>]*>/gi;
  while ((match = circleRegex.exec(svgContent)) !== null) {
    const tag = match[0];
    const cx = Number((/\bcx=["']([^"']+)["']/i.exec(tag) || [])[1] || 0);
    const cy = Number((/\bcy=["']([^"']+)["']/i.exec(tag) || [])[1] || 0);
    const r = Number((/\br=["']([^"']+)["']/i.exec(tag) || [])[1] || 0);
    if (r > 0) {
      rings.push(...circlePolygon(r, cx, -cy, 40));
    }
  }

  if (rings.length === 0) {
    return shapeGalleryToPolygons('coracao', targetSizeMm);
  }

  const normalized = normalizePolygons(rings, FillRule.EvenOdd);
  return fitPolygonsToSize(normalized, targetSizeMm);
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
          current.push([cx, -cy]);
        }
        break;
      }
      case 'H':
      case 'h': {
        while (hasNum()) {
          const x = nextNum();
          cx = cmd === 'h' ? cx + x : x;
          current.push([cx, -cy]);
        }
        break;
      }
      case 'V':
      case 'v': {
        while (hasNum()) {
          const y = nextNum();
          cy = cmd === 'v' ? cy + y : y;
          current.push([cx, -cy]);
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
          const steps = 12;
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
            current.push([px, -py]);
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
          const steps = 12;
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
            current.push([px, -py]);
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
            current.push([px, -py]);
          }
          prevCtrlX = x1;
          prevCtrlY = y1;
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

  const pushTri = (
    ax: number,
    ay: number,
    az: number,
    bx: number,
    by: number,
    bz: number,
    cx: number,
    cy: number,
    cz: number
  ) => {
    positions.push(ax, ay, az, bx, by, bz, cx, cy, cz);
    const ux = bx - ax;
    const uy = by - ay;
    const uz = bz - az;
    const vx = cx - ax;
    const vy = cy - ay;
    const vz = cz - az;
    let nx = uy * vz - uz * vy;
    let ny = uz * vx - ux * vz;
    let nz = ux * vy - uy * vx;
    const len = Math.hypot(nx, ny, nz) || 1;
    nx /= len;
    ny /= len;
    nz /= len;
    normals.push(nx, ny, nz, nx, ny, nz, nx, ny, nz);
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

      if (cross >= 0) {
        pushTri(p0[0], p0[1], z1, p1[0], p1[1], z1, p2[0], p2[1], z1);
        pushTri(p0[0], p0[1], z0, p2[0], p2[1], z0, p1[0], p1[1], z0);
      } else {
        pushTri(p0[0], p0[1], z1, p2[0], p2[1], z1, p1[0], p1[1], z1);
        pushTri(p0[0], p0[1], z0, p1[0], p1[1], z0, p2[0], p2[1], z0);
      }
    }

    const allRings = [group.outer, ...group.holes];
    for (const ring of allRings) {
      const n = ring.length;
      for (let i = 0; i < n; i++) {
        const [x1, y1] = ring[i];
        const [x2, y2] = ring[(i + 1) % n];
        pushTri(x1, y1, z0, x2, y2, z0, x2, y2, z1);
        pushTri(x1, y1, z0, x2, y2, z1, x1, y1, z1);
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
  const valid = geoms.filter((g) => g && g.getAttribute('position')?.count > 0);
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
