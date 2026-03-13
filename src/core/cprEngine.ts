/**
 * CPR (Curved Planar Reformation) engine.
 * Generates a panoramic (OPG-like) 2D image from a CT volume
 * by sampling voxels along an arch curve.
 */

import { cache, type Types } from '@cornerstonejs/core';
import { interpolateArchCurve, computeCurveNormals, totalArcLength, resampleByArcLength } from './archCurve';
import type { ProjectionMode } from '@/types/dicom';

type Point2 = [number, number];

export interface CPRResult {
  pixelData: Float32Array;
  width: number;
  height: number;
  horizontalSpacing: number;
  verticalSpacing: number;
  zMin: number;
  zMax: number;
}

export interface CPRParams {
  volumeId: string;
  controlPoints: Point2[];
  slabWidth: number;
  projection: ProjectionMode;
  resolution: number; // mm per pixel along the curve
}

// ── Trilinear interpolation ────────────────────────────────────

function trilinear(
  getVoxel: (i: number, j: number, k: number) => number,
  dims: [number, number, number],
  ci: number, cj: number, ck: number,
): number {
  const i0 = Math.floor(ci), j0 = Math.floor(cj), k0 = Math.floor(ck);
  const i1 = i0 + 1, j1 = j0 + 1, k1 = k0 + 1;

  if (i0 < 0 || i1 >= dims[0] || j0 < 0 || j1 >= dims[1] || k0 < 0 || k1 >= dims[2]) {
    return -1024;
  }

  const fi = ci - i0, fj = cj - j0, fk = ck - k0;
  const nfi = 1 - fi, nfj = 1 - fj, nfk = 1 - fk;

  return (
    getVoxel(i0, j0, k0) * nfi * nfj * nfk +
    getVoxel(i1, j0, k0) * fi  * nfj * nfk +
    getVoxel(i0, j1, k0) * nfi * fj  * nfk +
    getVoxel(i1, j1, k0) * fi  * fj  * nfk +
    getVoxel(i0, j0, k1) * nfi * nfj * fk  +
    getVoxel(i1, j0, k1) * fi  * nfj * fk  +
    getVoxel(i0, j1, k1) * nfi * fj  * fk  +
    getVoxel(i1, j1, k1) * fi  * fj  * fk
  );
}

// ── Helpers ────────────────────────────────────────────────────

function getVolumeData(volumeId: string) {
  const volume = cache.getVolume(volumeId) as Types.IImageVolume | undefined;
  if (!volume?.voxelManager) return null;

  const dims = volume.dimensions as [number, number, number];
  const spacing = volume.spacing as [number, number, number];
  const origin = volume.origin as [number, number, number];
  const vm = volume.voxelManager;
  const getVoxel = (i: number, j: number, k: number) => vm.getAtIJK(i, j, k) as number;

  const z0 = origin[2];
  const z1 = origin[2] + (dims[2] - 1) * spacing[2];

  return {
    dims, spacing, origin, getVoxel,
    invSx: 1 / spacing[0],
    invSy: 1 / spacing[1],
    invSz: 1 / spacing[2],
    zMin: Math.min(z0, z1),
    zMax: Math.max(z0, z1),
    vSpacing: Math.abs(spacing[2]),
  };
}

/**
 * Build a dense, arc-length-uniform curve with normals from control points.
 * Used by both panoramic and cross-section generation.
 */
function buildUniformCurve(controlPoints: Point2[], numSamples: number) {
  // First: dense CatmullRom interpolation (high enough to be smooth)
  const numSegments = Math.max(1, controlPoints.length - 1);
  const subsPerSeg = Math.max(10, Math.ceil(numSamples / numSegments) * 2);
  const rawCurve = interpolateArchCurve(controlPoints, subsPerSeg);

  // Then: resample uniformly by arc length → no distortion from uneven CP spacing
  const curve = resampleByArcLength(rawCurve, numSamples);
  const normals = computeCurveNormals(curve);
  const arcLen = totalArcLength(curve);

  return { curve, normals, arcLen };
}

// ── Main CPR function ──────────────────────────────────────────

export function generatePanoramic(params: CPRParams): CPRResult | null {
  const vol = getVolumeData(params.volumeId);
  if (!vol) {
    console.warn('[DQ-CPR] Volume not found:', params.volumeId);
    return null;
  }

  // Estimate arc length to determine sample count
  const roughCurve = interpolateArchCurve(params.controlPoints, 10);
  const arcEstimate = totalArcLength(roughCurve);
  const targetWidth = Math.max(50, Math.round(arcEstimate / params.resolution));

  const { curve, normals, arcLen } = buildUniformCurve(params.controlPoints, targetWidth);
  if (curve.length < 2) return null;

  const width = curve.length;
  const height = Math.max(1, Math.round((vol.zMax - vol.zMin) / vol.vSpacing));
  const hSpacing = arcLen / Math.max(1, width - 1);

  // Slab sampling
  const halfSlab = params.slabWidth / 2;
  const SLAB_STEP_MM = 1.0;
  const numSlab = Math.max(1, Math.round(params.slabWidth / SLAB_STEP_MM));
  const isMIP = params.projection === 'MIP';

  console.time('[DQ-CPR] Panoramic generation');

  const pixelData = new Float32Array(width * height);

  for (let x = 0; x < width; x++) {
    const [cx, cy] = curve[x];
    const [nx, ny] = normals[x];

    for (let y = 0; y < height; y++) {
      const wz = vol.zMax - y * vol.vSpacing;

      if (numSlab <= 1) {
        const ci = (cx - vol.origin[0]) * vol.invSx;
        const cj = (cy - vol.origin[1]) * vol.invSy;
        const ck = (wz - vol.origin[2]) * vol.invSz;
        pixelData[y * width + x] = trilinear(vol.getVoxel, vol.dims, ci, cj, ck);
      } else {
        let acc = isMIP ? -Infinity : 0;
        for (let s = 0; s < numSlab; s++) {
          const offset = -halfSlab + (s / (numSlab - 1)) * params.slabWidth;
          const wx = cx + nx * offset;
          const wy = cy + ny * offset;
          const ci = (wx - vol.origin[0]) * vol.invSx;
          const cj = (wy - vol.origin[1]) * vol.invSy;
          const ck = (wz - vol.origin[2]) * vol.invSz;
          const val = trilinear(vol.getVoxel, vol.dims, ci, cj, ck);
          if (isMIP) { if (val > acc) acc = val; }
          else { acc += val; }
        }
        if (!isMIP) acc /= numSlab;
        pixelData[y * width + x] = acc;
      }
    }
  }

  console.timeEnd('[DQ-CPR] Panoramic generation');
  console.log(`[DQ-CPR] Output: ${width}x${height}, slab=${numSlab} samples, arc=${arcLen.toFixed(1)}mm`);

  return { pixelData, width, height, horizontalSpacing: hSpacing, verticalSpacing: vol.vSpacing, zMin: vol.zMin, zMax: vol.zMax };
}

// ── Cross-section (perpendicular slice at a point on the arch) ─

export interface CrossSectionParams {
  volumeId: string;
  controlPoints: Point2[];
  position: number;   // 0-1 normalized along the arch curve
  tiltDeg: number;    // degrees rotation of sampling direction in XY
  widthMm: number;    // total width of cross-section in mm
  resolution: number; // mm per pixel
}

export type CrossSectionResult = CPRResult;

export function generateCrossSection(params: CrossSectionParams): CrossSectionResult | null {
  const vol = getVolumeData(params.volumeId);
  if (!vol) return null;

  // Build uniform curve with high density for accurate position lookup
  const { curve, normals } = buildUniformCurve(params.controlPoints, 500);
  if (curve.length < 2) return null;

  // Position is uniform by arc length, so direct index lookup works
  const idx = Math.round(Math.max(0, Math.min(1, params.position)) * (curve.length - 1));
  const point = curve[idx];
  const normal = normals[idx];

  // Apply tilt rotation in XY plane (negate to match visual convention)
  const tiltRad = (-params.tiltDeg * Math.PI) / 180;
  const cosT = Math.cos(tiltRad);
  const sinT = Math.sin(tiltRad);
  const dir: Point2 = [
    normal[0] * cosT - normal[1] * sinT,
    normal[0] * sinT + normal[1] * cosT,
  ];

  // Output dimensions
  const halfW = params.widthMm / 2;
  const width = Math.max(1, Math.round(params.widthMm / params.resolution));
  const height = Math.max(1, Math.round((vol.zMax - vol.zMin) / vol.vSpacing));
  const hSpacing = params.widthMm / Math.max(1, width - 1);

  const pixelData = new Float32Array(width * height);

  for (let x = 0; x < width; x++) {
    const offset = -halfW + x * hSpacing;
    const wx = point[0] + dir[0] * offset;
    const wy = point[1] + dir[1] * offset;

    for (let y = 0; y < height; y++) {
      const wz = vol.zMax - y * vol.vSpacing;
      const ci = (wx - vol.origin[0]) * vol.invSx;
      const cj = (wy - vol.origin[1]) * vol.invSy;
      const ck = (wz - vol.origin[2]) * vol.invSz;
      pixelData[y * width + x] = trilinear(vol.getVoxel, vol.dims, ci, cj, ck);
    }
  }

  return { pixelData, width, height, horizontalSpacing: hSpacing, verticalSpacing: vol.vSpacing, zMin: vol.zMin, zMax: vol.zMax };
}
