import { useViewer } from '@/context/ViewerContext';
import { useI18n } from '@/i18n/I18nContext';

export function SeriesList() {
  const { state, dispatch } = useViewer();
  const { t } = useI18n();
  const { study, activeSeriesUID } = state;

  if (!study) return null;

  return (
    <div className="flex flex-col gap-1 p-2">
      <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider px-2 mb-1">
        {t('series.title', { n: study.series.length })}
      </h3>
      {study.series.map((series) => (
        <button
          key={series.seriesInstanceUID}
          onClick={() =>
            dispatch({ type: 'SET_ACTIVE_SERIES', payload: series.seriesInstanceUID })
          }
          className={`
            text-left px-3 py-2 rounded-lg text-sm transition-colors
            ${
              activeSeriesUID === series.seriesInstanceUID
                ? 'bg-dental-100 text-dental-800 border border-dental-400 dark:bg-dental-700/50 dark:text-dental-200 dark:border-dental-600'
                : 'text-gray-700 hover:bg-gray-200/70 dark:text-gray-300 dark:hover:bg-gray-700/50 border border-transparent'
            }
          `}
        >
          <div className="font-medium truncate">
            {series.seriesDescription || `Series #${series.seriesNumber}`}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">
            {series.modality} &middot; {t('series.images', { n: series.imageCount })}
          </div>
        </button>
      ))}
    </div>
  );
}
