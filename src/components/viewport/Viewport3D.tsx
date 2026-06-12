import { useEffect, useRef, useCallback, useState } from 'react';
import { getRenderingEngine, Enums, setVolumesForViewports, type Types } from '@cornerstonejs/core';
import { setupTools, addViewportTo3DToolGroup } from '@/core/toolManager';
import { RENDERING_ENGINE_ID, VP_3D } from '@/core/constants';
import { useViewer } from '@/context/ViewerContext';
import { useI18n } from '@/i18n/I18nContext';
import { ViewportOverlay } from './ViewportOverlay';
import { VOLUME_3D_PRESETS, type Volume3DPreset } from '@/types/dicom';

interface Viewport3DProps {
  volumeId: string;
}

export function Viewport3D({ volumeId }: Viewport3DProps) {
  const { t } = useI18n();
  const { state } = useViewer();
  const elementRef = useRef<HTMLDivElement>(null);
  const enabledRef = useRef(false);
  const destroyedRef = useRef(false);
  const [activePreset, setActivePreset] = useState<Volume3DPreset>('CT-Bone');
  const [slabThickness, setSlabThickness] = useState<number>(0); // 0 = no clipping

  const handleResize = useCallback(() => {
    const engine = getRenderingEngine(RENDERING_ENGINE_ID);
    engine?.resize(true, false);
  }, []);

  // Enable the 3D viewport
  useEffect(() => {
    const element = elementRef.current;
    const engine = getRenderingEngine(RENDERING_ENGINE_ID);
    if (!element || !engine) return;

    destroyedRef.current = false;
    setupTools();

    engine.enableElement({
      viewportId: VP_3D,
      type: Enums.ViewportType.VOLUME_3D,
      element,
      defaultOptions: {
        orientation: Enums.OrientationAxis.CORONAL,
      },
    });
    addViewportTo3DToolGroup(VP_3D, RENDERING_ENGINE_ID);
    enabledRef.current = true;

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(element);

    return () => {
      destroyedRef.current = true;
      resizeObserver.disconnect();
      if (enabledRef.current) {
        try {
          engine.disableElement(VP_3D);
        } catch {
          // engine may already be destroyed
        }
        enabledRef.current = false;
      }
    };
  }, [handleResize]);

  // Load volume and apply preset
  useEffect(() => {
    if (!volumeId || !enabledRef.current) return;

    const engine = getRenderingEngine(RENDERING_ENGINE_ID);
    if (!engine) return;

    let cancelled = false;

    async function loadVolume() {
      try {
        await setVolumesForViewports(
          engine!,
          [{ volumeId, blendMode: Enums.BlendModes.COMPOSITE }],
          [VP_3D],
        );
        if (cancelled || destroyedRef.current) return;

        const viewport = engine!.getViewport(VP_3D) as Types.IVolumeViewport;
        if (!viewport) return;

        (viewport as any).setProperties({ preset: activePreset });
        viewport.resetCamera({ resetPan: true, resetZoom: true, resetToCenter: true });
        viewport.render();
      } catch (err) {
        if (!cancelled && !destroyedRef.current) {
          console.error('[DQ-DICOM] Failed to set volume on 3D viewport:', err);
        }
      }
    }

    loadVolume();

    return () => {
      cancelled = true;
    };
  }, [volumeId, activePreset]);

  // Apply preset change
  const handlePresetChange = useCallback(
    (preset: Volume3DPreset) => {
      setActivePreset(preset);
      const engine = getRenderingEngine(RENDERING_ENGINE_ID);
      if (!engine) return;
      const viewport = engine.getViewport(VP_3D);
      if (!viewport) return;
      (viewport as any).setProperties({ preset });
      viewport.render();
    },
    [],
  );

  // Apply slab thickness change
  const handleSlabChange = useCallback(
    (value: number) => {
      setSlabThickness(value);
      const engine = getRenderingEngine(RENDERING_ENGINE_ID);
      if (!engine) return;
      const viewport = engine.getViewport(VP_3D);
      if (!viewport || !('setSlabThickness' in viewport)) return;
      if (value === 0) {
        (viewport as any).resetSlabThickness();
      } else {
        (viewport as any).setSlabThickness(value);
      }
      viewport.render();
    },
    [],
  );

  return (
    <div className="relative w-full h-full bg-black">
      <div
        ref={elementRef}
        className="w-full h-full"
        onContextMenu={(e) => e.preventDefault()}
      />

      <ViewportOverlay sliceIndex={0} totalSlices={0} />

      {/* 3D label */}
      <div className="absolute top-1 left-1/2 -translate-x-1/2 text-yellow-400 text-xs font-mono font-bold pointer-events-none select-none [text-shadow:_0_1px_2px_rgb(0_0_0_/_80%)]">
        3D
      </div>

      {/* Preset selector */}
      <div className="absolute bottom-2 right-2 flex flex-col gap-1 z-10">
        {VOLUME_3D_PRESETS.map((p) => (
          <button
            key={p.id}
            onClick={() => handlePresetChange(p.id)}
            className={`
              px-2 py-1 text-[10px] rounded transition-colors text-left
              ${
                activePreset === p.id
                  ? 'bg-dental-600 text-white'
                  : 'bg-gray-800/80 text-gray-300 hover:bg-gray-700/80'
              }
            `}
          >
            {t(p.labelKey)}
          </button>
        ))}
      </div>

      {/* Slab thickness slider */}
      {state.volumeId && (
        <div className="absolute left-2 bottom-2 z-10 flex items-center gap-2">
          <label className="text-[10px] text-gray-400 font-mono select-none">Vágósík</label>
          <input
            type="range"
            min={0}
            max={200}
            step={5}
            value={slabThickness}
            onChange={(e) => handleSlabChange(Number(e.target.value))}
            className="w-20 h-1 accent-dental-400"
            title={slabThickness === 0 ? 'Ki' : `${slabThickness} mm`}
          />
          <span className="text-[10px] text-gray-400 font-mono w-8">
            {slabThickness === 0 ? 'Ki' : `${slabThickness}`}
          </span>
        </div>
      )}
    </div>
  );
}
