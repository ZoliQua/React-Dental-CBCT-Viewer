import { useEffect, useRef, useCallback } from 'react';
import { getRenderingEngine, Enums } from '@cornerstonejs/core';
import { useViewer } from '@/context/ViewerContext';
import { setupTools, addViewportToToolGroup } from '@/core/toolManager';
import { RENDERING_ENGINE_ID, VIEWPORT_ID } from '@/core/constants';
import { ORIENTATION_LABELS } from '@/types/dicom';
import { ViewportOverlay } from './ViewportOverlay';
import { SliceIndicator } from './SliceIndicator';

export function Viewport2D() {
  const { state, dispatch } = useViewer();
  const elementRef = useRef<HTMLDivElement>(null);
  const enabledRef = useRef(false);
  const destroyedRef = useRef(false);

  const handleResize = useCallback(() => {
    const engine = getRenderingEngine(RENDERING_ENGINE_ID);
    engine?.resize(true, false);
  }, []);

  // Enable the viewport element
  useEffect(() => {
    const element = elementRef.current;
    const engine = getRenderingEngine(RENDERING_ENGINE_ID);
    if (!element || !engine) return;

    destroyedRef.current = false;
    setupTools();

    engine.enableElement({
      viewportId: VIEWPORT_ID,
      type: Enums.ViewportType.STACK,
      element,
    });
    addViewportToToolGroup(VIEWPORT_ID, RENDERING_ENGINE_ID);
    enabledRef.current = true;

    const rafId = requestAnimationFrame(() => {
      if (!destroyedRef.current) {
        engine.resize(true, false);
      }
    });

    // Track slice index changes
    const onStackNewImage = (evt: Event) => {
      const detail = (evt as CustomEvent).detail;
      if (detail?.imageIdIndex !== undefined) {
        const vp = engine.getStackViewports().find((v) => v.id === VIEWPORT_ID);
        const total = vp?.getImageIds()?.length ?? 0;
        dispatch({ type: 'SET_SLICE_INFO', payload: { index: detail.imageIdIndex, total } });
      }
    };
    element.addEventListener(Enums.Events.STACK_NEW_IMAGE, onStackNewImage);

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(element);

    return () => {
      destroyedRef.current = true;
      cancelAnimationFrame(rafId);
      element.removeEventListener(Enums.Events.STACK_NEW_IMAGE, onStackNewImage);
      resizeObserver.disconnect();
      if (enabledRef.current) {
        try {
          engine.disableElement(VIEWPORT_ID);
        } catch {
          // engine may already be destroyed
        }
        enabledRef.current = false;
      }
    };
  }, [state.isInitialized, handleResize, dispatch]);

  // Load images when active series changes
  useEffect(() => {
    if (!state.study || !state.activeSeriesUID) return;

    const engine = getRenderingEngine(RENDERING_ENGINE_ID);
    if (!engine || !enabledRef.current) return;

    const series = state.study.series.find(
      (s) => s.seriesInstanceUID === state.activeSeriesUID,
    );
    if (!series || series.imageIds.length === 0) return;

    const viewport = engine.getStackViewports().find(
      (vp) => vp.id === VIEWPORT_ID,
    );
    if (!viewport) return;

    let cancelled = false;

    async function loadSeries() {
      try {
        console.log('[DQ-DICOM] Loading series:', series!.imageIds.length, 'images');
        await viewport!.setStack(series!.imageIds);
        if (cancelled || destroyedRef.current) return;
        const middleIndex = Math.floor(series!.imageIds.length / 2);
        viewport!.setImageIdIndex(middleIndex);
        dispatch({ type: 'SET_SLICE_INFO', payload: { index: middleIndex, total: series!.imageIds.length } });
        engine!.resize(true, false);
        viewport!.render();
        console.log('[DQ-DICOM] Series loaded, showing slice', middleIndex);
      } catch (err) {
        if (!cancelled && !destroyedRef.current) {
          console.error('[DQ-DICOM] Failed to load series:', err);
        }
      }
    }

    loadSeries();

    return () => {
      cancelled = true;
    };
  }, [state.study, state.activeSeriesUID, dispatch]);

  const handleJumpToSlice = useCallback((index: number) => {
    const engine = getRenderingEngine(RENDERING_ENGINE_ID);
    if (!engine) return;
    const viewport = engine.getStackViewports().find((vp) => vp.id === VIEWPORT_ID);
    if (!viewport) return;
    viewport.setImageIdIndex(index);
    viewport.render();
  }, []);

  return (
    <div className="relative w-full h-full bg-black">
      <div
        ref={elementRef}
        className="w-full h-full"
        onContextMenu={(e) => e.preventDefault()}
      />
      <ViewportOverlay />
      {state.viewMode !== '3D' && (
        <div className="absolute top-1 left-1/2 -translate-x-1/2 text-yellow-400 text-xs font-mono font-bold pointer-events-none select-none [text-shadow:_0_1px_2px_rgb(0_0_0_/_80%)]">
          {ORIENTATION_LABELS[state.viewMode]}
        </div>
      )}
      {state.totalSlices > 1 && (
        <SliceIndicator onJumpToSlice={handleJumpToSlice} />
      )}
    </div>
  );
}
