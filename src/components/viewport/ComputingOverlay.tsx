/**
 * Full-viewport "recomputing" overlay: dims the image and shows a large
 * centered spinner + label, so it is obvious which view is being recalculated.
 */

import { useI18n } from '@/i18n/I18nContext';

export function ComputingOverlay({ show }: { show: boolean }) {
  const { t } = useI18n();
  if (!show) return null;
  return (
    <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-3 bg-black/60 pointer-events-none select-none">
      <div className="w-12 h-12 border-4 border-dental-400 border-t-transparent rounded-full animate-spin" />
      <span className="text-dental-200 text-xl font-semibold [text-shadow:_0_1px_4px_rgb(0_0_0)]">
        {t('viewport.computing')}
      </span>
    </div>
  );
}
