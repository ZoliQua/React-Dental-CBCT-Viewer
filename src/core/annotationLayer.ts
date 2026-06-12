/**
 * Cornerstone annotation helpers: per-annotation visibility and removal, plus
 * mapping Cornerstone tool names to our translation tool keys.
 */

import { annotation } from '@cornerstonejs/tools';
import { getRenderingEngine } from '@cornerstonejs/core';
import { RENDERING_ENGINE_ID } from './constants';

function rerenderAll(): void {
  getRenderingEngine(RENDERING_ENGINE_ID)?.render();
}

export function setAnnotationVisible(annotationUID: string, visible: boolean): void {
  annotation.visibility.setAnnotationVisibility(annotationUID, visible);
  rerenderAll();
}

export function removeAnnotationByUid(annotationUID: string): void {
  annotation.state.removeAnnotation(annotationUID);
  rerenderAll();
}

/** Cornerstone toolName → tool.<key> translation key suffix */
export const CS_TOOL_KEYS: Record<string, string> = {
  Length: 'length',
  Angle: 'angle',
  EllipticalROI: 'ellipse',
  CircleROI: 'circle',
  RectangleROI: 'rectangle',
  PlanarFreehandROI: 'freehand',
  Bidirectional: 'bidirectional',
  Probe: 'probe',
  ArrowAnnotate: 'arrow',
};
