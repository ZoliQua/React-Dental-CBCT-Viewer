import { useEffect, useRef, useCallback, useState } from 'react';
import { getRenderingEngine, Enums } from '@cornerstonejs/core';
import { useViewer } from '@/context/ViewerContext';
import { generatePanoramic, type CPRResult } from '@/core/cprEngine';
import { RENDERING_ENGINE_ID, VP_AXIAL } from '@/core/constants';
import { ImplantShape } from '@/components/implant/ImplantShape';
import { nearestArchFrame, archFrameAt, implantAxis } from '@/core/implantGeometry';

interface ViewportPanoramicProps {
  volumeId: string;
  showCrossSectionLine?: boolean;
}

// ── Canvas W/L rendering ───────────────────────────────────────

function renderToCanvas(
  canvas: HTMLCanvasElement,
  pixelData: Int16Array | Float32Array,
  srcW: number,
  srcH: number,
  hSpacing: number,
  vSpacing: number,
  wc: number,
  ww: number,
) {
  const physW = srcW * hSpacing;
  const physH = srcH * vSpacing;
  const maxPx = 1024;
  const pxPerMm = maxPx / Math.max(physW, physH);
  const dstW = Math.round(physW * pxPerMm);
  const dstH = Math.round(physH * pxPerMm);

  canvas.width = dstW;
  canvas.height = dstH;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const imgData = ctx.createImageData(dstW, dstH);
  const rgba = imgData.data;
  const lower = wc - ww / 2;
  const scale = 255 / ww;
  const xRatio = (srcW - 1) / Math.max(1, dstW - 1);
  const yRatio = (srcH - 1) / Math.max(1, dstH - 1);

  for (let dy = 0; dy < dstH; dy++) {
    const sy = dy * yRatio;
    const sy0 = Math.floor(sy);
    const sy1 = Math.min(sy0 + 1, srcH - 1);
    const fy = sy - sy0;
    for (let dx = 0; dx < dstW; dx++) {
      const sx = dx * xRatio;
      const sx0 = Math.floor(sx);
      const sx1 = Math.min(sx0 + 1, srcW - 1);
      const fx = sx - sx0;
      const v00 = pixelData[sy0 * srcW + sx0];
      const v10 = pixelData[sy0 * srcW + sx1];
      const v01 = pixelData[sy1 * srcW + sx0];
      const v11 = pixelData[sy1 * srcW + sx1];
      const hu = v00 * (1 - fx) * (1 - fy) + v10 * fx * (1 - fy)
               + v01 * (1 - fx) * fy + v11 * fx * fy;
      const gray = Math.max(0, Math.min(255, (hu - lower) * scale));
      const j = (dy * dstW + dx) << 2;
      rgba[j] = gray;
      rgba[j + 1] = gray;
      rgba[j + 2] = gray;
      rgba[j + 3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);
}

// ── Compute rendered content rect inside object-fit:contain ───

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

// ── Component ──────────────────────────────────────────────────

export function ViewportPanoramic({ volumeId, showCrossSectionLine = false }: ViewportPanoramicProps) {
  const { state, dispatch } = useViewer();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const resultRef = useRef<CPRResult | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [computing, setComputing] = useState(false);
  const [wc, setWc] = useState(300);
  const [ww, setWw] = useState(2500);
  const wcRef = useRef(300);
  const wwRef = useRef(2500);

  // Keep refs in sync for use in debounced callbacks
  wcRef.current = wc;
  wwRef.current = ww;

  // Horizontal Z indicator line state
  const [axialZ, setAxialZ] = useState<number | null>(null);
  const [hLineTop, setHLineTop] = useState<number | null>(null);
  const [hLineDragging, setHLineDragging] = useState(false);

  // Vertical cross-section line state
  const [vLineLeft, setVLineLeft] = useState<number | null>(null);
  const [vLineDragging, setVLineDragging] = useState(false);
  const [tiltDragging, setTiltDragging] = useState(false);

  // W/L mouse drag state
  const wlDragRef = useRef<{ startX: number; startY: number; startWc: number; startWw: number } | null>(null);

  // Implant drag state (position editing on the panoramic)
  const implantsRef = useRef(state.implants);
  implantsRef.current = state.implants;
  const [implantDrag, setImplantDrag] = useState<{ id: string; offsetPx: [number, number] } | null>(null);

  // Render current result with current W/L
  const renderCurrent = useCallback(() => {
    const r = resultRef.current;
    const canvas = canvasRef.current;
    if (!r || !canvas) return;
    renderToCanvas(canvas, r.pixelData, r.width, r.height, r.horizontalSpacing, r.verticalSpacing, wc, ww);
  }, [wc, ww]);

  useEffect(() => { renderCurrent(); }, [renderCurrent]);

  // Generate panoramic (debounced)
  useEffect(() => {
    if (!volumeId || !state.archCurveControlPoints) return;

    setComputing(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const debounceMs = state.panoramicResolution <= 0.3 ? 400 : 250;
    debounceRef.current = setTimeout(() => {
      const result = generatePanoramic({
        volumeId,
        controlPoints: state.archCurveControlPoints!,
        slabWidth: state.panoramicSlabWidth,
        projection: state.panoramicProjection,
        resolution: state.panoramicResolution,
      });

      if (result) {
        resultRef.current = result;
        const canvas = canvasRef.current;
        if (canvas) {
          renderToCanvas(canvas, result.pixelData, result.width, result.height, result.horizontalSpacing, result.verticalSpacing, wcRef.current, wwRef.current);
        }
        console.log(`[DQ-OPG] Rendered ${result.width}x${result.height}`);
      }
      setComputing(false);
    }, debounceMs);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [volumeId, state.archCurveControlPoints, state.panoramicSlabWidth, state.panoramicProjection, state.panoramicResolution]);

  // ── Z ↔ container Y mapping ─────────────────────────────────

  const zToContainerY = useCallback((z: number): number | null => {
    const r = resultRef.current;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!r || !canvas || !container) return null;
    const normY = (r.zMax - z) / (r.zMax - r.zMin);
    if (normY < 0 || normY > 1) return null;
    const cr = getContentRect(container, canvas);
    return cr.top + normY * cr.height;
  }, []);

  const containerYToZ = useCallback((clientY: number): number | null => {
    const r = resultRef.current;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!r || !canvas || !container) return null;
    const rect = container.getBoundingClientRect();
    const localY = clientY - rect.top;
    const cr = getContentRect(container, canvas);
    const normY = Math.max(0, Math.min(1, (localY - cr.top) / cr.height));
    return r.zMax - normY * (r.zMax - r.zMin);
  }, []);

  // ── Position ↔ container X mapping (for cross-section line) ─

  const positionToContainerX = useCallback((pos: number): number | null => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return null;
    const cr = getContentRect(container, canvas);
    return cr.left + pos * cr.width;
  }, []);

  const containerXToPosition = useCallback((clientX: number): number => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return 0.5;
    const rect = container.getBoundingClientRect();
    const localX = clientX - rect.left;
    const cr = getContentRect(container, canvas);
    return Math.max(0, Math.min(1, (localX - cr.left) / cr.width));
  }, []);

  // ── Track axial viewport Z ──────────────────────────────────

  const updateHLineFromZ = useCallback((z: number) => {
    setAxialZ(z);
    setHLineTop(zToContainerY(z));
  }, [zToContainerY]);

  useEffect(() => {
    const engine = getRenderingEngine(RENDERING_ENGINE_ID);
    const vp = engine?.getViewport(VP_AXIAL);
    if (!vp) return;
    const handler = () => {
      const z = vp.getCamera().focalPoint?.[2] ?? 0;
      updateHLineFromZ(z);
    };
    handler();
    const el = vp.element;
    el.addEventListener(Enums.Events.CAMERA_MODIFIED, handler);
    return () => el.removeEventListener(Enums.Events.CAMERA_MODIFIED, handler);
  }, [updateHLineFromZ]);

  // Update line positions after CPR recompute
  useEffect(() => {
    if (axialZ !== null) setHLineTop(zToContainerY(axialZ));
    setVLineLeft(positionToContainerX(state.crossSectionPosition));
  }, [computing, axialZ, zToContainerY, positionToContainerX, state.crossSectionPosition]);

  // ── Set axial viewport Z ────────────────────────────────────

  const setAxialSliceZ = useCallback((z: number) => {
    const engine = getRenderingEngine(RENDERING_ENGINE_ID);
    const vp = engine?.getViewport(VP_AXIAL);
    if (!vp) return;
    const cam = vp.getCamera();
    const fp = cam.focalPoint!;
    const pos = cam.position!;
    const dz = z - fp[2];
    vp.setCamera({
      focalPoint: [fp[0], fp[1], z] as any,
      position: [pos[0], pos[1], pos[2] + dz] as any,
    });
    vp.render();
    updateHLineFromZ(z);
  }, [updateHLineFromZ]);

  // ── Horizontal line drag ────────────────────────────────────

  const handleHLinePointerDown = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setHLineDragging(true);
  }, []);

  useEffect(() => {
    if (!hLineDragging) return;
    const handleMove = (e: PointerEvent) => {
      const z = containerYToZ(e.clientY);
      if (z !== null) setAxialSliceZ(z);
    };
    const handleUp = () => setHLineDragging(false);
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, [hLineDragging, containerYToZ, setAxialSliceZ]);

  // ── Vertical cross-section line drag ────────────────────────

  // Offset between the cursor and the line's CENTER X at grab time. The line
  // is tilted, so grabbing it away from its vertical middle (or anywhere in
  // the 14px-wide hit stroke) must not snap the center under the cursor.
  const vLineGrabOffsetRef = useRef(0);

  const handleVLinePointerDown = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const container = containerRef.current;
    if (container && vLineLeft !== null) {
      const rect = container.getBoundingClientRect();
      vLineGrabOffsetRef.current = e.clientX - (rect.left + vLineLeft);
    } else {
      vLineGrabOffsetRef.current = 0;
    }
    setVLineDragging(true);
  }, [vLineLeft]);

  useEffect(() => {
    if (!vLineDragging) return;
    const handleMove = (e: PointerEvent) => {
      const pos = containerXToPosition(e.clientX - vLineGrabOffsetRef.current);
      dispatch({ type: 'SET_CROSS_SECTION_POSITION', payload: pos });
      setVLineLeft(positionToContainerX(pos));
    };
    const handleUp = () => setVLineDragging(false);
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, [vLineDragging, containerXToPosition, positionToContainerX, dispatch]);

  // ── Tilt drag (handle dots at line ends) ─────────────────────

  const handleTiltPointerDown = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setTiltDragging(true);
  }, []);

  useEffect(() => {
    if (!tiltDragging) return;
    const handleMove = (e: PointerEvent) => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container || vLineLeft === null) return;

      const rect = container.getBoundingClientRect();
      const cr = getContentRect(container, canvas);
      const centerX = vLineLeft;
      const centerY = cr.top + cr.height / 2;
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const dx = mx - centerX;
      const dy = -(my - centerY); // flip Y for math coords
      const angleDeg = Math.atan2(dx, dy) * (180 / Math.PI);
      const clamped = Math.max(-30, Math.min(30, angleDeg));
      dispatch({ type: 'SET_CROSS_SECTION_TILT', payload: Math.round(clamped) });
    };
    const handleUp = () => setTiltDragging(false);
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, [tiltDragging, vLineLeft, dispatch]);

  // Update vLine position when crossSectionPosition changes from external source
  useEffect(() => {
    setVLineLeft(positionToContainerX(state.crossSectionPosition));
  }, [state.crossSectionPosition, positionToContainerX]);

  // ── Implant drag on the panoramic ───────────────────────────
  // Moves the implant along the arch (X) and vertically (Z), preserving its
  // buccolingual offset from the arch curve.

  useEffect(() => {
    if (!implantDrag) return;
    const controlPoints = state.archCurveControlPoints;
    if (!controlPoints) return;

    const handleMove = (e: PointerEvent) => {
      const imp = implantsRef.current.find(i => i.id === implantDrag.id);
      if (!imp) return;
      const s = containerXToPosition(e.clientX - implantDrag.offsetPx[0]);
      const z = containerYToZ(e.clientY - implantDrag.offsetPx[1]);
      if (z === null) return;
      const af = archFrameAt(controlPoints, s);
      if (!af) return;
      // Preserve the current buccolingual offset from the curve
      const afCur = nearestArchFrame(controlPoints, [imp.position[0], imp.position[1]]);
      const w0 = afCur
        ? (imp.position[0] - afCur.point[0]) * afCur.normal[0]
          + (imp.position[1] - afCur.point[1]) * afCur.normal[1]
        : 0;
      const pos: [number, number, number] = [
        af.point[0] + af.normal[0] * w0,
        af.point[1] + af.normal[1] * w0,
        z,
      ];
      dispatch({ type: 'UPDATE_IMPLANT', payload: { ...imp, position: pos } });
    };
    const handleUp = () => setImplantDrag(null);

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, [implantDrag, state.archCurveControlPoints, containerXToPosition, containerYToZ, dispatch]);

  // ── W/L pointer interaction ─────────────────────────────────

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    wlDragRef.current = { startX: e.clientX, startY: e.clientY, startWc: wc, startWw: ww };
  }, [wc, ww]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const d = wlDragRef.current;
    if (!d) return;
    setWw(Math.max(1, d.startWw + (e.clientX - d.startX) * 5));
    setWc(d.startWc + (e.clientY - d.startY) * 5);
  }, []);

  const handlePointerUp = useCallback(() => { wlDragRef.current = null; }, []);

  // ── Tilted line geometry for SVG ────────────────────────────

  const getVLineSVGPoints = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || vLineLeft === null) return null;
    const cr = getContentRect(container, canvas);
    const cx = vLineLeft;
    const cy = cr.top + cr.height / 2;
    const halfH = cr.height / 2;
    const tiltRad = (state.crossSectionTiltDeg * Math.PI) / 180;
    return {
      x1: cx + Math.sin(tiltRad) * halfH,
      y1: cy - Math.cos(tiltRad) * halfH,
      x2: cx - Math.sin(tiltRad) * halfH,
      y2: cy + Math.cos(tiltRad) * halfH,
    };
  }, [vLineLeft, state.crossSectionTiltDeg]);

  const vLinePts = showCrossSectionLine ? getVLineSVGPoints() : null;

  // Implant sections on the panoramic: X from the implant's nearest arch
  // position, Y from its world z, mesiodistal lean shown in-plane, and a
  // depth fade by how far the implant sits from the arch surface relative to
  // the panoramic slab. Draggable: moves the implant along the arch and in Z.
  const renderImplants = () => {
    if (state.implants.length === 0 || !state.archCurveControlPoints) return null;
    const r = resultRef.current;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!r || !canvas || !container) return null;
    const cr = getContentRect(container, canvas);
    const pxPerMm = cr.height / (r.zMax - r.zMin);
    const halfSlab = Math.max(1, state.panoramicSlabWidth / 2);

    return (
      <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none', zIndex: 22 }}>
        {state.implants.filter(i => i.visible).map(imp => {
          const af = nearestArchFrame(state.archCurveControlPoints!, [imp.position[0], imp.position[1]]);
          if (!af) return null;
          const x = positionToContainerX(af.s);
          const y = zToContainerY(imp.position[2]);
          if (x === null || y === null) return null;

          const axis = implantAxis(af, imp.angleBLDeg, imp.angleMDDeg);
          // Panoramic in-plane axes: arch tangent (horizontal) and Z (vertical)
          const aT = axis[0] * af.tangent[0] + axis[1] * af.tangent[1];
          const angle = Math.atan2(aT, -axis[2]) * (180 / Math.PI);
          const inPlaneLen = imp.length * Math.hypot(aT, axis[2]);

          // Depth fade: buccolingual distance from the arch surface vs slab
          const w0 = (imp.position[0] - af.point[0]) * af.normal[0]
                   + (imp.position[1] - af.point[1]) * af.normal[1];
          const over = Math.max(0, Math.abs(w0) - halfSlab);
          const opacity = Math.max(0.15, Math.min(1, 1 - over / halfSlab));

          return (
            <ImplantShape
              key={imp.id}
              x={x}
              y={y}
              widthPx={imp.diameter * pxPerMm}
              heightPx={inPlaneLen * pxPerMm}
              angleDeg={angle}
              active={state.activeImplantId === imp.id}
              opacity={opacity}
              interactive
              onPointerDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
                dispatch({ type: 'SET_ACTIVE_IMPLANT', payload: imp.id });
                const rect = container.getBoundingClientRect();
                setImplantDrag({
                  id: imp.id,
                  offsetPx: [e.clientX - (rect.left + x), e.clientY - (rect.top + y)],
                });
              }}
            />
          );
        })}
      </svg>
    );
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-black overflow-hidden select-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onContextMenu={(e) => e.preventDefault()}
    >
      <canvas
        ref={canvasRef}
        data-panoramic-canvas
        className="w-full h-full"
        style={{ objectFit: 'contain', imageRendering: 'auto' }}
      />

      {/* Horizontal Z indicator line */}
      {hLineTop !== null && (
        <div
          className="absolute left-0 right-0"
          style={{ top: `${hLineTop}px`, height: '11px', marginTop: '-5.5px', cursor: 'ns-resize', pointerEvents: 'auto', zIndex: 20 }}
          onPointerDown={handleHLinePointerDown}
        >
          <div className="w-full" style={{ height: '1px', marginTop: '5px', background: 'rgba(255, 255, 50, 0.6)', boxShadow: '0 0 4px rgba(255, 255, 50, 0.4)' }} />
        </div>
      )}

      {/* Vertical cross-section line (tilted SVG) */}
      {vLinePts && (
        <svg
          className="absolute inset-0 w-full h-full"
          style={{ pointerEvents: 'none', zIndex: 21 }}
        >
          {/* Wide invisible hit area for position drag */}
          <line
            x1={vLinePts.x1} y1={vLinePts.y1}
            x2={vLinePts.x2} y2={vLinePts.y2}
            stroke="transparent" strokeWidth={14}
            style={{ pointerEvents: 'auto', cursor: 'ew-resize' }}
            onPointerDown={handleVLinePointerDown}
          />
          {/* Visible line */}
          <line
            x1={vLinePts.x1} y1={vLinePts.y1}
            x2={vLinePts.x2} y2={vLinePts.y2}
            stroke="rgba(100, 200, 255, 0.6)" strokeWidth={1}
            style={{ pointerEvents: 'none' }}
          />
          {/* Tilt handle — top */}
          <circle
            cx={vLinePts.x1} cy={vLinePts.y1} r={6}
            fill={tiltDragging ? 'rgb(80,200,255)' : 'rgb(100,200,255)'}
            stroke="white" strokeWidth={1.5}
            style={{ pointerEvents: 'auto', cursor: 'grab' }}
            onPointerDown={handleTiltPointerDown}
          />
          {/* Tilt handle — bottom */}
          <circle
            cx={vLinePts.x2} cy={vLinePts.y2} r={6}
            fill={tiltDragging ? 'rgb(80,200,255)' : 'rgb(100,200,255)'}
            stroke="white" strokeWidth={1.5}
            style={{ pointerEvents: 'auto', cursor: 'grab' }}
            onPointerDown={handleTiltPointerDown}
          />
        </svg>
      )}

      {/* Implant projections */}
      {renderImplants()}

      {/* Label */}
      <div className="absolute top-1 left-1/2 -translate-x-1/2 text-yellow-400 text-xs font-mono font-bold pointer-events-none select-none [text-shadow:_0_1px_2px_rgb(0_0_0_/_80%)]">
        Panoráma
      </div>

      {/* W/L info */}
      <div className="absolute bottom-1 left-2 text-gray-400 text-[10px] font-mono pointer-events-none select-none [text-shadow:_0_1px_2px_rgb(0_0_0_/_80%)]">
        WC: {Math.round(wc)} / WW: {Math.round(ww)}
      </div>

      {computing && (
        <div className="absolute top-1 right-2 text-dental-400 text-xs font-mono animate-pulse pointer-events-none">
          Számítás...
        </div>
      )}
    </div>
  );
}
