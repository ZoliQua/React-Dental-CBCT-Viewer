/**
 * Safety distance math: point/segment/polyline distances and surface-to-surface
 * implant clearances to anatomy and neighbouring implants.
 */

import { describe, it, expect } from 'vitest';
import {
  distPointToSegment3,
  distSegmentToSegment3,
  distSegmentToPolyline3,
  markerClearance,
  neighborClearance,
  evaluateImplant,
} from '../src/core/safety';
import type { Vec3 } from '../src/core/implantGeometry';

describe('distPointToSegment3', () => {
  const a: Vec3 = [0, 0, 0];
  const b: Vec3 = [10, 0, 0];
  it('perpendicular foot inside the segment', () => {
    expect(distPointToSegment3([5, 3, 0], a, b)).toBeCloseTo(3, 6);
  });
  it('clamps to the nearer endpoint', () => {
    expect(distPointToSegment3([-4, 3, 0], a, b)).toBeCloseTo(5, 6); // hypot(4,3)
  });
});

describe('distSegmentToSegment3', () => {
  it('parallel offset segments', () => {
    const d = distSegmentToSegment3([0, 0, 0], [10, 0, 0], [0, 4, 0], [10, 4, 0]);
    expect(d).toBeCloseTo(4, 6);
  });
  it('crossing (skew) segments separated in Z', () => {
    const d = distSegmentToSegment3([-5, 0, 0], [5, 0, 0], [0, -5, 2], [0, 5, 2]);
    expect(d).toBeCloseTo(2, 6);
  });
  it('zero when they intersect', () => {
    const d = distSegmentToSegment3([-5, 0, 0], [5, 0, 0], [0, -5, 0], [0, 5, 0]);
    expect(d).toBeCloseTo(0, 6);
  });
});

describe('distSegmentToPolyline3', () => {
  const poly: Vec3[] = [[0, 5, 0], [10, 5, 0], [20, 8, 0]];
  it('min over polyline segments', () => {
    const d = distSegmentToPolyline3([0, 0, 0], [10, 0, 0], poly);
    expect(d).toBeCloseTo(5, 6);
  });
  it('single-point polyline falls back to point distance', () => {
    expect(distSegmentToPolyline3([0, 0, 0], [10, 0, 0], [[5, 3, 0]])).toBeCloseTo(3, 6);
  });
});

describe('markerClearance (surface-to-surface vs threshold)', () => {
  // Implant axis vertical at origin (radius 2), nerve polyline 6 mm away (radius 1.5)
  const entry: Vec3 = [0, 0, 0];
  const apex: Vec3 = [0, 0, -10];
  const nerve: Vec3[] = [[6, 0, -5], [6, 0, -15]];
  it('reports center distance minus both radii', () => {
    const r = markerClearance(entry, apex, 2, nerve, 1.5, 2);
    expect(r.mm).toBeCloseTo(6 - 2 - 1.5, 6); // 2.5 mm
    expect(r.ok).toBe(true); // 2.5 >= 2
  });
  it('flags a violation below threshold', () => {
    const r = markerClearance(entry, apex, 2, [[4, 0, -5], [4, 0, -15]], 1.5, 2);
    expect(r.mm).toBeCloseTo(0.5, 6);
    expect(r.ok).toBe(false);
  });
  it('negative clearance on overlap', () => {
    const r = markerClearance(entry, apex, 2, [[2, 0, -5], [2, 0, -15]], 1.5, 2);
    expect(r.mm).toBeLessThan(0);
    expect(r.ok).toBe(false);
  });
});

describe('evaluateImplant (anatomy + neighbor)', () => {
  const self = { id: 'a', entry: [0, 0, 0] as Vec3, apex: [0, 0, -10] as Vec3, radius: 2 };
  const nerve = { id: 'n', type: 'nerve' as const, radius: 1.5, points: [[6, 0, -5], [6, 0, -15]] as Vec3[] };
  const thr = { nerve: 2, sinus: 1, neighbor: 3 };

  it('all clear with no neighbours and a safe nerve', () => {
    const r = evaluateImplant(self, [self], [nerve], thr);
    expect(r.neighborMm).toBeNull();
    expect(r.anatomy[0].ok).toBe(true);
    expect(r.worstOk).toBe(true);
  });

  it('flags a too-close neighbour', () => {
    const other = { id: 'b', entry: [4, 0, 0] as Vec3, apex: [4, 0, -10] as Vec3, radius: 2 };
    const r = evaluateImplant(self, [self, other], [nerve], thr);
    expect(r.neighborMm).toBeCloseTo(0, 6); // 4 - 2 - 2
    expect(r.neighborOk).toBe(false);
    expect(r.worstOk).toBe(false);
  });
});

describe('neighborClearance', () => {
  it('two parallel implants 5 mm apart, radius 2 each', () => {
    const r = neighborClearance([0, 0, 0], [0, 0, -10], 2, [5, 0, 0], [5, 0, -10], 2, 3);
    expect(r.mm).toBeCloseTo(1, 6); // 5 - 2 - 2
    expect(r.ok).toBe(false); // 1 < 3
  });
});
