import { useViewer } from '@/context/ViewerContext';
import { Viewport2D } from './Viewport2D';
import { ViewportMPR } from './ViewportMPR';
import { Viewport3D } from './Viewport3D';

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

  return <Viewport2D />;
}
