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
  name: string;
  windowCenter: number;
  windowWidth: number;
}

export const WL_PRESETS: WindowLevelPreset[] = [
  { name: 'Csont', windowCenter: 300, windowWidth: 1500 },
  { name: 'Lágyrész', windowCenter: 40, windowWidth: 400 },
  { name: 'Tüdő', windowCenter: -600, windowWidth: 1500 },
  { name: 'Agy', windowCenter: 40, windowWidth: 80 },
  { name: 'Fogászat', windowCenter: 500, windowWidth: 3000 },
  { name: 'Implantátum', windowCenter: 1000, windowWidth: 4000 },
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

export const ORIENTATION_LABELS: Record<MPROrientation, string> = {
  AXIAL: 'Axiális',
  SAGITTAL: 'Szagittális',
  CORONAL: 'Koronális',
};

// ── Implant planning ──────────────────────────────────────────

export interface ImplantData {
  id: string;
  /** World position of the implant tip (entry point into bone) in mm */
  positionMm: [number, number]; // [horizontal offset from curve center, Z]
  /** Diameter in mm (typical: 3.0–6.0) */
  diameter: number;
  /** Length in mm (typical: 6.0–16.0) */
  length: number;
  /** Angle in degrees from vertical (0 = straight down, positive = tilted right) */
  angleDeg: number;
  /** Arch curve position (0-1) where this implant belongs */
  curvePosition: number;
}

export const IMPLANT_DIAMETERS = [3.0, 3.3, 3.5, 3.75, 4.0, 4.2, 4.5, 5.0, 5.5, 6.0];
export const IMPLANT_LENGTHS = [6.0, 7.0, 8.0, 8.5, 9.0, 10.0, 11.0, 11.5, 12.0, 13.0, 14.0, 15.0, 16.0];

export type Volume3DPreset = 'CT-Bone' | 'CT-Bones' | 'CT-Coronary-Arteries-3' | 'CT-MIP';

export const VOLUME_3D_PRESETS: { id: Volume3DPreset; label: string }[] = [
  { id: 'CT-Bone', label: 'Csont' },
  { id: 'CT-Bones', label: 'Csont (kontrasztos)' },
  { id: 'CT-Coronary-Arteries-3', label: 'Fogászat' },
  { id: 'CT-MIP', label: 'MIP' },
];
