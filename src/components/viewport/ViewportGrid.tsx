import { useViewer } from '@/context/ViewerContext';
import { Viewport2D } from './Viewport2D';
import { ViewportMPR } from './ViewportMPR';
import { Viewport3D } from './Viewport3D';
import { ViewportPanoramic } from './ViewportPanoramic';
import { ViewportCrossSection } from './ViewportCrossSection';
import { ArchCurveEditor } from '@/components/panoramic/ArchCurveEditor';

export function ViewportGrid() {
  const { state } = useViewer();

  // 1x1 mode: show selected view mode
  if (state.layoutMode === '1x1') {
    if (!state.volumeId) {
      return <Viewport2D />;
    }
    if (state.viewMode === '3D') {
      return <Viewport3D volumeId={state.volumeId} />;
    }
    return <ViewportMPR orientation={state.viewMode} volumeId={state.volumeId} />;
  }

  // Multi-viewport layouts need volume
  if (!state.volumeId) {
    return <Viewport2D />;
  }

  if (state.layoutMode === '2x2') {
    return (
      <div className="grid grid-cols-2 grid-rows-2 w-full h-full gap-px bg-gray-700">
        <ViewportMPR orientation="AXIAL" volumeId={state.volumeId} />
        <ViewportMPR orientation="SAGITTAL" volumeId={state.volumeId} />
        <ViewportMPR orientation="CORONAL" volumeId={state.volumeId} />
        <Viewport3D volumeId={state.volumeId} />
      </div>
    );
  }

  // 1+3 layout: large axial on left, 3 small on right
  if (state.layoutMode === '1+3') {
    return (
      <div className="flex w-full h-full gap-px bg-gray-700">
        <div className="flex-1 h-full">
          <ViewportMPR orientation="AXIAL" volumeId={state.volumeId} />
        </div>
        <div className="w-1/3 h-full flex flex-col gap-px">
          <div className="flex-1">
            <ViewportMPR orientation="SAGITTAL" volumeId={state.volumeId} />
          </div>
          <div className="flex-1">
            <ViewportMPR orientation="CORONAL" volumeId={state.volumeId} />
          </div>
          <div className="flex-1">
            <Viewport3D volumeId={state.volumeId} />
          </div>
        </div>
      </div>
    );
  }

  // OPG (Panoráma 1×2): axial with arch curve (left) + panoramic (right)
  if (state.layoutMode === 'OPG') {
    return (
      <div className="flex w-full h-full gap-px bg-gray-700">
        <div className="relative flex-1 h-full">
          <ViewportMPR orientation="AXIAL" volumeId={state.volumeId} />
          <ArchCurveEditor />
        </div>
        <div className="flex-1 h-full">
          <ViewportPanoramic volumeId={state.volumeId} />
        </div>
      </div>
    );
  }

  // OPG2+1 (Panoráma 2+1): top row (axial + cross-section), bottom (panoramic)
  if (state.layoutMode === 'OPG2+1') {
    return (
      <div className="flex flex-col w-full h-full gap-px bg-gray-700">
        {/* Top row: axial with arch curve + cross-section */}
        <div className="flex flex-1 gap-px min-h-0">
          <div className="relative flex-1">
            <ViewportMPR orientation="AXIAL" volumeId={state.volumeId} />
            <ArchCurveEditor />
          </div>
          <div className="flex-1">
            <ViewportCrossSection volumeId={state.volumeId} />
          </div>
        </div>
        {/* Bottom: panoramic (full width) with cross-section line */}
        <div className="flex-1 min-h-0">
          <ViewportPanoramic volumeId={state.volumeId} showCrossSectionLine />
        </div>
      </div>
    );
  }

  return <Viewport2D />;
}
