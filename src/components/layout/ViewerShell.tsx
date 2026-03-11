import { useEffect, useRef, useState } from 'react';
import { RenderingEngine } from '@cornerstonejs/core';
import { Toolbar } from './Toolbar';
import { SeriesList } from '@/components/dicom/SeriesList';
import { ViewportGrid } from '@/components/viewport/ViewportGrid';
import { useViewer } from '@/context/ViewerContext';
import { setupTools } from '@/core/toolManager';
import { createVolume } from '@/core/volumeBuilder';
import { RENDERING_ENGINE_ID } from '@/core/constants';

export function ViewerShell() {
  const { state, dispatch } = useViewer();
  const hasSeries = state.study && state.study.series.length > 1;
  const renderingEngineRef = useRef<RenderingEngine | null>(null);
  const buildingVolumeRef = useRef(false);
  const [engineReady, setEngineReady] = useState(false);

  // Create a shared rendering engine BEFORE children mount
  useEffect(() => {
    if (!state.isInitialized) return;

    setupTools();
    const engine = new RenderingEngine(RENDERING_ENGINE_ID);
    renderingEngineRef.current = engine;
    setEngineReady(true);

    return () => {
      engine.destroy();
      renderingEngineRef.current = null;
      setEngineReady(false);
    };
  }, [state.isInitialized]);

  // Build volume when switching to MPR layout or selecting an MPR orientation in 1x1
  const needsVolume = state.layoutMode !== '1x1' || state.mprOrientation !== null;
  useEffect(() => {
    if (
      !needsVolume ||
      state.volumeId ||
      !state.activeSeriesUID ||
      !state.study ||
      buildingVolumeRef.current
    ) {
      return;
    }

    const series = state.study.series.find(
      (s) => s.seriesInstanceUID === state.activeSeriesUID,
    );
    if (!series || series.imageIds.length < 3) return;

    buildingVolumeRef.current = true;

    createVolume(series.imageIds)
      .then((volumeId) => {
        buildingVolumeRef.current = false;
        dispatch({ type: 'SET_VOLUME_ID', payload: volumeId });
        console.log('[DQ-DICOM] Volume created:', volumeId);
      })
      .catch((err) => {
        buildingVolumeRef.current = false;
        console.error('[DQ-DICOM] Volume creation failed:', err);
      });
  }, [needsVolume, state.activeSeriesUID, state.study, state.volumeId, dispatch]);

  return (
    <div className="flex flex-col h-screen w-screen bg-gray-900">
      <Toolbar />
      <div className="flex flex-1 overflow-hidden">
        {hasSeries && (
          <div className="w-56 bg-gray-800 border-r border-gray-700 overflow-y-auto">
            <SeriesList />
          </div>
        )}
        <div className="flex-1">
          {engineReady ? (
            <ViewportGrid />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="w-8 h-8 border-4 border-dental-400 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
