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
import { useLayoutSwitch } from '@/hooks/useLayoutSwitch';
import { exportViewPdf } from '@/core/pdfExport';
import { serializePlan, planFromObject } from '@/core/planIO';
import { implantWorldAxis } from '@/core/implantGeometry';
import { getVolumeData } from '@/core/cprEngine';
import { sampleImplantBoneHU } from '@/core/boneQuality';
import { VIEW_LABEL_KEYS, type LayoutMode, type ViewMode } from '@/types/dicom';

const LAYOUTS: { id: LayoutMode; labelKey?: string; label?: string }[] = [
  { id: '1x1', label: '1×1' },
  { id: '2x2', label: '2×2' },
  { id: '1+3', label: '1+3' },
  { id: 'OPG', label: 'Pan 1×2' },
  { id: 'OPG2+1', labelKey: 'viewport.crossSection' },
];

const VIEW_MODES: ViewMode[] = ['AXIAL', 'SAGITTAL', 'CORONAL', '3D'];

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

function DownloadIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function NewLoadIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
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
  const handleLayoutChange = useLayoutSwitch();
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const planInputRef = useRef<HTMLInputElement>(null);

  const savePlan = () => {
    const plan = serializePlan(state, {
      savedAt: new Date().toISOString(),
      studyInstanceUID: state.study?.studyInstanceUID ?? null,
      patientId: state.study?.patientId ?? null,
    });
    const blob = new Blob([JSON.stringify(plan, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `dental_plan_${new Date().toISOString().slice(0, 10)}.json`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
    setExportOpen(false);
  };

  const loadPlanFile = async (file: File) => {
    try {
      const obj = JSON.parse(await file.text());
      const data = planFromObject(obj);
      if (!data) {
        window.alert(t('plan.invalid'));
        return;
      }
      const uid = obj.studyInstanceUID;
      if (uid && state.study && uid !== state.study.studyInstanceUID && !window.confirm(t('plan.mismatch'))) {
        return;
      }
      dispatch({ type: 'LOAD_PLAN', payload: data });
    } catch {
      window.alert(t('plan.invalid'));
    }
  };

  // Close the export dropdown on outside click
  useEffect(() => {
    if (!exportOpen) return;
    const handler = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [exportOpen]);

  const exportCanvas = (selector: string, filename: string) => {
    const canvas = document.querySelector(selector) as HTMLCanvasElement | null;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/png');
    link.click();
    setExportOpen(false);
  };

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

      {/* Center: layout switcher (+ view modes in 1x1) */}
      {state.study && (
        <div className="flex items-center gap-1">
          {LAYOUTS.map(l => (
            <button
              key={l.id}
              onClick={() => handleLayoutChange(l.id)}
              className={`
                px-2 py-1 text-xs rounded font-mono transition-colors
                ${state.layoutMode === l.id
                  ? 'bg-dental-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'}
              `}
              title={t('toolbar.layout', { label: l.labelKey ? t(l.labelKey) : l.label! })}
            >
              {l.labelKey ? t(l.labelKey) : l.label}
            </button>
          ))}
          {state.layoutMode === '1x1' && (
            <>
              <div className="w-px h-5 mx-1 bg-gray-300 dark:bg-gray-600" />
              {VIEW_MODES.map(v => (
                <button
                  key={v}
                  onClick={() => dispatch({ type: 'SET_VIEW_MODE', payload: v })}
                  className={`
                    px-2 py-1 text-xs rounded transition-colors
                    ${state.viewMode === v
                      ? 'bg-dental-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'}
                  `}
                  title={t(VIEW_LABEL_KEYS[v])}
                >
                  {t(VIEW_LABEL_KEYS[v])}
                </button>
              ))}
            </>
          )}
        </div>
      )}

      <div className="flex items-center gap-1">
        {/* New load (reset to landing) */}
        {state.study && (
          <button
            onClick={() => dispatch({ type: 'RESET' })}
            title={t('topbar.newLoad')}
            className="h-8 px-2 flex items-center gap-1.5 rounded text-gray-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
          >
            <NewLoadIcon />
            <span className="text-xs">{t('topbar.newLoad')}</span>
          </button>
        )}

        {/* Export dropdown */}
        {state.study && (
          <div className="relative" ref={exportRef}>
            <button
              onClick={() => setExportOpen(o => !o)}
              title={t('export.button')}
              className="h-8 px-2 flex items-center gap-1.5 rounded text-gray-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
            >
              <DownloadIcon />
              <span className="text-xs">{t('export.button')}</span>
            </button>
            {exportOpen && (
              <div className="absolute right-0 top-9 z-50 w-44 bg-white border border-gray-300 rounded-lg shadow-xl py-1 dark:bg-gray-800 dark:border-gray-600">
                <button
                  onClick={() => exportCanvas('[data-panoramic-canvas]', `panorama_${Date.now()}.png`)}
                  disabled={state.layoutMode !== 'OPG' && state.layoutMode !== 'OPG2+1'}
                  className="w-full px-3 py-1.5 text-xs text-left text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 disabled:text-gray-400 dark:disabled:text-gray-600 disabled:cursor-not-allowed transition-colors"
                >
                  {t('opg.savePng')}
                </button>
                <button
                  onClick={() => exportCanvas('[data-crosssection-canvas]', `crosssection_${Date.now()}.png`)}
                  disabled={state.layoutMode !== 'OPG2+1'}
                  className="w-full px-3 py-1.5 text-xs text-left text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 disabled:text-gray-400 dark:disabled:text-gray-600 disabled:cursor-not-allowed transition-colors"
                >
                  {t('opg.sectionPng')}
                </button>
                <button
                  onClick={() => {
                    setExportOpen(false);
                    // Bone quality per implant (sampled from the volume)
                    const boneQuality: Record<string, string> = {};
                    const cps = state.archCurveControlPoints;
                    const vol = state.volumeId ? getVolumeData(state.volumeId) : null;
                    if (cps && vol) {
                      for (const imp of state.implants) {
                        const wa = implantWorldAxis(cps, imp);
                        if (!wa) continue;
                        const b = sampleImplantBoneHU(vol, wa.entry, wa.apex, imp.diameter / 2);
                        if (b) boneQuality[imp.id] = `${b.bone} · ${Math.round(b.meanHU)} HU`;
                      }
                    }
                    void exportViewPdf({
                      t,
                      study: state.study,
                      implants: state.implants,
                      measurements: state.measurements,
                      report: state.report,
                      anatomy: state.anatomy,
                      archCurve: state.archCurveControlPoints,
                      thresholds: { nerve: state.safety.nerveMm, sinus: state.safety.sinusMm, neighbor: state.safety.neighborMm },
                      boneQuality,
                      lang,
                    });
                  }}
                  className="w-full px-3 py-1.5 text-xs text-left text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
                >
                  {t('export.savePdf')}
                </button>
                <div className="my-1 border-t border-gray-200 dark:border-gray-700" />
                <button
                  onClick={savePlan}
                  className="w-full px-3 py-1.5 text-xs text-left text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
                >
                  {t('plan.save')}
                </button>
                <button
                  onClick={() => { setExportOpen(false); planInputRef.current?.click(); }}
                  className="w-full px-3 py-1.5 text-xs text-left text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
                >
                  {t('plan.load')}
                </button>
              </div>
            )}
            <input
              ref={planInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void loadPlanFile(f);
                e.target.value = '';
              }}
            />
          </div>
        )}

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
