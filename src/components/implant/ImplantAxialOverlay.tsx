/**
 * SVG overlay on the axial viewport: draws the circular section where each
 * implant body crosses the current axial slice. Scrolling through slices the
 * disc appears at the entry, shrinks toward the apex, and follows the tilted
 * axis sideways — the implant behaves as a real 3D object.
 */

import { useEffect, useState, useCallback } from 'react';
import { getRenderingEngine, Enums } from '@cornerstonejs/core';
import { useViewer } from '@/context/ViewerContext';
import { RENDERING_ENGINE_ID, VP_AXIAL } from '@/core/constants';
import { nearestArchFrame, implantAxis, radiusProfile } from '@/core/implantGeometry';

export function ImplantAxialOverlay() {
  const { state } = useViewer();
  // Bump to re-project on camera changes (scroll/pan/zoom)
  const [, setCamTick] = useState(0);

  const getViewport = useCallback(() => {
    const engine = getRenderingEngine(RENDERING_ENGINE_ID);
    return engine?.getViewport(VP_AXIAL) ?? null;
  }, []);

  useEffect(() => {
    const vp = getViewport();
    if (!vp) return;
    const handler = () => setCamTick(t => t + 1);
    const el = vp.element;
    el.addEventListener(Enums.Events.CAMERA_MODIFIED, handler);
    return () => el.removeEventListener(Enums.Events.CAMERA_MODIFIED, handler);
  }, [getViewport]);

  if (state.implants.length === 0 || !state.archCurveControlPoints) return null;
  const vp = getViewport();
  if (!vp) return null;
  const zFocal = vp.getCamera().focalPoint?.[2];
  if (zFocal === undefined) return null;

  return (
    <div className="absolute inset-0" style={{ zIndex: 11, pointerEvents: 'none' }}>
      <svg className="w-full h-full">
        {state.implants.filter(i => i.visible).map(imp => {
          const af = nearestArchFrame(state.archCurveControlPoints!, [imp.position[0], imp.position[1]]);
          if (!af) return null;
          const axis = implantAxis(af, imp.angleBLDeg, imp.angleMDDeg);
          if (Math.abs(axis[2]) < 0.1) return null;

          // Where does the implant axis cross the current axial plane?
          const t = (zFocal - imp.position[2]) / axis[2];
          if (t < 0 || t > imp.length) return null;

          const cx = imp.position[0] + axis[0] * t;
          const cy = imp.position[1] + axis[1] * t;
          const r = (imp.diameter / 2) * radiusProfile(t / imp.length);
          if (r <= 0.01) return null;

          const c = vp.worldToCanvas([cx, cy, zFocal] as any);
          const e = vp.worldToCanvas([cx + r, cy, zFocal] as any);
          const rPx = Math.hypot(e[0] - c[0], e[1] - c[1]);

          const isActive = state.activeImplantId === imp.id;
          const color = isActive ? 'rgb(255, 200, 0)' : 'rgb(0, 180, 255)';

          return (
            <g key={imp.id}>
              <circle
                cx={c[0]} cy={c[1]} r={rPx}
                fill={isActive ? 'rgba(255, 200, 0, 0.25)' : 'rgba(0, 180, 255, 0.2)'}
                stroke={color} strokeWidth={1.5}
              />
              <circle cx={c[0]} cy={c[1]} r={1.5} fill={color} />
            </g>
          );
        })}
      </svg>
    </div>
  );
}
