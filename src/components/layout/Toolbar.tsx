import { useViewer } from '@/context/ViewerContext';
import { setActiveTool } from '@/core/toolManager';
import { WindowLevelPresets } from '@/components/tools/WindowLevel';
import type { ViewportTool, LayoutMode, ViewMode } from '@/types/dicom';

const tools: { id: ViewportTool; label: string; shortcut: string }[] = [
  { id: 'windowLevel', label: 'W/L', shortcut: 'W' },
  { id: 'pan', label: 'Mozgatás', shortcut: 'P' },
  { id: 'zoom', label: 'Nagyítás', shortcut: 'Z' },
  { id: 'scroll', label: 'Görgetés', shortcut: 'S' },
];

// Crosshairs is separate — only enabled in multi-view layouts
const crosshairTool = { id: 'crosshairs' as ViewportTool, label: 'Szálkereszt', shortcut: 'X' };

const measureTools: { id: ViewportTool; label: string; shortcut: string }[] = [
  { id: 'length', label: 'Távolság', shortcut: 'L' },
  { id: 'angle', label: 'Szög', shortcut: 'A' },
  { id: 'ellipticalRoi', label: 'Ellipszis', shortcut: 'E' },
  { id: 'bidirectional', label: 'Kétirányú', shortcut: 'B' },
  { id: 'probe', label: 'HU szonda', shortcut: 'H' },
  { id: 'arrowAnnotate', label: 'Nyíl', shortcut: 'N' },
];

const viewModes: { id: ViewMode; label: string }[] = [
  { id: 'AXIAL', label: 'Axiális' },
  { id: 'SAGITTAL', label: 'Szagittális' },
  { id: 'CORONAL', label: 'Koronális' },
  { id: '3D', label: '3D' },
];

const layouts: { id: LayoutMode; label: string }[] = [
  { id: '1x1', label: '1×1' },
  { id: '2x2', label: '2×2' },
  { id: '1+3', label: '1+3' },
];

function ToolButton({
  tool,
  isActive,
  onClick,
}: {
  tool: { id: string; label: string; shortcut: string };
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        px-3 py-1.5 text-sm rounded transition-colors
        ${isActive ? 'bg-dental-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}
      `}
      title={`${tool.label} (${tool.shortcut})`}
    >
      {tool.label}
    </button>
  );
}

export function Toolbar() {
  const { state, dispatch } = useViewer();

  const handleToolChange = (tool: ViewportTool) => {
    setActiveTool(tool);
    dispatch({ type: 'SET_ACTIVE_TOOL', payload: tool });
  };

  const handleViewModeChange = (mode: ViewMode) => {
    dispatch({ type: 'SET_VIEW_MODE', payload: mode });
  };

  const handleLayoutChange = (layout: LayoutMode) => {
    dispatch({ type: 'SET_LAYOUT_MODE', payload: layout });
    if (layout !== '1x1') {
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

  const isMultiView = state.layoutMode !== '1x1';

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-gray-800 border-b border-gray-700 flex-wrap">
      {/* Logo */}
      <div className="text-sm font-semibold text-dental-400 mr-1">DQ DICOM</div>

      {/* Navigation tools */}
      <div className="flex gap-1">
        {tools.map((tool) => (
          <ToolButton
            key={tool.id}
            tool={tool}
            isActive={state.activeTool === tool.id}
            onClick={() => handleToolChange(tool.id)}
          />
        ))}
        {/* Crosshairs — only in multi-view */}
        <button
          onClick={() => handleToolChange(crosshairTool.id)}
          disabled={!isMultiView}
          className={`
            px-3 py-1.5 text-sm rounded transition-colors
            ${
              !isMultiView
                ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                : state.activeTool === 'crosshairs'
                  ? 'bg-dental-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }
          `}
          title={
            !isMultiView
              ? 'Szálkereszt csak többnézetes módban (2×2 / 1+3)'
              : `${crosshairTool.label} (${crosshairTool.shortcut})`
          }
        >
          {crosshairTool.label}
        </button>
      </div>

      <div className="w-px h-6 bg-gray-600" />

      {/* Measurement tools */}
      <div className="flex gap-1">
        {measureTools.map((tool) => (
          <ToolButton
            key={tool.id}
            tool={tool}
            isActive={state.activeTool === tool.id}
            onClick={() => handleToolChange(tool.id)}
          />
        ))}
      </div>

      <div className="w-px h-6 bg-gray-600" />

      {/* W/L Presets */}
      {state.study && <WindowLevelPresets />}

      {/* View mode (orientation + 3D) — only clickable in 1x1 */}
      {state.study && (
        <>
          <div className="w-px h-6 bg-gray-600" />
          <div className="flex gap-1">
            {viewModes.map((v) => (
              <button
                key={v.id}
                onClick={() => handleViewModeChange(v.id)}
                disabled={isMultiView}
                className={`
                  px-2 py-1.5 text-xs rounded transition-colors
                  ${
                    isMultiView
                      ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                      : state.viewMode === v.id
                        ? 'bg-dental-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }
                `}
                title={isMultiView ? 'Többnézetes módban mind látható' : v.label}
              >
                {v.label}
              </button>
            ))}
          </div>
        </>
      )}

      <div className="w-px h-6 bg-gray-600" />

      {/* Layout switcher */}
      {state.study && (
        <div className="flex gap-1">
          {layouts.map((l) => (
            <button
              key={l.id}
              onClick={() => handleLayoutChange(l.id)}
              className={`
                px-2 py-1.5 text-xs rounded font-mono transition-colors
                ${
                  state.layoutMode === l.id
                    ? 'bg-dental-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }
              `}
              title={`Elrendezés: ${l.label}`}
            >
              {l.label}
            </button>
          ))}
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Reset */}
      {state.study && (
        <button
          onClick={handleReset}
          className="px-3 py-1.5 text-sm bg-gray-700 text-gray-300 hover:bg-red-700 hover:text-white rounded transition-colors"
        >
          Új betöltés
        </button>
      )}
    </div>
  );
}
