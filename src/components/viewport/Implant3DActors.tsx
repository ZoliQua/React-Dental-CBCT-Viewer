/**
 * Syncs implant / sleeve / axis mesh actors into the Cornerstone VOLUME_3D
 * viewport so planned implants are visible as real 3D objects inside the bone.
 * Renders nothing itself — it only manages vtk actors on the shared renderer,
 * rebuilding them whenever the implants, selection or 3D layer toggles change.
 */

import { useEffect, useRef } from 'react';
import { getRenderingEngine, type Types } from '@cornerstonejs/core';
import { useViewer } from '@/context/ViewerContext';
import { RENDERING_ENGINE_ID, VP_3D } from '@/core/constants';
import { nearestArchFrame, implantAxis } from '@/core/implantGeometry';
import { getImplantSystem } from '@/types/dicom';
import { buildImplantActors, buildAnatomyTube, type Implant3DLayers } from '@/core/implant3D';

export function Implant3DActors({ layers }: { layers: Implant3DLayers }) {
  const { state } = useViewer();
  const addedRef = useRef<string[]>([]);

  useEffect(() => {
    const engine = getRenderingEngine(RENDERING_ENGINE_ID);
    const viewport = engine?.getViewport(VP_3D) as Types.IVolumeViewport | undefined;
    if (!viewport) return;

    // Clear any previously added implant actors
    if (addedRef.current.length) {
      try { viewport.removeActors(addedRef.current); } catch { /* viewport gone */ }
      addedRef.current = [];
    }

    const cps = state.archCurveControlPoints;
    if (cps) {
      for (const imp of state.implants) {
        if (!imp.visible) continue;
        const af = nearestArchFrame(cps, [imp.position[0], imp.position[1]]);
        if (!af) continue;
        const axis = implantAxis(af, imp.angleBLDeg, imp.angleMDDeg);
        const sleeve = imp.guided?.enabled
          ? {
              diameter: getImplantSystem(imp.systemId).sleeveDiameter,
              offset: imp.guided.sleeveOffset,
              height: imp.guided.sleeveHeight,
            }
          : undefined;
        const actors = buildImplantActors(
          {
            entry: imp.position,
            axis,
            diameter: imp.diameter,
            length: imp.length,
            active: state.activeImplantId === imp.id,
            sleeve,
          },
          layers,
        );
        for (const { key, actor } of actors) {
          const uid = `implant3d:${imp.id}:${key}`;
          viewport.addActor({ uid, actor });
          addedRef.current.push(uid);
        }
      }
    }

    // Anatomy markers (nerve / sinus) as tubes
    for (const m of state.anatomy) {
      if (!m.visible || m.points.length < 2) continue;
      const actor = buildAnatomyTube(m.points, m.radius, m.color, 0.5);
      if (!actor) continue;
      const uid = `anatomy3d:${m.id}`;
      viewport.addActor({ uid, actor });
      addedRef.current.push(uid);
    }

    viewport.render();

    return () => {
      const eng = getRenderingEngine(RENDERING_ENGINE_ID);
      const vp = eng?.getViewport(VP_3D) as Types.IVolumeViewport | undefined;
      if (vp && addedRef.current.length) {
        try { vp.removeActors(addedRef.current); vp.render(); } catch { /* viewport gone */ }
        addedRef.current = [];
      }
    };
  }, [state.implants, state.activeImplantId, state.archCurveControlPoints, state.anatomy, layers]);

  return null;
}
