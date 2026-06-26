/**
 * Bone quality: Misch D1–D5 classification and mean-HU sampling along the
 * implant. The sampling test uses a linear voxel field (trilinear is exact for
 * linear fields), so the mean HU has a closed-form value.
 */

import { describe, it, expect } from 'vitest';
import { classifyBone, sampleImplantBoneHU } from '../src/core/boneQuality';
import type { VolumeSamplingData } from '../src/core/cprMath';
import type { Vec3 } from '../src/core/implantGeometry';

describe('classifyBone (Misch HU ranges)', () => {
  it('maps HU to D1–D5 at the boundaries', () => {
    expect(classifyBone(1400)).toBe('D1');
    expect(classifyBone(1000)).toBe('D2');
    expect(classifyBone(850)).toBe('D2');
    expect(classifyBone(500)).toBe('D3');
    expect(classifyBone(200)).toBe('D4');
    expect(classifyBone(50)).toBe('D5');
  });
});

// Voxel value = linear in Z: HU = 100 + 10 * k  (k = voxel index along Z)
function linearVolume(): VolumeSamplingData {
  return {
    dims: [50, 50, 50],
    origin: [0, 0, 0],
    getVoxel: (_i, _j, k) => 100 + 10 * k,
    invSx: 1, invSy: 1, invSz: 1, // 1 mm spacing
    zMin: 0, zMax: 49, vSpacing: 1,
  };
}

describe('sampleImplantBoneHU', () => {
  it('averages to the midpoint HU of a vertical implant in a linear field', () => {
    const vol = linearVolume();
    // Vertical implant from z=10 to z=30, centered laterally → mean HU at z=20
    const entry: Vec3 = [25, 25, 10];
    const apex: Vec3 = [25, 25, 30];
    const r = sampleImplantBoneHU(vol, entry, apex, 4)!;
    expect(r).not.toBeNull();
    // HU = 100 + 10*z; radial offsets are in the XY plane (z unchanged), so the
    // mean over a symmetric axial sweep is the value at the mid Z (20) → 300.
    expect(r.meanHU).toBeCloseTo(300, 4);
    expect(r.bone).toBe('D4'); // 300 HU is Misch D4 (150–350)
    expect(r.samples).toBeGreaterThan(0);
  });

  it('returns null when the implant is entirely outside the volume', () => {
    const vol = linearVolume();
    const r = sampleImplantBoneHU(vol, [200, 200, 200], [200, 200, 210], 4);
    expect(r).toBeNull();
  });
});
