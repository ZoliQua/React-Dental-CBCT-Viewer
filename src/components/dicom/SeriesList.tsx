import { useViewer } from '@/context/ViewerContext';

export function SeriesList() {
  const { state, dispatch } = useViewer();
  const { study, activeSeriesUID } = state;

  if (!study) return null;

  return (
    <div className="flex flex-col gap-1 p-2">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mb-1">
        Sorozatok ({study.series.length})
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
                ? 'bg-dental-700/50 text-dental-200 border border-dental-600'
                : 'text-gray-300 hover:bg-gray-700/50 border border-transparent'
            }
          `}
        >
          <div className="font-medium truncate">
            {series.seriesDescription || `Series #${series.seriesNumber}`}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">
            {series.modality} &middot; {series.imageCount} kép
          </div>
        </button>
      ))}
    </div>
  );
}
