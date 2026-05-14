/**
 * 3D implant geometry — pure math, no Cornerstone dependency.
 *
 * An implant is a 3D body: entry point (platform center) in world mm plus a
 * unit axis pointing toward the apex. Each viewport renders the intersection
 * of this body with its own plane, so an implant off the plane shows only as
 * a narrow strip (the edge of the cylinder) or not at all.
 */

import { buildUniformCurve, type Point2 } from './cprMath';

export type Vec3 = [number, number, number];

export function dot3(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export function cross3(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

// ── Arch frame lookup ──────────────────────────────────────────

export interface ArchFrame {
  /** Normalized arch position 0-1 */
  s: number;
  /** Curve point (XY world) */
  point: Point2;
  /** Unit buccolingual normal */
  normal: Point2;
  /** Unit tangent toward increasing s */
  tangent: Point2;
}

// Cache the dense curve per control-point array identity (state updates
// replace the array, so reference equality is a valid cache key)
const curveCache = new WeakMap<Point2[], ReturnType<typeof buildUniformCurve>>();

function getCurve(controlPoints: Point2[]) {
  let c = curveCache.get(controlPoints);
  if (!c) {
    c = buildUniformCurve(controlPoints, 500);
    curveCache.set(controlPoints, c);
  }
  return c;
}

/** Frame of the arch at normalized position s (0-1). */
export function archFrameAt(controlPoints: Point2[], s: number): ArchFrame | null {
  const { curve, normals } = getCurve(controlPoints);
  if (curve.length < 2) return null;
  const idx = Math.round(Math.max(0, Math.min(1, s)) * (curve.length - 1));
  const normal = normals[idx];
  return {
    s: idx / (curve.length - 1),
    point: curve[idx],
    normal,
    tangent: [normal[1], -normal[0]],
  };
}

/** Frame of the arch at the curve point nearest (in XY) to `p`. */
export function nearestArchFrame(controlPoints: Point2[], p: Point2): ArchFrame | null {
  const { curve, normals } = getCurve(controlPoints);
  if (curve.length < 2) return null;

  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < curve.length; i++) {
    const dx = curve[i][0] - p[0];
    const dy = curve[i][1] - p[1];
    const d = dx * dx + dy * dy;
    if (d < bestD) { bestD = d; best = i; }
  }

  const normal = normals[best];
  return {
    s: best / (curve.length - 1),
    point: curve[best],
    normal,
    tangent: [normal[1], -normal[0]],
  };
}

// ── Implant axis from the two tilt angles ──────────────────────

/**
 * Apex direction from the arch frame and the two clinical angles.
 * BL (buccolingual) is a FULL rotation in the cross-section plane: 0 = apex
 * down (lower jaw), ±180 = apex up (upper jaw). MD (mesiodistal) then leans
 * the body along the arch tangent (visible on the panoramic).
 * Composition: rotate -Z by BL about the tangent, then by MD about the normal.
 */
export function implantAxis(frame: ArchFrame, angleBLDeg: number, angleMDDeg: number): Vec3 {
  const bl = (angleBLDeg * Math.PI) / 180;
  const md = (angleMDDeg * Math.PI) / 180;
  const sBL = Math.sin(bl), cBL = Math.cos(bl);
  const sMD = Math.sin(md), cMD = Math.cos(md);
  // In the (normal, tangent, z) local frame: [sBL, cBL·sMD, −cBL·cMD]
  const n = sBL;
  const t = cBL * sMD;
  const z = -cBL * cMD;
  return [
    n * frame.normal[0] + t * frame.tangent[0],
    n * frame.normal[1] + t * frame.tangent[1],
    z,
  ];
}

// ── Silhouette radius profile ──────────────────────────────────

/**
 * Radius multiplier along the implant (0 = platform, 1 = apex tip).
 * Matches the ImplantShape silhouette: collar, taper to 64%, rounded apex.
 */
export function radiusProfile(t01: number): number {
  if (t01 <= 0.14) return 1;
  if (t01 <= 0.90) return 1 - 0.36 * ((t01 - 0.14) / 0.76);
  const a = (t01 - 0.90) / 0.10;
  return 0.64 * Math.sqrt(Math.max(0, 1 - a * a));
}

// ── Plane intersection ─────────────────────────────────────────

export interface PlaneFrame {
  /** Plane origin in world mm */
  origin: Vec3;
  /** In-plane horizontal unit axis */
  eU: Vec3;
  /** In-plane vertical unit axis (pointing up) */
  eV: Vec3;
}

export interface ImplantBody {
  entry: Vec3;
  axis: Vec3;     // unit, toward apex
  diameter: number;
  length: number;
}

/** Project a world point onto the plane: [u, v, w] (w = out-of-plane). */
export function projectToPlane(p: Vec3, frame: PlaneFrame): [number, number, number] {
  const rel: Vec3 = [p[0] - frame.origin[0], p[1] - frame.origin[1], p[2] - frame.origin[2]];
  const n = cross3(frame.eU, frame.eV);
  return [dot3(rel, frame.eU), dot3(rel, frame.eV), dot3(rel, n)];
}

/**
 * Intersection strip of the implant body with a (thin) plane, as a closed
 * polygon in plane (u, v) coordinates. Each sample along the axis is treated
 * as a disc of the profile radius; the plane cuts a chord of half-width
 * sqrt(r² − w²) where w is the disc center's distance from the plane.
 * Returns null when the body does not reach the plane.
 */
export function implantPlaneStrip(
  body: ImplantBody,
  frame: PlaneFrame,
  samples = 24,
): [number, number][] | null {
  const n = cross3(frame.eU, frame.eV);
  const R = body.diameter / 2;

  // In-plane direction of the axis → strip width direction (perpendicular)
  const au = dot3(body.axis, frame.eU);
  const av = dot3(body.axis, frame.eV);
  const len2d = Math.hypot(au, av);
  if (len2d < 1e-4) return null; // axis ⊥ plane — no meaningful strip
  const pu = -av / len2d;
  const pv = au / len2d;

  const rel0: Vec3 = [
    body.entry[0] - frame.origin[0],
    body.entry[1] - frame.origin[1],
    body.entry[2] - frame.origin[2],
  ];
  const u0 = dot3(rel0, frame.eU);
  const v0 = dot3(rel0, frame.eV);
  const w0 = dot3(rel0, n);
  const dw = dot3(body.axis, n);

  const left: [number, number][] = [];
  const right: [number, number][] = [];
  let anyVisible = false;

  for (let i = 0; i <= samples; i++) {
    const t01 = i / samples;
    const t = t01 * body.length;
    const r = R * radiusProfile(t01);
    const w = w0 + dw * t;
    const hwSq = r * r - w * w;
    const hw = hwSq > 0 ? Math.sqrt(hwSq) : 0;
    if (hw > 0.01) anyVisible = true;

    const u = u0 + au * t;
    const v = v0 + av * t;
    left.push([u - hw * pu, v - hw * pv]);
    right.push([u + hw * pu, v + hw * pv]);
  }

  if (!anyVisible) return null;
  return [...left, ...right.reverse()];
}
