/**
 * 3D implant geometry tests: plane∩body intersection strip, apex axis from
 * the two clinical angles (full ±180° buccolingual rotation), radius profile.
 */

import { describe, it, expect } from 'vitest';
import {
  nearestArchFrame,
  archFrameAt,
  implantAxis,
  implantPlaneStrip,
  radiusProfile,
  type Vec3,
} from '../src/core/implantGeometry';
import type { Point2 } from '../src/core/cprMath';

// Plane: u along world X, v along world Z → plane normal along -Y
const frame = {
  origin: [0, 0, 0] as Vec3,
  eU: [1, 0, 0] as Vec3,
  eV: [0, 0, 1] as Vec3,
};

const D = 4, R = D / 2, L = 10;
const down: Vec3 = [0, 0, -1];

// Strip is symmetric around u=0 for a vertical axis at u=0
const maxHalfWidth = (poly: [number, number][]) => Math.max(...poly.map(p => Math.abs(p[0])));

describe('implantPlaneStrip', () => {
  it('shows the full body when the axis lies in the plane', () => {
    const strip = implantPlaneStrip({ entry: [0, 0, 0], axis: down, diameter: D, length: L }, frame);
    expect(strip).not.toBeNull();
    expect(maxHalfWidth(strip!)).toBeCloseTo(R, 2);
  });

  it('shows only the cylinder edge 1mm off-plane', () => {
    const strip = implantPlaneStrip({ entry: [0, 1, 0], axis: down, diameter: D, length: L }, frame);
    expect(strip).not.toBeNull();
    expect(maxHalfWidth(strip!)).toBeCloseTo(Math.sqrt(R * R - 1), 2);
  });

  it('disappears beyond the radius', () => {
    const strip = implantPlaneStrip({ entry: [0, R + 0.5, 0], axis: down, diameter: D, length: L }, frame);
    expect(strip).toBeNull();
  });

  it('narrows along an oblique axis leaving the plane', () => {
    const axis: Vec3 = [0, Math.sin(Math.PI / 4), -Math.cos(Math.PI / 4)]; // 45° out of plane
    const strip = implantPlaneStrip({ entry: [0, 0, 0], axis, diameter: D, length: L }, frame, 24);
    expect(strip).not.toBeNull();
    const n = strip!.length / 2;
    const wEntry = Math.abs(strip![0][0] - strip![strip!.length - 1][0]);
    const wApex = Math.abs(strip![n - 1][0] - strip![n][0]);
    expect(wEntry).toBeGreaterThan(3);
    expect(wApex).toBeLessThan(0.1);
  });
});

describe('arch frames and implant axis', () => {
  // Straight arch along +X at y=45 → tangent (1,0), normal (0,1)
  const cps: Point2[] = [[15, 45], [20, 45], [25, 45], [30, 45], [35, 45]];

  it('nearestArchFrame finds the closest curve point', () => {
    const af = nearestArchFrame(cps, [25, 47])!;
    expect(af.s).toBeCloseTo(0.5, 2);
    expect(af.normal[1]).toBeCloseTo(1, 2);
  });

  it('archFrameAt returns the frame at a normalized position', () => {
    const af = archFrameAt(cps, 0.25)!;
    expect(af.point[0]).toBeCloseTo(20, 1);
    expect(af.tangent[0]).toBeCloseTo(1, 3);
  });

  it('0/0 points straight down', () => {
    const af = nearestArchFrame(cps, [25, 45])!;
    expect(implantAxis(af, 0, 0)[2]).toBeCloseTo(-1, 6);
  });

  it('BL=30 leans the apex toward the normal', () => {
    const af = nearestArchFrame(cps, [25, 45])!;
    const a = implantAxis(af, 30, 0);
    expect(a[1]).toBeCloseTo(0.5, 2);
    expect(a[0]).toBeCloseTo(0, 6);
  });

  it('MD=-20 leans the apex against the tangent', () => {
    const af = nearestArchFrame(cps, [25, 45])!;
    const a = implantAxis(af, 0, -20);
    expect(a[0]).toBeCloseTo(-Math.sin(20 * Math.PI / 180), 2);
  });

  it('BL=±180 points straight up (upper jaw)', () => {
    const af = nearestArchFrame(cps, [25, 45])!;
    expect(implantAxis(af, 180, 0)[2]).toBeCloseTo(1, 6);
    expect(implantAxis(af, -180, 0)[2]).toBeCloseTo(1, 6);
  });

  it('axis is always unit length', () => {
    const af = nearestArchFrame(cps, [25, 45])!;
    const a = implantAxis(af, 135, 30);
    expect(Math.hypot(a[0], a[1], a[2])).toBeCloseTo(1, 9);
  });
});

describe('radiusProfile', () => {
  it('matches the silhouette: collar 1 → taper 0.64 → apex 0', () => {
    expect(radiusProfile(0)).toBe(1);
    expect(radiusProfile(0.14)).toBe(1);
    expect(radiusProfile(0.9)).toBeCloseTo(0.64, 9);
    expect(radiusProfile(1)).toBeCloseTo(0, 4);
  });
});
