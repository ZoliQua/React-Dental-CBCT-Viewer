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
  | 'bidirectional'
  | 'arrowAnnotate'
  | 'probe'
  | 'crosshairs';

export type LayoutMode = '1x1' | '2x2' | '1+3';

export type MPROrientation = 'AXIAL' | 'SAGITTAL' | 'CORONAL';

export const ORIENTATION_LABELS: Record<MPROrientation, string> = {
  AXIAL: 'Axiális',
  SAGITTAL: 'Szagittális',
  CORONAL: 'Koronális',
};
