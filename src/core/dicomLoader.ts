import dicomParser from 'dicom-parser';
import type { DicomSeriesInfo, DicomStudyInfo } from '@/types/dicom';

interface ParsedDicomFile {
  imageId: string;
  seriesInstanceUID: string;
  studyInstanceUID: string;
  instanceNumber: number;
  sliceLocation: number;
  ippZ: number; // ImagePositionPatient Z coordinate
  seriesDescription: string;
  seriesNumber: number;
  modality: string;
  patientName: string;
  patientId: string;
  patientBirthDate: string;
  studyDescription: string;
  studyDate: string;
  institution: string;
}

const utf8Decoder = new TextDecoder('utf-8');

/**
 * Read a DICOM string, respecting SpecificCharacterSet.
 * dicom-parser decodes bytes as Latin-1 by default, which garbles
 * multi-byte encodings like UTF-8 (ISO_IR 192).  When the dataset
 * uses UTF-8 we re-decode the raw bytes with TextDecoder.
 */
function getString(dataSet: dicomParser.DataSet, tag: string, isUtf8 = false): string {
  if (isUtf8) {
    const el = dataSet.elements[tag];
    if (!el || el.length === 0) return '';
    const bytes = new Uint8Array(dataSet.byteArray.buffer, dataSet.byteArray.byteOffset + el.dataOffset, el.length);
    return utf8Decoder.decode(bytes).trim();
  }
  const value = dataSet.string(tag);
  return value ? value.trim() : '';
}

function getInt(dataSet: dicomParser.DataSet, tag: string, fallback = 0): number {
  const value = dataSet.intString(tag);
  return value !== undefined ? value : fallback;
}

function getFloat(dataSet: dicomParser.DataSet, tag: string, fallback = 0): number {
  const value = dataSet.floatString(tag);
  return value !== undefined ? value : fallback;
}

function getIPPz(dataSet: dicomParser.DataSet): number {
  const ipp = dataSet.string('x00200032'); // ImagePositionPatient
  if (!ipp) return 0;
  const parts = ipp.split('\\');
  return parts.length >= 3 ? parseFloat(parts[2]) : 0;
}

export async function parseDicomFiles(
  files: File[],
  onProgress?: (loaded: number, total: number) => void,
): Promise<DicomStudyInfo | null> {
  const parsed: ParsedDicomFile[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    onProgress?.(i, files.length);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const byteArray = new Uint8Array(arrayBuffer);
      const dataSet = dicomParser.parseDicom(byteArray);

      // Create blob URL for cornerstone wadouri loader
      const blob = new Blob([byteArray], { type: 'application/dicom' });
      const url = URL.createObjectURL(blob);
      const imageId = `wadouri:${url}`;

      // Check character set — ISO_IR 192 = UTF-8
      const charset = dataSet.string('x00080005') || '';
      const utf8 = charset.indexOf('ISO_IR 192') !== -1;

      parsed.push({
        imageId,
        seriesInstanceUID: getString(dataSet, 'x0020000e'),
        studyInstanceUID: getString(dataSet, 'x0020000d'),
        instanceNumber: getInt(dataSet, 'x00200013'),
        sliceLocation: getFloat(dataSet, 'x00201041'),
        ippZ: getIPPz(dataSet),
        seriesDescription: getString(dataSet, 'x0008103e', utf8),
        seriesNumber: getInt(dataSet, 'x00200011'),
        modality: getString(dataSet, 'x00080060'),
        patientName: getString(dataSet, 'x00100010', utf8),
        patientId: getString(dataSet, 'x00100020'),
        patientBirthDate: getString(dataSet, 'x00100030'),
        studyDescription: getString(dataSet, 'x00081030', utf8),
        studyDate: getString(dataSet, 'x00080020'),
        institution: getString(dataSet, 'x00080080', utf8),
      });
    } catch (err) {
      console.warn(`[DQ-DICOM] Skipping ${file.name}:`, err);
    }
  }

  onProgress?.(files.length, files.length);

  if (parsed.length === 0) return null;

  // Group by SeriesInstanceUID
  const seriesMap = new Map<string, ParsedDicomFile[]>();
  for (const p of parsed) {
    const key = p.seriesInstanceUID || 'unknown';
    if (!seriesMap.has(key)) seriesMap.set(key, []);
    seriesMap.get(key)!.push(p);
  }

  // Build series list, sort images within each series
  const series: DicomSeriesInfo[] = [];
  for (const [uid, items] of seriesMap) {
    items.sort((a, b) => {
      // Prefer ImagePositionPatient Z, then SliceLocation, then InstanceNumber
      if (a.ippZ !== b.ippZ) return a.ippZ - b.ippZ;
      if (a.sliceLocation !== b.sliceLocation) return a.sliceLocation - b.sliceLocation;
      return a.instanceNumber - b.instanceNumber;
    });

    series.push({
      seriesInstanceUID: uid,
      seriesDescription: items[0].seriesDescription || `Series #${items[0].seriesNumber}`,
      seriesNumber: items[0].seriesNumber,
      modality: items[0].modality,
      imageCount: items.length,
      imageIds: items.map((i) => i.imageId),
    });
  }

  series.sort((a, b) => a.seriesNumber - b.seriesNumber);

  const first = parsed[0];
  return {
    studyInstanceUID: first.studyInstanceUID,
    studyDescription: first.studyDescription,
    studyDate: first.studyDate,
    patientName: first.patientName.replace(/\^/g, ' '),
    patientId: first.patientId,
    patientBirthDate: first.patientBirthDate,
    institution: first.institution,
    series,
  };
}
