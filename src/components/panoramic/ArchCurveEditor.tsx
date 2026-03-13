/**
 * SVG overlay on the axial viewport for drawing / editing the dental arch curve.
 * Shows: control points (draggable), interpolated curve, slab-width parallel lines.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { getRenderingEngine, Enums, cache } from '@cornerstonejs/core';
import { useViewer } from '@/context/ViewerContext';
import { RENDERING_ENGINE_ID, VP_AXIAL } from '@/core/constants';
import {
  interpolateArchCurve,
  computeCurveNormals,
  offsetCurve,
  generateDefaultArchCurve,
} from '@/core/archCurve';

type Point2 = [number, number];

function pointsToPath(pts: Point2[]): string {
  if (pts.length === 0) return '';
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
}

export function ArchCurveEditor() {
  const { state, dispatch } = useViewer();
  const containerRef = useRef<HTMLDivElement>(null);
  const dragIdxRef = useRef<number | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [screenData, setScreenData] = useState<{
    controlPts: Point2[];
    curvePath: string;
    innerPath: string;
    outerPath: string;
  } | null>(null);

  // Auto-generate default arch curve if none exists
  useEffect(() => {
    if (state.archCurveControlPoints || !state.volumeId) return;
    const volume = cache.getVolume(state.volumeId);
    if (!volume) {
      console.warn('[DQ-OPG] Volume not in cache yet, retrying in 500ms...');
      const t = setTimeout(() => {
        const v = cache.getVolume(state.volumeId!);
        if (!v) return;
        initCurve(v);
      }, 500);
      return () => clearTimeout(t);
    }
    initCurve(volume);

    function initCurve(v: any) {
      const o = v.origin as [number, number, number];
      const d = v.dimensions as [number, number, number];
      const s = v.spacing as [number, number, number];
      const center: Point2 = [o[0] + (d[0] * s[0]) / 2, o[1] + (d[1] * s[1]) / 2];
      const size: Point2 = [d[0] * s[0], d[1] * s[1]];
      const curve = generateDefaultArchCurve(center, size);
      console.log('[DQ-OPG] Default arch curve generated, center:', center, 'size:', size);
      dispatch({ type: 'SET_ARCH_CURVE', payload: curve });
    }
  }, [state.archCurveControlPoints, state.volumeId, dispatch]);

  // Get viewport and focal Z
  const getViewport = useCallback(() => {
    const engine = getRenderingEngine(RENDERING_ENGINE_ID);
    return engine?.getViewport(VP_AXIAL) ?? null;
  }, []);

  const getFocalZ = useCallback(() => {
    const vp = getViewport();
    if (!vp) return 0;
    const cam = vp.getCamera();
    return cam.focalPoint?.[2] ?? 0;
  }, [getViewport]);

  // Reproject world control points → screen coordinates
  const updateScreen = useCallback(() => {
    const vp = getViewport();
    if (!vp || !state.archCurveControlPoints) return;

    const wz = getFocalZ();

    const screenCPs = state.archCurveControlPoints.map(([wx, wy]) => {
      const c = vp.worldToCanvas([wx, wy, wz] as any);
      return [c[0], c[1]] as Point2;
    });

    const curveWorld = interpolateArchCurve(state.archCurveControlPoints, 20);
    const curveScreen = curveWorld.map(([wx, wy]) => {
      const c = vp.worldToCanvas([wx, wy, wz] as any);
      return [c[0], c[1]] as Point2;
    });

    const normals = computeCurveNormals(curveWorld);
    const halfSlab = state.panoramicSlabWidth / 2;
    const inner = offsetCurve(curveWorld, normals, -halfSlab);
    const outer = offsetCurve(curveWorld, normals, halfSlab);
    const innerScreen = inner.map(([wx, wy]) => {
      const c = vp.worldToCanvas([wx, wy, wz] as any);
      return [c[0], c[1]] as Point2;
    });
    const outerScreen = outer.map(([wx, wy]) => {
      const c = vp.worldToCanvas([wx, wy, wz] as any);
      return [c[0], c[1]] as Point2;
    });

    setScreenData({
      controlPts: screenCPs,
      curvePath: pointsToPath(curveScreen),
      innerPath: pointsToPath(innerScreen),
      outerPath: pointsToPath(outerScreen),
    });
  }, [state.archCurveControlPoints, state.panoramicSlabWidth, getViewport, getFocalZ]);

  // Re-render on camera changes (pan/zoom/scroll)
  useEffect(() => {
    const vp = getViewport();
    if (!vp) return;

    const el = vp.element;
    const handler = () => updateScreen();
    el.addEventListener(Enums.Events.CAMERA_MODIFIED, handler);
    updateScreen();

    return () => el.removeEventListener(Enums.Events.CAMERA_MODIFIED, handler);
  }, [updateScreen, getViewport]);

  // ── Drag interaction via window events ────────────────────────

  const handlePointerDown = useCallback((idx: number) => (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setDragIdx(idx);
    dragIdxRef.current = idx;
  }, []);

  // Window-level move & up handlers (attached when dragging)
  useEffect(() => {
    if (dragIdx === null) return;

    const handleMove = (e: PointerEvent) => {
      const idx = dragIdxRef.current;
      if (idx === null || !containerRef.current || !state.archCurveControlPoints) return;

      const vp = getViewport();
      if (!vp) return;

      const rect = containerRef.current.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const worldPos = vp.canvasToWorld([cx, cy]) as [number, number, number];

      const newPts = state.archCurveControlPoints.map((p) => [...p] as [number, number]);
      newPts[idx] = [worldPos[0], worldPos[1]];
      dispatch({ type: 'SET_ARCH_CURVE', payload: newPts });
    };

    const handleUp = () => {
      setDragIdx(null);
      dragIdxRef.current = null;
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);

    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, [dragIdx, state.archCurveControlPoints, dispatch, getViewport]);

  if (!screenData || !state.archCurveControlPoints) return null;

  return (
    <div ref={containerRef} className="absolute inset-0" style={{ zIndex: 10, pointerEvents: 'none' }}>
      <svg className="w-full h-full">
        {/* Slab width lines */}
        <path d={screenData.innerPath} fill="none" stroke="rgba(255,80,80,0.4)" strokeWidth={1} />
        <path d={screenData.outerPath} fill="none" stroke="rgba(255,80,80,0.4)" strokeWidth={1} />

        {/* Main curve */}
        <path d={screenData.curvePath} fill="none" stroke="rgba(255,80,80,0.85)" strokeWidth={2} />

        {/* Control points */}
        {screenData.controlPts.map((p, i) => (
          <circle
            key={i}
            cx={p[0]}
            cy={p[1]}
            r={7}
            fill={dragIdx === i ? 'rgb(80,200,255)' : 'rgb(50,140,255)'}
            stroke="white"
            strokeWidth={2}
            style={{ pointerEvents: 'auto', cursor: dragIdx === i ? 'grabbing' : 'grab' }}
            onPointerDown={handlePointerDown(i)}
          />
        ))}
      </svg>
    </div>
  );
}
