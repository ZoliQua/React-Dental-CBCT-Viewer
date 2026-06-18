import { useViewer } from '@/context/ViewerContext';
import { useI18n } from '@/i18n/I18nContext';
import { setActiveTool } from '@/core/toolManager';
import { TOOL_ICONS } from './toolIcons';
import type { ViewportTool } from '@/types/dicom';

const navTools: { id: ViewportTool; labelKey: string; shortcut: string }[] = [
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

const BTN_BASE = 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600';
const BTN_ACTIVE = 'bg-dental-600 text-white';
const BTN_DISABLED = 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500 cursor-not-allowed';

function GroupLabel({ text }: { text: string }) {
  return (
    <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 select-none whitespace-nowrap">
      {text}
    </span>
  );
}

function IconToolButton({
  iconKey,
  label,
  shortcut,
  isActive,
  disabled = false,
  disabledTitle,
  onClick,
}: {
  iconKey: string;
  label: string;
  shortcut: string;
  isActive: boolean;
  disabled?: boolean;
  disabledTitle?: string;
  onClick: () => void;
}) {
  const Icon = TOOL_ICONS[iconKey];
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        flex items-center gap-1.5 px-2 py-1.5 text-xs rounded transition-colors
        ${disabled ? BTN_DISABLED : isActive ? BTN_ACTIVE : BTN_BASE}
      `}
      title={disabled && disabledTitle ? disabledTitle : `${label} (${shortcut})`}
    >
      {Icon && <Icon />}
      <span>{label}</span>
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

  const isMPRMultiView = state.layoutMode === '2x2' || state.layoutMode === '1+3';

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 border-b border-gray-300 dark:bg-gray-800 dark:border-gray-700 flex-wrap">
      {/* Navigation tools */}
      <GroupLabel text={t('toolbar.view')} />
      <div className="flex gap-1">
        {navTools.map((tool) => (
          <IconToolButton
            key={tool.id}
            iconKey={tool.id}
            label={t(tool.labelKey)}
            shortcut={tool.shortcut}
            isActive={state.activeTool === tool.id}
            onClick={() => handleToolChange(tool.id)}
          />
        ))}
        <IconToolButton
          iconKey="crosshairs"
          label={t(crosshairTool.labelKey)}
          shortcut={crosshairTool.shortcut}
          isActive={state.activeTool === 'crosshairs'}
          disabled={!isMPRMultiView}
          disabledTitle={t('toolbar.crosshairsOnlyMulti')}
          onClick={() => handleToolChange(crosshairTool.id)}
        />
      </div>

      <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />

      {/* Measurement tools — usable on MPR, panoramic and cross-section views */}
      <GroupLabel text={t('toolbar.tools')} />
      <div className="flex gap-1 flex-wrap">
        {measureTools.map((tool) => (
          <IconToolButton
            key={tool.id}
            iconKey={tool.labelKey.replace('tool.', '')}
            label={t(tool.labelKey)}
            shortcut={tool.shortcut}
            isActive={state.activeTool === tool.id}
            onClick={() => handleToolChange(tool.id)}
          />
        ))}
      </div>

      {/* Implant placement — only on the cross-section layout.
          Slab width / AVG-MIP / resolution now live in the Settings panel. */}
      {state.study && state.layoutMode === 'OPG2+1' && (
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
          <button
            onClick={() => {
              const on = state.anatomyDrawMode === 'nerve';
              dispatch({ type: 'SET_ANATOMY_DRAW_MODE', payload: on ? null : 'nerve' });
              if (!on) dispatch({ type: 'SET_ACTIVE_ANATOMY', payload: null });
            }}
            className={`
              px-2 py-1 text-xs rounded transition-colors
              ${state.anatomyDrawMode === 'nerve' ? BTN_ACTIVE : BTN_BASE}
            `}
            title={t('anatomy.nerveTitle')}
          >
            {t('anatomy.nerve')}
          </button>
          <button
            onClick={() => {
              const on = state.anatomyDrawMode === 'sinus';
              dispatch({ type: 'SET_ANATOMY_DRAW_MODE', payload: on ? null : 'sinus' });
              if (!on) dispatch({ type: 'SET_ACTIVE_ANATOMY', payload: null });
            }}
            className={`
              px-2 py-1 text-xs rounded transition-colors
              ${state.anatomyDrawMode === 'sinus' ? BTN_ACTIVE : BTN_BASE}
            `}
            title={t('anatomy.sinusTitle')}
          >
            {t('anatomy.sinus')}
          </button>
        </>
      )}

      {/* Spacer */}
      <div className="flex-1" />
    </div>
  );
}
