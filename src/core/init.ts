import {
  init as csRenderInit,
  getWebWorkerManager,
  volumeLoader,
  cornerstoneStreamingImageVolumeLoader,
  type Types,
} from '@cornerstonejs/core';
import { init as csToolsInit } from '@cornerstonejs/tools';
// Static import of pre-bundled dicom-image-loader (fast, single file).
// We do NOT call its init() because its internal worker URL is
// incompatible with Vite's dep pre-bundling.
import * as dicomImageLoader from '@cornerstonejs/dicom-image-loader';

let initialized = false;

export async function initCornerstone(): Promise<void> {
  if (initialized) return;

  console.log('[DQ-DICOM] Initializing...');

  // 1. Core + Tools (synchronous)
  csRenderInit();
  csToolsInit();

  // 2. Register wadouri/wadors loaders with cornerstone
  dicomImageLoader.wadouri.register();
  dicomImageLoader.wadors.register();

  // 3. Register the decode worker manually.
  //    We use a thin wrapper in src/workers/ so Vite transforms the file
  //    and resolves bare imports (e.g. 'comlink') that browsers cannot handle.
  const workerFn = () => {
    const w = new Worker(
      new URL('../workers/decodeImageFrameWorker.ts', import.meta.url),
      { type: 'module' },
    );
    w.onerror = (e) => console.error('[DQ-DICOM] Worker load error:', e);
    return w;
  };

  const maxWorkers = navigator.hardwareConcurrency
    ? Math.max(1, Math.floor(navigator.hardwareConcurrency / 2))
    : 1;

  const workerManager = getWebWorkerManager();
  workerManager.registerWorker('dicomImageLoader', workerFn, {
    maxWorkerInstances: maxWorkers,
  });

  // 4. Register streaming volume loader for MPR
  volumeLoader.registerVolumeLoader(
    'cornerstoneStreamingImageVolume',
    cornerstoneStreamingImageVolumeLoader as unknown as Types.VolumeLoaderFn,
  );

  initialized = true;
  console.log('[DQ-DICOM] Ready');
}
