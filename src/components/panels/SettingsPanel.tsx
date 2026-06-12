/**
 * Settings panel (slides in from the right). Hosts the Window/Level preset
 * buttons that used to live in the toolbar.
 */

import { useViewer } from '@/context/ViewerContext';
import { useI18n } from '@/i18n/I18nContext';
import { SidePanel } from './SidePanel';
import { WindowLevelPresets } from '@/components/tools/WindowLevel';

export function SettingsPanel() {
  const { state, dispatch } = useViewer();
  const { t } = useI18n();

  return (
    <SidePanel
      open={state.activePanel === 'settings'}
      title={t('settings.title')}
      onClose={() => dispatch({ type: 'SET_ACTIVE_PANEL', payload: null })}
      closeTitle={t('layers.close')}
    >
      <div className="space-y-2">
        <div className="text-[10px] uppercase tracking-wide text-gray-500 select-none">
          {t('settings.wlPresets')}
        </div>
        <WindowLevelPresets vertical />
        <p className="text-xs text-gray-500 dark:text-gray-500">{t('settings.wlHint')}</p>
      </div>
    </SidePanel>
  );
}
