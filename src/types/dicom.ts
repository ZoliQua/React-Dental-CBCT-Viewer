export interface DicomSeriesInfo {
  seriesInstanceUID: string;
  seriesDescription: string;
  seriesNumber: number;
  modality: string;
  imageCount: number;
  imageIds: string[];
}

export interface DicomStudyInfo {
  studyInstanceUID: string;
  studyDescription: string;
  studyDate: string;
  patientName: string;
  patientId: string;
  patientBirthDate: string;
  institution: string;
  series: DicomSeriesInfo[];
}

export interface WindowLevelPreset {
  /** Translation key suffix (preset.<key>) */
  key: string;
  windowCenter: number;
  windowWidth: number;
}

export const WL_PRESETS: WindowLevelPreset[] = [
  { key: 'bone', windowCenter: 300, windowWidth: 1500 },
  { key: 'soft', windowCenter: 40, windowWidth: 400 },
  { key: 'lung', windowCenter: -600, windowWidth: 1500 },
  { key: 'brain', windowCenter: 40, windowWidth: 80 },
  { key: 'dental', windowCenter: 500, windowWidth: 3000 },
  { key: 'implant', windowCenter: 1000, windowWidth: 4000 },
];

export type ViewportTool =
  | 'windowLevel'
  | 'pan'
  | 'zoom'
  | 'scroll'
  | 'length'
  | 'angle'
  | 'ellipticalRoi'
  | 'circleRoi'
  | 'rectangleRoi'
  | 'freehandRoi'
  | 'bidirectional'
  | 'arrowAnnotate'
  | 'probe'
  | 'crosshairs';

export type LayoutMode = '1x1' | '2x2' | '1+3' | 'OPG' | 'OPG2+1';

export type ProjectionMode = 'AVG' | 'MIP';

export type MPROrientation = 'AXIAL' | 'SAGITTAL' | 'CORONAL';

export type ViewMode = MPROrientation | '3D';

/** Translation keys per view mode (use with t()) */
export const VIEW_LABEL_KEYS: Record<ViewMode, string> = {
  AXIAL: 'view.axial',
  SAGITTAL: 'view.sagittal',
  CORONAL: 'view.coronal',
  '3D': 'view.3d',
};

// ── Implant planning ──────────────────────────────────────────

export interface ImplantData {
  id: string;
  /** Layer name shown in the layers panel */
  name: string;
  /** Layer visibility */
  visible: boolean;
  /** Entry point (platform center) in world coordinates, mm */
  position: [number, number, number];
  /** Diameter in mm (typical: 3.0–6.0) */
  diameter: number;
  /** Length in mm (typical: 6.0–16.0) */
  length: number;
  /**
   * Buccolingual apex rotation in degrees, in the cross-section plane.
   * Full ±180° range: 0 = apex down (lower jaw), ±180 = apex up (upper jaw).
   */
  angleBLDeg: number;
  /** Mesiodistal apex tilt in degrees (lean along the arch, visible on the panoramic) */
  angleMDDeg: number;
}

/** One measurement shown as its own layer in the layers panel */
export interface MeasurementLayer {
  /** Cornerstone annotationUID or generated id for canvas measurements */
  id: string;
  /** 'annotation' = Cornerstone tool on MPR views; 'canvas' = drawn on panoramic/cross-section */
  kind: 'annotation' | 'canvas';
  /** Tool key suffix for tool.<key> translation */
  tool: string;
  name: string;
  visible: boolean;
  /** Canvas measurements: which custom viewport they belong to */
  viewport?: 'panoramic' | 'crossSection';
  /** Canvas measurements: points in normalized image coords (0-1) */
  points?: [number, number][];
  /** Formatted measured value (mm, °, HU) */
  value?: string;
}

export const IMPLANT_DIAMETERS = [3.0, 3.3, 3.5, 3.75, 4.0, 4.2, 4.5, 5.0, 5.5, 6.0];
export const IMPLANT_LENGTHS = [6.0, 7.0, 8.0, 8.5, 9.0, 10.0, 11.0, 11.5, 12.0, 13.0, 14.0, 15.0, 16.0];

export type Volume3DPreset = 'CT-Bone' | 'CT-Bones' | 'CT-Coronary-Arteries-3' | 'CT-MIP';

export const VOLUME_3D_PRESETS: { id: Volume3DPreset; labelKey: string }[] = [
  { id: 'CT-Bone', labelKey: 'preset3d.bone' },
  { id: 'CT-Bones', labelKey: 'preset3d.bones' },
  { id: 'CT-Coronary-Arteries-3', labelKey: 'preset3d.dental' },
  { id: 'CT-MIP', labelKey: 'preset3d.mip' },
];
