import { useViewer } from '@/context/ViewerContext';
import { setActiveTool } from '@/core/toolManager';
import { WindowLevelPresets } from '@/components/tools/WindowLevel';
import { generateDefaultArchCurve } from '@/core/archCurve';
import { cache } from '@cornerstonejs/core';
import type { ViewportTool, LayoutMode, ViewMode, ProjectionMode } from '@/types/dicom';

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
  { id: 'circleRoi', label: 'Kör', shortcut: 'C' },
  { id: 'rectangleRoi', label: 'Téglalap', shortcut: 'R' },
  { id: 'freehandRoi', label: 'Szabadkézi', shortcut: 'F' },
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
  { id: 'OPG', label: 'Pan 1×2' },
  { id: 'OPG2+1', label: 'Pan 2+1' },
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
          disabled={!isMPRMultiView}
          className={`
            px-3 py-1.5 text-sm rounded transition-colors
            ${
              !isMPRMultiView
                ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                : state.activeTool === 'crosshairs'
                  ? 'bg-dental-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }
          `}
          title={
            !isMPRMultiView
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

      {/* Panoramic OPG controls — visible in OPG layout */}
      {state.study && (state.layoutMode === 'OPG' || state.layoutMode === 'OPG2+1') && (
        <>
          <div className="w-px h-6 bg-gray-600" />
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-400 select-none">Szélesség</label>
            <input
              type="range"
              min={5}
              max={50}
              step={1}
              value={state.panoramicSlabWidth}
              onChange={(e) => dispatch({ type: 'SET_PANORAMIC_SLAB', payload: Number(e.target.value) })}
              className="w-20 h-1 accent-dental-400"
            />
            <span className="text-xs text-gray-300 font-mono w-10">{state.panoramicSlabWidth} mm</span>
          </div>
          <div className="flex gap-1">
            {(['AVG', 'MIP'] as ProjectionMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => dispatch({ type: 'SET_PANORAMIC_PROJECTION', payload: mode })}
                className={`
                  px-2 py-1 text-xs rounded transition-colors
                  ${state.panoramicProjection === mode
                    ? 'bg-dental-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}
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
              className="bg-gray-700 text-gray-300 text-xs rounded px-1 py-1 border border-gray-600"
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
          <div className="w-px h-6 bg-gray-600" />
          <button
            onClick={() => handleExportCanvas('[data-panoramic-canvas]', `panorama_${Date.now()}.png`)}
            className="px-2 py-1 text-xs bg-gray-700 text-gray-300 hover:bg-dental-600 hover:text-white rounded transition-colors"
            title="Panoráma mentése PNG-ként"
          >
            Mentés PNG
          </button>
          {state.layoutMode === 'OPG2+1' && (
            <button
              onClick={() => handleExportCanvas('[data-crosssection-canvas]', `keresztmetszet_${Date.now()}.png`)}
              className="px-2 py-1 text-xs bg-gray-700 text-gray-300 hover:bg-dental-600 hover:text-white rounded transition-colors"
              title="Keresztmetszet mentése PNG-ként"
            >
              Metszet PNG
            </button>
          )}
          {state.layoutMode === 'OPG2+1' && (
            <>
              <div className="w-px h-6 bg-gray-600" />
              <button
                onClick={() => dispatch({ type: 'SET_IMPLANT_PLACEMENT_MODE', payload: !state.implantPlacementMode })}
                className={`
                  px-2 py-1 text-xs rounded transition-colors
                  ${state.implantPlacementMode
                    ? 'bg-dental-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}
                `}
                title="Implantátum elhelyezése a keresztmetszeten"
              >
                + Implantátum
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
          onClick={() => dispatch({ type: 'SET_LAYERS_PANEL_OPEN', payload: !state.layersPanelOpen })}
          className={`
            px-3 py-1.5 text-sm rounded transition-colors
            ${state.layersPanelOpen
              ? 'bg-dental-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}
          `}
          title="Rétegek panel megnyitása/bezárása"
        >
          Rétegek
        </button>
      )}

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
