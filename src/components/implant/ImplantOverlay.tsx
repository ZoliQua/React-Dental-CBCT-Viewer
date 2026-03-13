/**
 * SVG overlay on the cross-section viewport for placing and editing implants.
 * An implant is rendered as a tapered rectangle (frustum) representing the cylindrical body.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useViewer } from '@/context/ViewerContext';
import type { ImplantData } from '@/types/dicom';
import { IMPLANT_DIAMETERS, IMPLANT_LENGTHS } from '@/types/dicom';

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
  const [dragState, setDragState] = useState<{ id: string; startMm: [number, number] } | null>(null);
  const implantsRef = useRef(state.implants);
  implantsRef.current = state.implants;

  const halfW = widthMm / 2;
  const zRange = zMax - zMin;

  // Convert mm position to SVG pixel coordinates within the content rect
  const mmToPixel = useCallback((hMm: number, zMm: number): [number, number] | null => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return null;
    const cr = getContentRect(container, canvas);
    const normX = (hMm + halfW) / widthMm;
    const normY = (zMax - zMm) / zRange;
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
    const zMm = zMax - normY * zRange;
    return [hMm, zMm];
  }, [containerRef, canvasRef, halfW, widthMm, zMax, zRange]);

  // mm distance to pixel distance (horizontal)
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

  // ── Placement click ─────────────────────────────────────────

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (!state.implantPlacementMode) return;

    const mm = pixelToMm(e.clientX, e.clientY);
    if (!mm) return;

    const implant: ImplantData = {
      id: `imp_${Date.now()}`,
      positionMm: [mm[0], mm[1]],
      diameter: 4.0,
      length: 10.0,
      angleDeg: 0,
      curvePosition: state.crossSectionPosition,
    };
    dispatch({ type: 'ADD_IMPLANT', payload: implant });
  }, [state.implantPlacementMode, state.crossSectionPosition, pixelToMm, dispatch]);

  // ── Drag to move implant ────────────────────────────────────

  const handleImplantPointerDown = useCallback((e: React.PointerEvent, imp: ImplantData) => {
    e.stopPropagation();
    e.preventDefault();
    dispatch({ type: 'SET_ACTIVE_IMPLANT', payload: imp.id });
    setDragState({ id: imp.id, startMm: [...imp.positionMm] });
  }, [dispatch]);

  useEffect(() => {
    if (!dragState) return;

    const handleMove = (e: PointerEvent) => {
      const mm = pixelToMm(e.clientX, e.clientY);
      if (!mm) return;
      const imp = implantsRef.current.find(i => i.id === dragState.id);
      if (!imp) return;
      dispatch({ type: 'UPDATE_IMPLANT', payload: { ...imp, positionMm: [mm[0], mm[1]] } });
    };

    const handleUp = () => setDragState(null);

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, [dragState, pixelToMm, dispatch]);

  // ── Render implants at the current cross-section position ───

  // Show implants that belong to the current curve position (within tolerance)
  const visibleImplants = state.implants.filter(imp =>
    Math.abs(imp.curvePosition - state.crossSectionPosition) < 0.02
  );

  const svgInteractive = state.implantPlacementMode || visibleImplants.length > 0;

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
      {visibleImplants.map(imp => {
        const top = mmToPixel(imp.positionMm[0], imp.positionMm[1]);
        if (!top) return null;

        const scaleH = mmToPixelScale();
        const scaleV = mmToPixelScaleV();
        const w = imp.diameter * scaleH;
        const h = imp.length * scaleV;
        const isActive = state.activeImplantId === imp.id;

        // Implant body: rectangle from entry point downward
        // The entry point (positionMm) is the top of the implant
        const cx = top[0];
        const cy = top[1];

        return (
          <g
            key={imp.id}
            transform={`rotate(${imp.angleDeg}, ${cx}, ${cy})`}
            style={{ pointerEvents: 'auto', cursor: 'move' }}
            onPointerDown={(e) => handleImplantPointerDown(e, imp)}
          >
            {/* Implant body */}
            <rect
              x={cx - w / 2}
              y={cy}
              width={w}
              height={h}
              rx={w / 2}
              fill={isActive ? 'rgba(255, 200, 0, 0.35)' : 'rgba(0, 180, 255, 0.3)'}
              stroke={isActive ? 'rgb(255, 200, 0)' : 'rgb(0, 180, 255)'}
              strokeWidth={1.5}
            />
            {/* Entry point marker */}
            <circle
              cx={cx}
              cy={cy}
              r={3}
              fill={isActive ? 'rgb(255, 200, 0)' : 'rgb(0, 180, 255)'}
            />
            {/* Tip marker */}
            <circle
              cx={cx}
              cy={cy + h}
              r={2}
              fill={isActive ? 'rgb(255, 200, 0)' : 'rgb(0, 180, 255)'}
            />
            {/* Size label */}
            <text
              x={cx + w / 2 + 4}
              y={cy + h / 2}
              fill={isActive ? 'rgb(255, 200, 0)' : 'rgb(100, 200, 255)'}
              fontSize={10}
              fontFamily="monospace"
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              ⌀{imp.diameter} × {imp.length}mm
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Implant properties panel ──────────────────────────────────

export function ImplantPropertiesPanel() {
  const { state, dispatch } = useViewer();
  const activeImplant = state.implants.find(i => i.id === state.activeImplantId);

  if (!activeImplant) return null;

  const update = (partial: Partial<ImplantData>) => {
    dispatch({ type: 'UPDATE_IMPLANT', payload: { ...activeImplant, ...partial } });
  };

  return (
    <div className="flex items-center gap-2">
      <div className="w-px h-6 bg-gray-600" />
      <span className="text-xs text-dental-400 font-bold select-none">Implantátum</span>

      <label className="text-[10px] text-gray-400 select-none">⌀</label>
      <select
        value={activeImplant.diameter}
        onChange={(e) => update({ diameter: Number(e.target.value) })}
        className="bg-gray-700 text-gray-300 text-xs rounded px-1 py-0.5 border border-gray-600"
      >
        {IMPLANT_DIAMETERS.map(d => (
          <option key={d} value={d}>{d} mm</option>
        ))}
      </select>

      <label className="text-[10px] text-gray-400 select-none">H</label>
      <select
        value={activeImplant.length}
        onChange={(e) => update({ length: Number(e.target.value) })}
        className="bg-gray-700 text-gray-300 text-xs rounded px-1 py-0.5 border border-gray-600"
      >
        {IMPLANT_LENGTHS.map(l => (
          <option key={l} value={l}>{l} mm</option>
        ))}
      </select>

      <label className="text-[10px] text-gray-400 select-none">Szög</label>
      <input
        type="range"
        min={-30}
        max={30}
        step={1}
        value={activeImplant.angleDeg}
        onChange={(e) => update({ angleDeg: Number(e.target.value) })}
        className="w-16 h-1 accent-dental-400"
      />
      <span className="text-[10px] text-gray-300 font-mono w-6">{activeImplant.angleDeg}°</span>

      <button
        onClick={() => dispatch({ type: 'REMOVE_IMPLANT', payload: activeImplant.id })}
        className="px-2 py-0.5 text-xs bg-gray-700 text-red-400 hover:bg-red-700 hover:text-white rounded transition-colors"
      >
        Törlés
      </button>
    </div>
  );
}
