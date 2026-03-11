import { createContext, useContext, useReducer, type ReactNode, type Dispatch } from 'react';
import type { DicomStudyInfo, ViewportTool, LayoutMode, MPROrientation } from '@/types/dicom';

interface ViewerState {
  isInitialized: boolean;
  isLoading: boolean;
  loadProgress: { loaded: number; total: number } | null;
  study: DicomStudyInfo | null;
  activeSeriesUID: string | null;
  activeTool: ViewportTool;
  layoutMode: LayoutMode;
  volumeId: string | null;
  mprOrientation: MPROrientation | null;
  currentSliceIndex: number;
  totalSlices: number;
  error: string | null;
}

type ViewerAction =
  | { type: 'SET_INITIALIZED' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_LOAD_PROGRESS'; payload: { loaded: number; total: number } }
  | { type: 'SET_STUDY'; payload: DicomStudyInfo }
  | { type: 'SET_ACTIVE_SERIES'; payload: string }
  | { type: 'SET_ACTIVE_TOOL'; payload: ViewportTool }
  | { type: 'SET_LAYOUT_MODE'; payload: LayoutMode }
  | { type: 'SET_VOLUME_ID'; payload: string }
  | { type: 'SET_MPR_ORIENTATION'; payload: MPROrientation | null }
  | { type: 'SET_SLICE_INFO'; payload: { index: number; total: number } }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'RESET' };

const initialState: ViewerState = {
  isInitialized: false,
  isLoading: false,
  loadProgress: null,
  study: null,
  activeSeriesUID: null,
  activeTool: 'windowLevel',
  layoutMode: '1x1',
  volumeId: null,
  mprOrientation: 'AXIAL' as MPROrientation,
  currentSliceIndex: 0,
  totalSlices: 0,
  error: null,
};

function viewerReducer(state: ViewerState, action: ViewerAction): ViewerState {
  switch (action.type) {
    case 'SET_INITIALIZED':
      return { ...state, isInitialized: true };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload, error: null, loadProgress: null };
    case 'SET_LOAD_PROGRESS':
      return { ...state, loadProgress: action.payload };
    case 'SET_STUDY':
      return {
        ...state,
        study: action.payload,
        activeSeriesUID: action.payload.series[0]?.seriesInstanceUID ?? null,
        isLoading: false,
        loadProgress: null,
      };
    case 'SET_ACTIVE_SERIES':
      return { ...state, activeSeriesUID: action.payload, volumeId: null };
    case 'SET_ACTIVE_TOOL':
      return { ...state, activeTool: action.payload };
    case 'SET_LAYOUT_MODE':
      return { ...state, layoutMode: action.payload, mprOrientation: action.payload === '1x1' ? 'AXIAL' : null };
    case 'SET_VOLUME_ID':
      return { ...state, volumeId: action.payload };
    case 'SET_MPR_ORIENTATION':
      return { ...state, mprOrientation: action.payload };
    case 'SET_SLICE_INFO':
      return { ...state, currentSliceIndex: action.payload.index, totalSlices: action.payload.total };
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false, loadProgress: null };
    case 'RESET':
      return { ...initialState, isInitialized: state.isInitialized };
    default:
      return state;
  }
}

const ViewerContext = createContext<{
  state: ViewerState;
  dispatch: Dispatch<ViewerAction>;
} | null>(null);

export function ViewerProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(viewerReducer, initialState);
  return (
    <ViewerContext.Provider value={{ state, dispatch }}>
      {children}
    </ViewerContext.Provider>
  );
}

export function useViewer() {
  const context = useContext(ViewerContext);
  if (!context) throw new Error('useViewer must be used within ViewerProvider');
  return context;
}
