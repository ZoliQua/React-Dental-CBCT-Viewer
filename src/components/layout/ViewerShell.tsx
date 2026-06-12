import { useEffect, useRef, useState } from 'react';
import { RenderingEngine, eventTarget } from '@cornerstonejs/core';
import { Enums as csToolsEnums } from '@cornerstonejs/tools';
import { Toolbar } from './Toolbar';
import { SeriesList } from '@/components/dicom/SeriesList';
import { ViewportGrid } from '@/components/viewport/ViewportGrid';
import { LayersPanel } from '@/components/layers/LayersPanel';
import { useViewer } from '@/context/ViewerContext';
import { useI18n } from '@/i18n/I18nContext';
import { setupTools } from '@/core/toolManager';
import { createVolume } from '@/core/volumeBuilder';
import { CS_TOOL_KEYS } from '@/core/annotationLayer';
import { RENDERING_ENGINE_ID } from '@/core/constants';

export function ViewerShell() {
  const { state, dispatch } = useViewer();
  const { t } = useI18n();
  const measurementsRef = useRef(state.measurements);
  measurementsRef.current = state.measurements;
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

  // Every completed Cornerstone measurement becomes its own layer
  useEffect(() => {
    const handler = (evt: Event) => {
      const ann = (evt as CustomEvent).detail?.annotation;
      const uid = ann?.annotationUID;
      const toolKey = CS_TOOL_KEYS[ann?.metadata?.toolName as string];
      if (!uid || !toolKey) return;
      if (measurementsRef.current.some(m => m.id === uid)) return;
      const sameTool = measurementsRef.current.filter(m => m.tool === toolKey).length;
      dispatch({
        type: 'ADD_MEASUREMENT',
        payload: {
          id: uid,
          kind: 'annotation',
          tool: toolKey,
          name: `${t(`tool.${toolKey}`)} ${sameTool + 1}`,
          visible: true,
        },
      });
    };
    eventTarget.addEventListener(csToolsEnums.Events.ANNOTATION_COMPLETED, handler);
    return () => eventTarget.removeEventListener(csToolsEnums.Events.ANNOTATION_COMPLETED, handler);
  }, [dispatch, t]);

  // Build volume for MPR/3D views (always needed since default viewMode is AXIAL)
  const needsVolume = true;
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
    <div className="flex flex-col h-full w-full bg-gray-100 dark:bg-gray-900">
      <Toolbar />
      <div className="flex flex-1 overflow-hidden">
        {hasSeries && (
          <div className="w-56 bg-white border-r border-gray-300 dark:bg-gray-800 dark:border-gray-700 overflow-y-auto">
            <SeriesList />
          </div>
        )}
        <div className="flex-1 relative overflow-hidden">
          {engineReady ? (
            <ViewportGrid />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="w-8 h-8 border-4 border-dental-400 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          <LayersPanel />
        </div>
      </div>
    </div>
  );
}
