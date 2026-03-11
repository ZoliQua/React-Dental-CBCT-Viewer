import {
  addTool,
  ToolGroupManager,
  WindowLevelTool,
  PanTool,
  ZoomTool,
  StackScrollTool,
  LengthTool,
  AngleTool,
  EllipticalROITool,
  BidirectionalTool,
  ArrowAnnotateTool,
  ProbeTool,
  CrosshairsTool,
  Enums as csToolsEnums,
} from '@cornerstonejs/tools';
import { TOOL_GROUP_ID } from './constants';
import type { ViewportTool } from '@/types/dicom';

let toolGroupCreated = false;

export function setupTools(): void {
  if (toolGroupCreated) return;

  // Register all tools globally
  addTool(WindowLevelTool);
  addTool(PanTool);
  addTool(ZoomTool);
  addTool(StackScrollTool);
  addTool(LengthTool);
  addTool(AngleTool);
  addTool(EllipticalROITool);
  addTool(BidirectionalTool);
  addTool(ArrowAnnotateTool);
  addTool(ProbeTool);
  addTool(CrosshairsTool);

  const toolGroup = ToolGroupManager.createToolGroup(TOOL_GROUP_ID);
  if (!toolGroup) return;

  // Add all tools to the group
  toolGroup.addTool(WindowLevelTool.toolName);
  toolGroup.addTool(PanTool.toolName);
  toolGroup.addTool(ZoomTool.toolName);
  toolGroup.addTool(StackScrollTool.toolName);
  toolGroup.addTool(LengthTool.toolName);
  toolGroup.addTool(AngleTool.toolName);
  toolGroup.addTool(EllipticalROITool.toolName);
  toolGroup.addTool(BidirectionalTool.toolName);
  toolGroup.addTool(ArrowAnnotateTool.toolName);
  toolGroup.addTool(ProbeTool.toolName);
  toolGroup.addTool(CrosshairsTool.toolName);

  // Mouse wheel scrolls through slices (always active)
  toolGroup.setToolActive(StackScrollTool.toolName, {
    bindings: [{ mouseButton: csToolsEnums.MouseBindings.Wheel }],
  });

  // Default: left click = Window/Level
  setActiveTool('windowLevel');

  toolGroupCreated = true;
}

const TOOL_NAME_MAP: Record<ViewportTool, string> = {
  windowLevel: WindowLevelTool.toolName,
  pan: PanTool.toolName,
  zoom: ZoomTool.toolName,
  scroll: StackScrollTool.toolName,
  length: LengthTool.toolName,
  angle: AngleTool.toolName,
  ellipticalRoi: EllipticalROITool.toolName,
  bidirectional: BidirectionalTool.toolName,
  arrowAnnotate: ArrowAnnotateTool.toolName,
  probe: ProbeTool.toolName,
  crosshairs: CrosshairsTool.toolName,
};

const ALL_PRIMARY_TOOLS = Object.values(TOOL_NAME_MAP);

export function setActiveTool(tool: ViewportTool): void {
  const toolGroup = ToolGroupManager.getToolGroup(TOOL_GROUP_ID);
  if (!toolGroup) return;

  // Deactivate all primary-button tools (crosshairs → disabled to avoid warning)
  for (const t of ALL_PRIMARY_TOOLS) {
    if (t === CrosshairsTool.toolName) {
      toolGroup.setToolDisabled(t);
    } else {
      toolGroup.setToolPassive(t);
    }
  }

  const csToolName = TOOL_NAME_MAP[tool];
  if (!csToolName) return;

  // CrosshairsTool requires multiple viewports — skip activation if not enough
  if (tool === 'crosshairs') {
    const vpIds = toolGroup.getViewportIds();
    if (vpIds.length < 2) {
      console.warn('[DQ-DICOM] Crosshairs requires MPR layout (2+ viewports)');
      return;
    }
  }

  toolGroup.setToolActive(csToolName, {
    bindings: [{ mouseButton: csToolsEnums.MouseBindings.Primary }],
  });

  // Middle click = Pan (always active)
  toolGroup.setToolActive(PanTool.toolName, {
    bindings: [{ mouseButton: csToolsEnums.MouseBindings.Auxiliary }],
  });

  // Right click = Zoom (always active)
  toolGroup.setToolActive(ZoomTool.toolName, {
    bindings: [{ mouseButton: csToolsEnums.MouseBindings.Secondary }],
  });

  // Mouse wheel = Scroll through slices (always active)
  toolGroup.setToolActive(StackScrollTool.toolName, {
    bindings: [{ mouseButton: csToolsEnums.MouseBindings.Wheel }],
  });
}

export function addViewportToToolGroup(viewportId: string, renderingEngineId: string): void {
  const toolGroup = ToolGroupManager.getToolGroup(TOOL_GROUP_ID);
  if (toolGroup) {
    toolGroup.addViewport(viewportId, renderingEngineId);
  }
}
