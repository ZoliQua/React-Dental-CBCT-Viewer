import { useEffect, useCallback } from 'react';
import { ViewerProvider, useViewer } from '@/context/ViewerContext';
import { initCornerstone } from '@/core/init';
import { setActiveTool } from '@/core/toolManager';
import { FileDropZone } from '@/components/dicom/FileDropZone';
import { ViewerShell } from '@/components/layout/ViewerShell';
import type { ViewportTool } from '@/types/dicom';

const SHORTCUT_MAP: Record<string, ViewportTool> = {
  w: 'windowLevel',
  p: 'pan',
  z: 'zoom',
  s: 'scroll',
  l: 'length',
  a: 'angle',
  e: 'ellipticalRoi',
  b: 'bidirectional',
  h: 'probe',
  n: 'arrowAnnotate',
  x: 'crosshairs',
};

function ViewerApp() {
  const { state, dispatch } = useViewer();

  // Keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const tool = SHORTCUT_MAP[e.key.toLowerCase()];
      if (tool) {
        setActiveTool(tool);
        dispatch({ type: 'SET_ACTIVE_TOOL', payload: tool });
      }
    },
    [dispatch],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    initCornerstone()
      .then(() => {
        dispatch({ type: 'SET_INITIALIZED' });
      })
      .catch((err) => {
        dispatch({
          type: 'SET_ERROR',
          payload: `Cornerstone inicializálási hiba: ${err instanceof Error ? err.message : String(err)}`,
        });
      });
  }, [dispatch]);

  if (!state.isInitialized) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-dental-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">DICOM Viewer inicializálás...</p>
        </div>
      </div>
    );
  }

  if (state.error && !state.study) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center max-w-md">
          <p className="text-red-400 mb-4">{state.error}</p>
          <button
            onClick={() => dispatch({ type: 'SET_ERROR', payload: null })}
            className="px-4 py-2 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors"
          >
            Újrapróbálás
          </button>
        </div>
      </div>
    );
  }

  if (!state.study) {
    return <FileDropZone />;
  }

  return <ViewerShell />;
}

// Props interface for future DentalQuoteCreator integration
export interface DicomViewerProps {
  patientId?: string;
  patientName?: string;
  onPlanSaved?: (plan: unknown) => void;
  embedded?: boolean;
}

export default function DicomViewer(_props: DicomViewerProps = {}) {
  return (
    <ViewerProvider>
      <ViewerApp />
    </ViewerProvider>
  );
}
