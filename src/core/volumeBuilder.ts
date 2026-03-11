import { volumeLoader, setVolumesForViewports, type Types } from '@cornerstonejs/core';
import { VOLUME_ID_PREFIX } from './constants';

let volumeCounter = 0;

/**
 * Creates a streaming image volume from a list of image IDs.
 * Resolves when all frames have been loaded.
 */
export async function createVolume(imageIds: string[]): Promise<string> {
  const volumeId = `${VOLUME_ID_PREFIX}${volumeCounter++}`;

  const volume = await volumeLoader.createAndCacheVolume(volumeId, { imageIds });

  return new Promise<string>((resolve) => {
    // The callback fires once when all frames have been processed
    volume.load(() => {
      resolve(volumeId);
    });
  });
}

/**
 * Sets a volume on multiple viewports at once.
 */
export async function setVolumeOnViewports(
  renderingEngine: Types.IRenderingEngine,
  volumeId: string,
  viewportIds: string[],
): Promise<void> {
  await setVolumesForViewports(renderingEngine, [{ volumeId }], viewportIds);
}
