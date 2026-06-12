import { useViewer } from '@/context/ViewerContext';
import { useI18n } from '@/i18n/I18nContext';
import { setActiveTool } from '@/core/toolManager';
import { generateDefaultArchCurve } from '@/core/archCurve';
import { cache } from '@cornerstonejs/core';
import type { ViewportTool, LayoutMode, ViewMode, ProjectionMode } from '@/types/dicom';
import { VIEW_LABEL_KEYS } from '@/types/dicom';

const tools: { id: ViewportTool; labelKey: string; shortcut: string }[] = [
  { id: 'windowLevel', labelKey: 'tool.windowLevel', shortcut: 'W' },
  { id: 'pan', labelKey: 'tool.pan', shortcut: 'P' },
  { id: 'zoom', labelKey: 'tool.zoom', shortcut: 'Z' },
  { id: 'scroll', labelKey: 'tool.scroll', shortcut: 'S' },
];

// Crosshairs is separate — only enabled in multi-view layouts
const crosshairTool = { id: 'crosshairs' as ViewportTool, labelKey: 'tool.crosshairs', shortcut: 'X' };

const measureTools: { id: ViewportTool; labelKey: string; shortcut: string }[] = [
  { id: 'length', labelKey: 'tool.length', shortcut: 'L' },
  { id: 'angle', labelKey: 'tool.angle', shortcut: 'A' },
  { id: 'ellipticalRoi', labelKey: 'tool.ellipse', shortcut: 'E' },
  { id: 'circleRoi', labelKey: 'tool.circle', shortcut: 'C' },
  { id: 'rectangleRoi', labelKey: 'tool.rectangle', shortcut: 'R' },
  { id: 'freehandRoi', labelKey: 'tool.freehand', shortcut: 'F' },
  { id: 'bidirectional', labelKey: 'tool.bidirectional', shortcut: 'B' },
  { id: 'probe', labelKey: 'tool.probe', shortcut: 'H' },
  { id: 'arrowAnnotate', labelKey: 'tool.arrow', shortcut: 'N' },
];

const viewModes: ViewMode[] = ['AXIAL', 'SAGITTAL', 'CORONAL', '3D'];

const layouts: { id: LayoutMode; label: string }[] = [
  { id: '1x1', label: '1×1' },
  { id: '2x2', label: '2×2' },
  { id: '1+3', label: '1+3' },
  { id: 'OPG', label: 'Pan 1×2' },
  { id: 'OPG2+1', label: 'Pan 2+1' },
];

const BTN_BASE = 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600';
const BTN_ACTIVE = 'bg-dental-600 text-white';
const BTN_DISABLED = 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500 cursor-not-allowed';

function ToolButton({
  label,
  shortcut,
  isActive,
  onClick,
}: {
  label: string;
  shortcut: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-sm rounded transition-colors ${isActive ? BTN_ACTIVE : BTN_BASE}`}
      title={`${label} (${shortcut})`}
    >
      {label}
    </button>
  );
}

export function Toolbar() {
  const { state, dispatch } = useViewer();
  const { t } = useI18n();

  const handleToolChange = (tool: ViewportTool) => {
    setActiveTool(tool);
    dispatch({ type: 'SET_ACTIVE_TOOL', payload: tool });
  };

  const handleViewModeChange = (mode: ViewMode) => {
    dispatch({ type: 'SET_VIEW_MODE', payload: mode });
  };

  const handleLayoutChange = (layout: LayoutMode) => {
    dispatch({ type: 'SET_LAYOUT_MODE', payload: layout });

    if (layout === 'OPG' || layout === 'OPG2+1') {
      // Initialize default arch curve if not yet drawn
      if (!state.archCurveControlPoints && state.volumeId) {
        const volume = cache.getVolume(state.volumeId);
        if (volume) {
          const o = volume.origin as [number, number, number];
          const d = volume.dimensions as [number, number, number];
          const s = volume.spacing as [number, number, number];
          const center: [number, number] = [
            o[0] + (d[0] * s[0]) / 2,
            o[1] + (d[1] * s[1]) / 2,
          ];
          const size: [number, number] = [d[0] * s[0], d[1] * s[1]];
          dispatch({ type: 'SET_ARCH_CURVE', payload: generateDefaultArchCurve(center, size) });
        }
      }
      // W/L is the default tool in OPG mode
      setActiveTool('windowLevel');
      dispatch({ type: 'SET_ACTIVE_TOOL', payload: 'windowLevel' });
    } else if (layout === '2x2' || layout === '1+3') {
      // Auto-activate crosshairs in multi-view mode (slight delay for viewports to mount)
      setTimeout(() => {
        setActiveTool('crosshairs');
        dispatch({ type: 'SET_ACTIVE_TOOL', payload: 'crosshairs' });
      }, 150);
    } else if (state.activeTool === 'crosshairs') {
      // Switch back to W/L when going to 1x1
      setActiveTool('windowLevel');
      dispatch({ type: 'SET_ACTIVE_TOOL', payload: 'windowLevel' });
    }
  };

  const handleReset = () => {
    dispatch({ type: 'RESET' });
  };

  const handleExportCanvas = (selector: string, filename: string) => {
    const canvas = document.querySelector(selector) as HTMLCanvasElement | null;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const isMPRMultiView = state.layoutMode === '2x2' || state.layoutMode === '1+3';
  const isOPG = state.layoutMode === 'OPG' || state.layoutMode === 'OPG2+1';
  const isMultiView = isMPRMultiView || isOPG;

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-gray-100 border-b border-gray-300 dark:bg-gray-800 dark:border-gray-700 flex-wrap">
      {/* Navigation tools */}
      <div className="flex gap-1">
        {tools.map((tool) => (
          <ToolButton
            key={tool.id}
            label={t(tool.labelKey)}
            shortcut={tool.shortcut}
            isActive={state.activeTool === tool.id}
            onClick={() => handleToolChange(tool.id)}
          />
        ))}
        {/* Crosshairs — only in multi-view */}
        <button
          onClick={() => handleToolChange(crosshairTool.id)}
          disabled={!isMPRMultiView}
          className={`
            px-3 py-1.5 text-sm rounded transition-colors
            ${!isMPRMultiView ? BTN_DISABLED : state.activeTool === 'crosshairs' ? BTN_ACTIVE : BTN_BASE}
          `}
          title={
            !isMPRMultiView
              ? t('toolbar.crosshairsOnlyMulti')
              : `${t(crosshairTool.labelKey)} (${crosshairTool.shortcut})`
          }
        >
          {t(crosshairTool.labelKey)}
        </button>
      </div>

      <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />

      {/* Measurement tools */}
      <div className="flex gap-1">
        {measureTools.map((tool) => (
          <ToolButton
            key={tool.id}
            label={t(tool.labelKey)}
            shortcut={tool.shortcut}
            isActive={state.activeTool === tool.id}
            onClick={() => handleToolChange(tool.id)}
          />
        ))}
      </div>

      {/* View mode (orientation + 3D) — only clickable in 1x1 */}
      {state.study && (
        <>
          <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />
          <div className="flex gap-1">
            {viewModes.map((v) => (
              <button
                key={v}
                onClick={() => handleViewModeChange(v)}
                disabled={isMultiView}
                className={`
                  px-2 py-1.5 text-xs rounded transition-colors
                  ${isMultiView ? BTN_DISABLED : state.viewMode === v ? BTN_ACTIVE : BTN_BASE}
                `}
                title={isMultiView ? t('toolbar.multiviewAllVisible') : t(VIEW_LABEL_KEYS[v])}
              >
                {t(VIEW_LABEL_KEYS[v])}
              </button>
            ))}
          </div>
        </>
      )}

      <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />

      {/* Layout switcher */}
      {state.study && (
        <div className="flex gap-1">
          {layouts.map((l) => (
            <button
              key={l.id}
              onClick={() => handleLayoutChange(l.id)}
              className={`
                px-2 py-1.5 text-xs rounded font-mono transition-colors
                ${state.layoutMode === l.id ? BTN_ACTIVE : BTN_BASE}
              `}
              title={t('toolbar.layout', { label: l.label })}
            >
              {l.label}
            </button>
          ))}
        </div>
      )}

      {/* Panoramic OPG controls — visible in OPG layout */}
      {state.study && (state.layoutMode === 'OPG' || state.layoutMode === 'OPG2+1') && (
        <>
          <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-600 dark:text-gray-400 select-none">{t('opg.width')}</label>
            <input
              type="range"
              min={5}
              max={50}
              step={1}
              value={state.panoramicSlabWidth}
              onChange={(e) => dispatch({ type: 'SET_PANORAMIC_SLAB', payload: Number(e.target.value) })}
              className="w-20 h-1 accent-dental-400"
            />
            <span className="text-xs text-gray-700 dark:text-gray-300 font-mono w-10">{state.panoramicSlabWidth} mm</span>
          </div>
          <div className="flex gap-1">
            {(['AVG', 'MIP'] as ProjectionMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => dispatch({ type: 'SET_PANORAMIC_PROJECTION', payload: mode })}
                className={`
                  px-2 py-1 text-xs rounded transition-colors
                  ${state.panoramicProjection === mode ? BTN_ACTIVE : BTN_BASE}
                `}
              >
                {mode}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <select
              value={state.panoramicResolution}
              onChange={(e) => dispatch({ type: 'SET_PANORAMIC_RESOLUTION', payload: Number(e.target.value) })}
              className="bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 text-xs rounded px-1 py-1 border border-gray-300 dark:border-gray-600"
            >
              <option value={0.15}>150 µm</option>
              <option value={0.3}>300 µm</option>
              <option value={0.45}>450 µm</option>
              <option value={0.75}>750 µm</option>
              <option value={1.0}>1.0 mm</option>
              <option value={2.0}>2.0 mm</option>
              <option value={3.0}>3.0 mm</option>
              <option value={5.0}>5.0 mm</option>
            </select>
          </div>
          <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />
          <button
            onClick={() => handleExportCanvas('[data-panoramic-canvas]', `panorama_${Date.now()}.png`)}
            className={`px-2 py-1 text-xs rounded transition-colors ${BTN_BASE} hover:!bg-dental-600 hover:!text-white`}
            title={t('opg.savePng')}
          >
            {t('opg.savePng')}
          </button>
          {state.layoutMode === 'OPG2+1' && (
            <button
              onClick={() => handleExportCanvas('[data-crosssection-canvas]', `crosssection_${Date.now()}.png`)}
              className={`px-2 py-1 text-xs rounded transition-colors ${BTN_BASE} hover:!bg-dental-600 hover:!text-white`}
              title={t('opg.sectionPng')}
            >
              {t('opg.sectionPng')}
            </button>
          )}
          {state.layoutMode === 'OPG2+1' && (
            <>
              <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />
              <button
                onClick={() => dispatch({ type: 'SET_IMPLANT_PLACEMENT_MODE', payload: !state.implantPlacementMode })}
                className={`
                  px-2 py-1 text-xs rounded transition-colors
                  ${state.implantPlacementMode ? BTN_ACTIVE : BTN_BASE}
                `}
                title={t('opg.addImplantTitle')}
              >
                {t('opg.addImplant')}
              </button>
            </>
          )}
        </>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Layers panel toggle */}
      {state.study && (
        <button
          onClick={() => dispatch({ type: 'TOGGLE_PANEL', payload: 'layers' })}
          className={`
            px-3 py-1.5 text-sm rounded transition-colors
            ${state.activePanel === 'layers' ? BTN_ACTIVE : BTN_BASE}
          `}
          title={t('toolbar.layers')}
        >
          {t('toolbar.layers')}
        </button>
      )}

      {/* Reset */}
      {state.study && (
        <button
          onClick={handleReset}
          className={`px-3 py-1.5 text-sm rounded transition-colors ${BTN_BASE} hover:!bg-red-700 hover:!text-white`}
        >
          {t('toolbar.reload')}
        </button>
      )}
    </div>
  );
}
