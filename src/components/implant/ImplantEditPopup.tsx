/**
 * Pop-up editor for one implant's properties. Opened from the layers panel
 * "módosítás" icon (replaces the old toolbar inline editor).
 */

import { useViewer } from '@/context/ViewerContext';
import { useI18n } from '@/i18n/I18nContext';
import type { ImplantData } from '@/types/dicom';
import { IMPLANT_DIAMETERS, IMPLANT_LENGTHS } from '@/types/dicom';

interface ImplantEditPopupProps {
  implantId: string;
  onClose: () => void;
}

export function ImplantEditPopup({ implantId, onClose }: ImplantEditPopupProps) {
  const { state, dispatch } = useViewer();
  const { t } = useI18n();
  const implant = state.implants.find(i => i.id === implantId);

  if (!implant) return null;

  const update = (partial: Partial<ImplantData>) => {
    dispatch({ type: 'UPDATE_IMPLANT', payload: { ...implant, ...partial } });
  };

  return (
    <>
      {/* Click-away backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      <div className="fixed right-[21rem] top-24 z-50 w-64 bg-white border border-gray-300 dark:bg-gray-800 dark:border-gray-600 rounded-lg shadow-xl p-3 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-dental-600 dark:text-dental-400 select-none">{implant.name}</span>
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-200 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700 rounded"
            title={t('implant.close')}
          >
            ✕
          </button>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-600 dark:text-gray-400 w-16 select-none">{t('implant.diameter')}</label>
          <select
            value={implant.diameter}
            onChange={(e) => update({ diameter: Number(e.target.value) })}
            className="flex-1 bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 text-xs rounded px-1 py-1 border"
          >
            {IMPLANT_DIAMETERS.map(d => (
              <option key={d} value={d}>⌀ {d} mm</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-600 dark:text-gray-400 w-16 select-none">{t('implant.length')}</label>
          <select
            value={implant.length}
            onChange={(e) => update({ length: Number(e.target.value) })}
            className="flex-1 bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 text-xs rounded px-1 py-1 border"
          >
            {IMPLANT_LENGTHS.map(l => (
              <option key={l} value={l}>{l} mm</option>
            ))}
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="text-xs text-gray-600 dark:text-gray-400 select-none" title={t('implant.blHint')}>
              {t('implant.blRotation')}
            </label>
            <span className="text-xs text-gray-700 dark:text-gray-300 font-mono">{implant.angleBLDeg}°</span>
          </div>
          <input
            type="range"
            min={-180}
            max={180}
            step={1}
            value={implant.angleBLDeg}
            onChange={(e) => update({ angleBLDeg: Number(e.target.value) })}
            className="w-full h-1 accent-dental-400"
          />
          <div className="flex gap-1 mt-1">
            <button
              onClick={() => update({ angleBLDeg: 0 })}
              className="flex-1 px-1 py-0.5 text-[10px] bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 rounded"
              title={t('implant.lowerJaw')}
            >
              {t('implant.lowerJaw')}
            </button>
            <button
              onClick={() => update({ angleBLDeg: 180 })}
              className="flex-1 px-1 py-0.5 text-[10px] bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 rounded"
              title={t('implant.upperJaw')}
            >
              {t('implant.upperJaw')}
            </button>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="text-xs text-gray-600 dark:text-gray-400 select-none" title={t('implant.mdHint')}>
              {t('implant.mdTilt')}
            </label>
            <span className="text-xs text-gray-700 dark:text-gray-300 font-mono">{implant.angleMDDeg}°</span>
          </div>
          <input
            type="range"
            min={-60}
            max={60}
            step={1}
            value={implant.angleMDDeg}
            onChange={(e) => update({ angleMDDeg: Number(e.target.value) })}
            className="w-full h-1 accent-dental-400"
          />
        </div>
      </div>
    </>
  );
}
