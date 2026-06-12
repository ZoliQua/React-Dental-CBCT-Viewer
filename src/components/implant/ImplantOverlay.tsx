/**
 * SVG overlay on the cross-section viewport for placing and editing implants.
 *
 * Implants are true 3D objects (world position + 3D apex axis). The overlay
 * always shows a "ghost" silhouette of each visible implant (fading with its
 * distance from the plane, so it stays grabbable while browsing sections) and
 * highlights the actual plane∩body intersection strip on top of it: centered
 * on the plane the highlight covers the full body, a few mm away only the
 * edge of the cylinder lights up.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useViewer } from '@/context/ViewerContext';
import { useI18n } from '@/i18n/I18nContext';
import type { ImplantData } from '@/types/dicom';
import { ImplantShape } from './ImplantShape';
import { crossSectionFrame } from '@/core/cprMath';
import {
  nearestArchFrame,
  implantAxis,
  implantPlaneStrip,
  projectToPlane,
  cross3,
  dot3,
  type Vec3,
} from '@/core/implantGeometry';

interface ImplantOverlayProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  /** Physical width of the cross-section in mm */
  widthMm: number;
  /** zMin / zMax from CPR result */
  zMin: number;
  zMax: number;
}


// ── Coordinate conversion helpers ─────────────────────────────

function getContentRect(container: HTMLElement, canvas: HTMLCanvasElement) {
  const cw = container.clientWidth;
  const ch = container.clientHeight;
  const iw = canvas.width || 1;
  const ih = canvas.height || 1;
  const s = Math.min(cw / iw, ch / ih);
  const rw = iw * s;
  const rh = ih * s;
  return { left: (cw - rw) / 2, top: (ch - rh) / 2, width: rw, height: rh };
}

export function ImplantOverlay({ containerRef, canvasRef, widthMm, zMin, zMax }: ImplantOverlayProps) {
  const { state, dispatch } = useViewer();
  const { t } = useI18n();
  const implantsRef = useRef(state.implants);
  implantsRef.current = state.implants;

  const halfW = widthMm / 2;
  const zRange = zMax - zMin;
  const zMid = (zMin + zMax) / 2;

  // World-space frame of the current cross-section plane
  const frame = useMemo(
    () => state.archCurveControlPoints
      ? crossSectionFrame(
          state.archCurveControlPoints,
          state.crossSectionPosition,
          state.crossSectionTiltDeg,
          zMin, zMax,
        )
      : null,
    [state.archCurveControlPoints, state.crossSectionPosition, state.crossSectionTiltDeg, zMin, zMax],
  );

  // ── Image (h, zImg) ↔ pixel mapping ─────────────────────────
  // h: mm from plane center horizontally; zImg: vertical image coordinate in
  // [zMin..zMax] (equals world z only at 0° tilt — it is zMid + v)

  const mmToPixel = useCallback((hMm: number, zImg: number): [number, number] | null => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return null;
    const cr = getContentRect(container, canvas);
    const normX = (hMm + halfW) / widthMm;
    const normY = (zMax - zImg) / zRange;
    return [cr.left + normX * cr.width, cr.top + normY * cr.height];
  }, [containerRef, canvasRef, halfW, widthMm, zMax, zRange]);

  const pixelToMm = useCallback((px: number, py: number): [number, number] | null => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return null;
    const cr = getContentRect(container, canvas);
    const rect = container.getBoundingClientRect();
    const lx = px - rect.left;
    const ly = py - rect.top;
    const normX = (lx - cr.left) / cr.width;
    const normY = (ly - cr.top) / cr.height;
    const hMm = normX * widthMm - halfW;
    const zImg = zMax - normY * zRange;
    return [hMm, zImg];
  }, [containerRef, canvasRef, halfW, widthMm, zMax, zRange]);

  const mmToPixelScale = useCallback((): number => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return 1;
    const cr = getContentRect(container, canvas);
    return cr.width / widthMm;
  }, [containerRef, canvasRef, widthMm]);

  const mmToPixelScaleV = useCallback((): number => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return 1;
    const cr = getContentRect(container, canvas);
    return cr.height / zRange;
  }, [containerRef, canvasRef, zRange]);

  // World point from image coords, offset by w along the plane normal
  const worldFromImage = useCallback((hMm: number, zImg: number, w = 0): Vec3 | null => {
    if (!frame) return null;
    const n = cross3(frame.eU, frame.eV);
    const v = zImg - zMid;
    return [
      frame.origin[0] + frame.eU[0] * hMm + frame.eV[0] * v + n[0] * w,
      frame.origin[1] + frame.eU[1] * hMm + frame.eV[1] * v + n[1] * w,
      frame.origin[2] + frame.eU[2] * hMm + frame.eV[2] * v + n[2] * w,
    ];
  }, [frame, zMid]);

  // ── Placement click ─────────────────────────────────────────

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (!state.implantPlacementMode) return;

    const mm = pixelToMm(e.clientX, e.clientY);
    if (!mm) return;
    const world = worldFromImage(mm[0], mm[1], 0); // place in-plane
    if (!world) return;

    const implant: ImplantData = {
      id: `imp_${Date.now()}`,
      name: t('implant.defaultName', { n: state.implants.length + 1 }),
      visible: true,
      position: world,
      diameter: 4.0,
      length: 10.0,
      angleBLDeg: 0,
      angleMDDeg: 0,
    };
    dispatch({ type: 'ADD_IMPLANT', payload: implant });
  }, [state.implantPlacementMode, state.implants.length, pixelToMm, worldFromImage, dispatch, t]);

  // ── Drag to move (preserves out-of-plane offset) ────────────

  const [dragState, setDragState] = useState<{
    id: string;
    grabOffsetMm: [number, number]; // cursor − entry, in image coords
    w0: number;                     // out-of-plane offset at grab time
  } | null>(null);

  const handleImplantPointerDown = useCallback((e: React.PointerEvent, imp: ImplantData) => {
    e.stopPropagation();
    e.preventDefault();
    dispatch({ type: 'SET_ACTIVE_IMPLANT', payload: imp.id });
    if (!frame) return;
    const [u0, v0, w0] = projectToPlane(imp.position, frame);
    const mm = pixelToMm(e.clientX, e.clientY);
    setDragState({
      id: imp.id,
      grabOffsetMm: mm ? [mm[0] - u0, mm[1] - (zMid + v0)] : [0, 0],
      w0,
    });
  }, [dispatch, frame, pixelToMm, zMid]);

  useEffect(() => {
    if (!dragState) return;

    const handleMove = (e: PointerEvent) => {
      const mm = pixelToMm(e.clientX, e.clientY);
      if (!mm) return;
      const imp = implantsRef.current.find(i => i.id === dragState.id);
      if (!imp) return;
      const world = worldFromImage(
        mm[0] - dragState.grabOffsetMm[0],
        mm[1] - dragState.grabOffsetMm[1],
        dragState.w0,
      );
      if (!world) return;
      dispatch({ type: 'UPDATE_IMPLANT', payload: { ...imp, position: world } });
    };

    const handleUp = () => setDragState(null);

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, [dragState, pixelToMm, worldFromImage, dispatch]);

  // ── Apex rotation drag (sets the buccolingual angle) ────────

  const [rotState, setRotState] = useState<string | null>(null);

  const handleApexPointerDown = useCallback((e: React.PointerEvent, imp: ImplantData) => {
    e.stopPropagation();
    e.preventDefault();
    dispatch({ type: 'SET_ACTIVE_IMPLANT', payload: imp.id });
    setRotState(imp.id);
  }, [dispatch]);

  useEffect(() => {
    if (!rotState || !frame) return;

    const handleMove = (e: PointerEvent) => {
      const imp = implantsRef.current.find(i => i.id === rotState);
      if (!imp) return;
      const mm = pixelToMm(e.clientX, e.clientY);
      if (!mm) return;
      const [u0, v0] = projectToPlane(imp.position, frame);
      const dh = mm[0] - u0;
      const dDown = (zMid + v0) - mm[1]; // image-down is positive
      if (Math.abs(dh) < 0.01 && Math.abs(dDown) < 0.01) return;
      // Full ±180° — apex can point up (upper jaw) as well as down (lower jaw)
      const bl = Math.atan2(dh, dDown) * (180 / Math.PI);
      dispatch({ type: 'UPDATE_IMPLANT', payload: { ...imp, angleBLDeg: Math.round(bl) } });
    };

    const handleUp = () => setRotState(null);

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, [rotState, frame, pixelToMm, zMid, dispatch]);

  // ── Render plane intersections ──────────────────────────────

  const controlPoints = state.archCurveControlPoints;
  const svgInteractive = state.implantPlacementMode || state.implants.length > 0;

  return (
    <svg
      className="absolute inset-0 w-full h-full"
      style={{
        pointerEvents: svgInteractive ? 'auto' : 'none',
        zIndex: 25,
        cursor: state.implantPlacementMode ? 'crosshair' : 'default',
      }}
      onMouseDown={(e) => {
        // Prevent W/L drag from starting when clicking on the SVG in placement mode
        if (state.implantPlacementMode) e.stopPropagation();
      }}
      onClick={handleClick}
    >
      {frame && controlPoints && state.implants.filter(i => i.visible).map(imp => {
        const af = nearestArchFrame(controlPoints, [imp.position[0], imp.position[1]]);
        if (!af) return null;
        const axis = implantAxis(af, imp.angleBLDeg, imp.angleMDDeg);

        const [u0, v0, w0] = projectToPlane(imp.position, frame);
        const entryPx = mmToPixel(u0, zMid + v0);
        if (!entryPx) return null;

        const scaleH = mmToPixelScale();
        const scaleV = mmToPixelScaleV();

        // In-plane projection of the axis → silhouette lean + foreshortening
        const au = dot3(axis, frame.eU);
        const av = dot3(axis, frame.eV);
        const imgAngle = Math.atan2(au, -av) * (180 / Math.PI);
        const inPlaneLen = imp.length * Math.hypot(au, av);

        // Ghost silhouette fades with the entry's distance from the plane but
        // never disappears — the implant stays findable and grabbable
        const ghostOpacity = Math.max(0.3, Math.min(1, 1 - (Math.abs(w0) - imp.diameter / 2) / 10));

        // Actual plane∩body intersection highlight
        const strip = implantPlaneStrip(
          { entry: imp.position, axis, diameter: imp.diameter, length: imp.length },
          frame,
        );
        const stripPoints = strip
          ?.map(([u, v]) => mmToPixel(u, zMid + v))
          .filter((p): p is [number, number] => p !== null)
          .map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`)
          .join(' ');

        const isActive = state.activeImplantId === imp.id;
        const color = isActive ? 'rgb(255, 200, 0)' : 'rgb(0, 180, 255)';

        const apexPx = mmToPixel(u0 + au * imp.length, zMid + v0 + av * imp.length);

        return (
          <g key={imp.id}>
            {/* Ghost: full silhouette, grabbable anywhere */}
            <ImplantShape
              x={entryPx[0]}
              y={entryPx[1]}
              widthPx={imp.diameter * scaleH}
              heightPx={inPlaneLen * scaleV}
              angleDeg={imgAngle}
              active={isActive}
              opacity={ghostOpacity}
              interactive
              onPointerDown={(e) => handleImplantPointerDown(e, imp)}
            />
            {/* What the current plane actually cuts */}
            {stripPoints && (
              <polygon
                points={stripPoints}
                fill={isActive ? 'rgba(255, 200, 0, 0.30)' : 'rgba(0, 180, 255, 0.28)'}
                stroke={color}
                strokeWidth={1.5}
                style={{ pointerEvents: 'none' }}
              />
            )}
            {/* Name + size label for the active implant */}
            {isActive && (
              <text
                x={entryPx[0] + (imp.diameter * scaleH) / 2 + 6}
                y={entryPx[1]}
                fill="rgb(255, 200, 0)"
                fontSize={10}
                fontFamily="monospace"
                style={{ pointerEvents: 'none', userSelect: 'none' }}
              >
                {imp.name} · ⌀{imp.diameter} × {imp.length}mm
              </text>
            )}
            {/* Apex rotation handle — full 360° */}
            {isActive && apexPx && (
              <circle
                cx={apexPx[0]}
                cy={apexPx[1]}
                r={6}
                fill={rotState === imp.id ? 'rgb(255, 220, 80)' : 'rgba(255, 200, 0, 0.85)'}
                stroke="white"
                strokeWidth={1.5}
                style={{ pointerEvents: 'auto', cursor: 'grab' }}
                onPointerDown={(e) => handleApexPointerDown(e, imp)}
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}

