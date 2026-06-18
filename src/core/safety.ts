/**
 * Safety distance math — pure, no Cornerstone (unit-testable). Computes the
 * surface-to-surface clearance between a planned implant and traced anatomy
 * (nerve canal / sinus floor polylines) or a neighbouring implant.
 *
 * All inputs are world mm. An implant is reduced to its axis segment
 * [entry, apex] plus its maximum radius (diameter / 2); a clearance is the
 * center-line distance minus both surface radii (negative = overlap).
 */

import { dot3, type Vec3 } from './implantGeometry';

function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

/** Shortest distance from point p to the segment [a, b]. */
export function distPointToSegment3(p: Vec3, a: Vec3, b: Vec3): number {
  const ab = sub(b, a);
  const len2 = dot3(ab, ab);
  let t = len2 > 0 ? dot3(sub(p, a), ab) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  const c: Vec3 = [a[0] + ab[0] * t, a[1] + ab[1] * t, a[2] + ab[2] * t];
  return Math.hypot(p[0] - c[0], p[1] - c[1], p[2] - c[2]);
}

/**
 * Shortest distance between two segments [p1,q1] and [p2,q2].
 * Standard clamped closest-point-of-two-segments solution.
 */
export function distSegmentToSegment3(p1: Vec3, q1: Vec3, p2: Vec3, q2: Vec3): number {
  const d1 = sub(q1, p1);
  const d2 = sub(q2, p2);
  const r = sub(p1, p2);
  const a = dot3(d1, d1);
  const e = dot3(d2, d2);
  const f = dot3(d2, r);
  const EPS = 1e-9;

  let s: number;
  let t: number;
  if (a <= EPS && e <= EPS) {
    return Math.hypot(r[0], r[1], r[2]); // both degenerate → point-point
  }
  if (a <= EPS) {
    s = 0;
    t = Math.max(0, Math.min(1, f / e));
  } else {
    const c = dot3(d1, r);
    if (e <= EPS) {
      t = 0;
      s = Math.max(0, Math.min(1, -c / a));
    } else {
      const b = dot3(d1, d2);
      const denom = a * e - b * b;
      s = denom > EPS ? Math.max(0, Math.min(1, (b * f - c * e) / denom)) : 0;
      t = (b * s + f) / e;
      if (t < 0) {
        t = 0;
        s = Math.max(0, Math.min(1, -c / a));
      } else if (t > 1) {
        t = 1;
        s = Math.max(0, Math.min(1, (b - c) / a));
      }
    }
  }
  const c1: Vec3 = [p1[0] + d1[0] * s, p1[1] + d1[1] * s, p1[2] + d1[2] * s];
  const c2: Vec3 = [p2[0] + d2[0] * t, p2[1] + d2[1] * t, p2[2] + d2[2] * t];
  return Math.hypot(c1[0] - c2[0], c1[1] - c2[1], c1[2] - c2[2]);
}

/** Shortest distance between segment [a,b] and a polyline (>=1 point). */
export function distSegmentToPolyline3(a: Vec3, b: Vec3, poly: Vec3[]): number {
  if (poly.length === 0) return Infinity;
  if (poly.length === 1) return distPointToSegment3(poly[0], a, b);
  let min = Infinity;
  for (let i = 0; i < poly.length - 1; i++) {
    const d = distSegmentToSegment3(a, b, poly[i], poly[i + 1]);
    if (d < min) min = d;
  }
  return min;
}

export interface ClearanceResult {
  /** Surface-to-surface clearance in mm (negative = overlap) */
  mm: number;
  /** True if mm >= threshold */
  ok: boolean;
}

/** Implant (axis [entry,apex], radius) ↔ anatomy polyline (tube radius). */
export function markerClearance(
  entry: Vec3,
  apex: Vec3,
  implantRadius: number,
  polyline: Vec3[],
  tubeRadius: number,
  threshold: number,
): ClearanceResult {
  const center = distSegmentToPolyline3(entry, apex, polyline);
  const mm = center - implantRadius - tubeRadius;
  return { mm, ok: mm >= threshold };
}

export interface AnatomyEval {
  id: string;
  type: 'nerve' | 'sinus';
  mm: number;
  ok: boolean;
}

/**
 * Clearance of one implant (axis [entry,apex], radius) against every anatomy
 * marker, each judged vs its type threshold. `worstOk` is false if any marker
 * is violated.
 */
export function evaluateImplantAnatomy(
  entry: Vec3,
  apex: Vec3,
  implantRadius: number,
  markers: { id: string; type: 'nerve' | 'sinus'; radius: number; points: Vec3[] }[],
  thresholds: { nerve: number; sinus: number },
): { results: AnatomyEval[]; worstOk: boolean } {
  const results: AnatomyEval[] = markers.map((m) => {
    const mm = distSegmentToPolyline3(entry, apex, m.points) - implantRadius - m.radius;
    const thr = m.type === 'nerve' ? thresholds.nerve : thresholds.sinus;
    return { id: m.id, type: m.type, mm, ok: mm >= thr };
  });
  return { results, worstOk: results.every((r) => r.ok) };
}

export interface ImplantSeg {
  id: string;
  entry: Vec3;
  apex: Vec3;
  radius: number;
}

export interface ImplantSafety {
  anatomy: AnatomyEval[];
  /** Nearest neighbouring-implant clearance, or null when alone */
  neighborMm: number | null;
  neighborOk: boolean;
  worstOk: boolean;
}

/**
 * Full safety evaluation of one implant against the anatomy markers and the
 * other implants. `worstOk` is false if any clearance is below its threshold.
 */
export function evaluateImplant(
  self: ImplantSeg,
  others: ImplantSeg[],
  markers: { id: string; type: 'nerve' | 'sinus'; radius: number; points: Vec3[] }[],
  thresholds: { nerve: number; sinus: number; neighbor: number },
): ImplantSafety {
  const anatomy: AnatomyEval[] = markers.map((m) => {
    const mm = distSegmentToPolyline3(self.entry, self.apex, m.points) - self.radius - m.radius;
    const thr = m.type === 'nerve' ? thresholds.nerve : thresholds.sinus;
    return { id: m.id, type: m.type, mm, ok: mm >= thr };
  });

  let neighborMm: number | null = null;
  for (const o of others) {
    if (o.id === self.id) continue;
    const mm = distSegmentToSegment3(self.entry, self.apex, o.entry, o.apex) - self.radius - o.radius;
    if (neighborMm === null || mm < neighborMm) neighborMm = mm;
  }
  const neighborOk = neighborMm === null || neighborMm >= thresholds.neighbor;
  const worstOk = anatomy.every((a) => a.ok) && neighborOk;
  return { anatomy, neighborMm, neighborOk, worstOk };
}

/** Implant ↔ neighbouring implant (both as axis segments + radii). */
export function neighborClearance(
  entryA: Vec3,
  apexA: Vec3,
  radiusA: number,
  entryB: Vec3,
  apexB: Vec3,
  radiusB: number,
  threshold: number,
): ClearanceResult {
  const center = distSegmentToSegment3(entryA, apexA, entryB, apexB);
  const mm = center - radiusA - radiusB;
  return { mm, ok: mm >= threshold };
}
