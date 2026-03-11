import { getRenderingEngine } from '@cornerstonejs/core';
import { WL_PRESETS } from '@/types/dicom';
import { RENDERING_ENGINE_ID, VIEWPORT_ID } from '@/core/constants';

export function WindowLevelPresets() {
  const applyPreset = (wc: number, ww: number) => {
    const renderingEngine = getRenderingEngine(RENDERING_ENGINE_ID);
    if (!renderingEngine) return;

    const viewport = renderingEngine.getStackViewport(VIEWPORT_ID);
    if (!viewport) return;

    viewport.setProperties({
      voiRange: {
        lower: wc - ww / 2,
        upper: wc + ww / 2,
      },
    });
    viewport.render();
  };

  return (
    <div className="flex gap-1">
      {WL_PRESETS.map((preset) => (
        <button
          key={preset.name}
          onClick={() => applyPreset(preset.windowCenter, preset.windowWidth)}
          className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded text-gray-300 transition-colors whitespace-nowrap"
          title={`WC: ${preset.windowCenter} / WW: ${preset.windowWidth}`}
        >
          {preset.name}
        </button>
      ))}
    </div>
  );
}
