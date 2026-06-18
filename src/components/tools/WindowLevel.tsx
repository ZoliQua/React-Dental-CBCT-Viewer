import { getRenderingEngine } from '@cornerstonejs/core';
import { WL_PRESETS } from '@/types/dicom';
import { RENDERING_ENGINE_ID } from '@/core/constants';
import { useI18n } from '@/i18n/I18nContext';
import { useViewer } from '@/context/ViewerContext';

export function WindowLevelPresets({ vertical = false }: { vertical?: boolean }) {
  const { t } = useI18n();
  const { dispatch } = useViewer();

  const applyPreset = (wc: number, ww: number) => {
    // Shared W/L drives the custom canvas views (panoramic, cross-section)
    dispatch({ type: 'SET_WINDOW_LEVEL', payload: { wc, ww } });

    // And apply directly to any Cornerstone volume/stack viewports (MPR, 3D)
    const engine = getRenderingEngine(RENDERING_ENGINE_ID);
    engine?.getViewports().forEach((vp) => {
      if (typeof (vp as any).setProperties !== 'function') return;
      try {
        (vp as any).setProperties({ voiRange: { lower: wc - ww / 2, upper: wc + ww / 2 } });
        vp.render();
      } catch {
        /* viewport type without VOI — ignore */
      }
    });
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
