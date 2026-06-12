/**
 * PDF export: captures the panoramic and cross-section canvases (when
 * present) into an A4 report with patient info, planned implants and
 * measurements — all in the current UI language.
 */

import { jsPDF } from 'jspdf';
import type { DicomStudyInfo, ImplantData, MeasurementLayer } from '@/types/dicom';

interface PdfExportOptions {
  t: (key: string, params?: Record<string, string | number>) => string;
  study: DicomStudyInfo | null;
  implants: ImplantData[];
  measurements: MeasurementLayer[];
  lang: string;
}

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 14;

export function exportViewPdf({ t, study, implants, measurements, lang }: PdfExportOptions): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  let y = MARGIN;

  const pageBreak = (needed: number) => {
    if (y + needed > PAGE_H - MARGIN) {
      doc.addPage();
      y = MARGIN;
    }
  };

  // Header
  doc.setFontSize(16);
  doc.text(t('app.title'), MARGIN, y);
  y += 6;
  doc.setFontSize(9);
  doc.setTextColor(110);
  doc.text(t('pdf.description'), MARGIN, y);
  y += 8;
  doc.setTextColor(0);

  // Meta
  doc.setFontSize(10);
  doc.text(`${t('pdf.date')}: ${new Date().toLocaleDateString(lang)}`, MARGIN, y);
  y += 5;
  if (study) {
    doc.text(`${t('pdf.patient')}: ${study.patientName || '-'}${study.patientId ? ` (${study.patientId})` : ''}`, MARGIN, y);
    y += 5;
    if (study.institution) {
      doc.text(study.institution, MARGIN, y);
      y += 5;
    }
  }
  y += 3;

  // View captures
  const addCanvas = (selector: string, title: string) => {
    const canvas = document.querySelector(selector) as HTMLCanvasElement | null;
    if (!canvas || canvas.width === 0 || canvas.height === 0) return;
    const wMm = PAGE_W - 2 * MARGIN;
    const hMm = (wMm * canvas.height) / canvas.width;
    pageBreak(hMm + 10);
    doc.setFontSize(11);
    doc.text(title, MARGIN, y);
    y += 4;
    doc.addImage(canvas.toDataURL('image/png'), 'PNG', MARGIN, y, wMm, hMm);
    y += hMm + 6;
  };

  addCanvas('[data-panoramic-canvas]', t('viewport.panorama'));
  addCanvas('[data-crosssection-canvas]', t('viewport.crossSection'));

  // Implants
  if (implants.length > 0) {
    pageBreak(12);
    doc.setFontSize(12);
    doc.text(t('pdf.implantsTitle'), MARGIN, y);
    y += 5.5;
    doc.setFontSize(9);
    for (const imp of implants) {
      pageBreak(5);
      doc.text(
        `• ${imp.name} — Ø${imp.diameter} × ${imp.length} mm, B-L ${imp.angleBLDeg}°, M-D ${imp.angleMDDeg}°`,
        MARGIN + 2, y,
      );
      y += 4.5;
    }
    y += 3;
  }

  // Measurements
  if (measurements.length > 0) {
    pageBreak(12);
    doc.setFontSize(12);
    doc.text(t('pdf.measurementsTitle'), MARGIN, y);
    y += 5.5;
    doc.setFontSize(9);
    for (const m of measurements) {
      pageBreak(5);
      doc.text(`• ${m.name}${m.value ? ` — ${m.value}` : ''}`, MARGIN + 2, y);
      y += 4.5;
    }
  }

  doc.save(`dental_report_${new Date().toISOString().slice(0, 10)}.pdf`);
}
