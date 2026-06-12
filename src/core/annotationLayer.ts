/**
 * Measurement (Cornerstone annotation) layer helpers: global show/hide and
 * clear, used by the layers panel.
 */

import { annotation } from '@cornerstonejs/tools';
import { getRenderingEngine } from '@cornerstonejs/core';
import { RENDERING_ENGINE_ID } from './constants';

function rerenderAll(): void {
  getRenderingEngine(RENDERING_ENGINE_ID)?.render();
}

export function setMeasurementsVisible(visible: boolean): void {
  for (const a of annotation.state.getAllAnnotations()) {
    if (a.annotationUID) {
      annotation.visibility.setAnnotationVisibility(a.annotationUID, visible);
    }
  }
  rerenderAll();
}

export function clearAllMeasurements(): void {
  annotation.state.removeAllAnnotations();
  rerenderAll();
}

export function getMeasurementCount(): number {
  return annotation.state.getAllAnnotations().length;
}
