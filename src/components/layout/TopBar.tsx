/**
 * App-wide top row: app title on the left; on the right icon buttons for
 * language selection, dark/light mode, settings and help. The settings and
 * help panels slide in from the right.
 */

import { useEffect, useRef, useState } from 'react';
import { useViewer } from '@/context/ViewerContext';
import { useI18n } from '@/i18n/I18nContext';
import { useTheme } from '@/context/ThemeContext';
import { LANGUAGES } from '@/i18n/translations';

// ── Icons ──────────────────────────────────────────────────────

function GlobeIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function HelpIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function TopBarButton({
  title, active = false, onClick, children,
}: {
  title: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`
        w-8 h-8 flex items-center justify-center rounded transition-colors
        ${active
          ? 'bg-dental-600 text-white'
          : 'text-gray-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700'}
      `}
    >
      {children}
    </button>
  );
}

// ── Top bar ────────────────────────────────────────────────────

export function TopBar() {
  const { state, dispatch } = useViewer();
  const { lang, setLang, t } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  // Close the language dropdown on outside click
  useEffect(() => {
    if (!langOpen) return;
    const handler = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [langOpen]);

  const current = LANGUAGES.find(l => l.id === lang)!;

  return (
    <div className="flex items-center justify-between px-4 py-1.5 bg-white border-b border-gray-300 dark:bg-gray-900 dark:border-gray-700">
      <div className="flex items-center gap-2 select-none">
        <span className="text-base">🦷</span>
        <span className="text-sm font-semibold text-dental-600 dark:text-dental-400">{t('app.title')}</span>
      </div>

      <div className="flex items-center gap-1">
        {/* Language selector */}
        <div className="relative" ref={langRef}>
          <button
            onClick={() => setLangOpen(o => !o)}
            title={t('topbar.language')}
            className="h-8 px-2 flex items-center gap-1.5 rounded text-gray-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
          >
            <GlobeIcon />
            <span className="text-xs font-mono uppercase">{current.id}</span>
          </button>
          {langOpen && (
            <div className="absolute right-0 top-9 z-50 w-36 bg-white border border-gray-300 rounded-lg shadow-xl py-1 dark:bg-gray-800 dark:border-gray-600">
              {LANGUAGES.map(l => (
                <button
                  key={l.id}
                  onClick={() => { setLang(l.id); setLangOpen(false); }}
                  className={`
                    w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left transition-colors
                    ${l.id === lang
                      ? 'text-dental-600 dark:text-dental-400 font-semibold'
                      : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'}
                  `}
                >
                  <span>{l.flag}</span>
                  <span>{l.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Dark / light mode */}
        <TopBarButton title={t('topbar.theme')} onClick={toggleTheme}>
          {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </TopBarButton>

        {/* Settings */}
        <TopBarButton
          title={t('topbar.settings')}
          active={state.activePanel === 'settings'}
          onClick={() => dispatch({ type: 'TOGGLE_PANEL', payload: 'settings' })}
        >
          <GearIcon />
        </TopBarButton>

        {/* Help */}
        <TopBarButton
          title={t('topbar.help')}
          active={state.activePanel === 'help'}
          onClick={() => dispatch({ type: 'TOGGLE_PANEL', payload: 'help' })}
        >
          <HelpIcon />
        </TopBarButton>
      </div>
    </div>
  );
}
