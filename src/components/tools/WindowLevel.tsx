import { getRenderingEngine } from '@cornerstonejs/core';
import { WL_PRESETS } from '@/types/dicom';
import { RENDERING_ENGINE_ID, VIEWPORT_ID } from '@/core/constants';
import { useI18n } from '@/i18n/I18nContext';

export function WindowLevelPresets({ vertical = false }: { vertical?: boolean }) {
  const { t } = useI18n();

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
    <div className={vertical ? 'flex flex-col gap-1' : 'flex gap-1'}>
      {WL_PRESETS.map((preset) => (
        <button
          key={preset.key}
          onClick={() => applyPreset(preset.windowCenter, preset.windowWidth)}
          className={`
            px-2 py-1 text-xs rounded transition-colors whitespace-nowrap
            bg-gray-200 text-gray-700 hover:bg-gray-300
            dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600
            ${vertical ? 'text-left' : ''}
          `}
          title={`WC: ${preset.windowCenter} / WW: ${preset.windowWidth}`}
        >
          {t(`preset.${preset.key}`)}
        </button>
      ))}
    </div>
  );
}
