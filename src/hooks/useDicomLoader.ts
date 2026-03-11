import { useCallback } from 'react';
import { useViewer } from '@/context/ViewerContext';
import { parseDicomFiles } from '@/core/dicomLoader';

export function useDicomLoader() {
  const { state, dispatch } = useViewer();

  const loadFiles = useCallback(
    async (files: File[]) => {
      // Filter for DICOM files (.dcm, .dicom, or no extension)
      const dicomFiles = files.filter((f) => {
        const name = f.name.toLowerCase();
        return name.endsWith('.dcm') || name.endsWith('.dicom') || !name.includes('.');
      });

      if (dicomFiles.length === 0) {
        dispatch({
          type: 'SET_ERROR',
          payload:
            'Nem található DICOM fájl. A fájloknak .dcm kiterjesztéssel vagy kiterjesztés nélkülinek kell lenniük.',
        });
        return;
      }

      dispatch({ type: 'SET_LOADING', payload: true });

      try {
        const study = await parseDicomFiles(dicomFiles, (loaded, total) => {
          dispatch({ type: 'SET_LOAD_PROGRESS', payload: { loaded, total } });
        });

        if (study) {
          dispatch({ type: 'SET_STUDY', payload: study });
        } else {
          dispatch({ type: 'SET_ERROR', payload: 'Nem sikerült a DICOM fájlok feldolgozása.' });
        }
      } catch (err) {
        dispatch({
          type: 'SET_ERROR',
          payload: `Hiba a fájlok betöltésekor: ${err instanceof Error ? err.message : String(err)}`,
        });
      }
    },
    [dispatch],
  );

  return {
    loadFiles,
    isLoading: state.isLoading,
    loadProgress: state.loadProgress,
    error: state.error,
    study: state.study,
  };
}
