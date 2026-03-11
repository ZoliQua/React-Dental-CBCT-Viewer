import { useCallback } from 'react';
import { useViewer } from '@/context/ViewerContext';

const BLOCK_COUNT = 20;

interface SliceIndicatorProps {
  onJumpToSlice: (index: number) => void;
  sliceIndex?: number;
  totalSlices?: number;
}

export function SliceIndicator({ onJumpToSlice, sliceIndex, totalSlices }: SliceIndicatorProps) {
  const { state } = useViewer();

  const displayIndex = sliceIndex ?? state.currentSliceIndex;
  const displayTotal = totalSlices ?? state.totalSlices;

  const activeBlock = Math.round((displayIndex / Math.max(displayTotal - 1, 1)) * (BLOCK_COUNT - 1));

  const handleClick = useCallback(
    (blockIndex: number) => {
      const idx = Math.round((blockIndex / (BLOCK_COUNT - 1)) * (displayTotal - 1));
      onJumpToSlice(idx);
    },
    [displayTotal, onJumpToSlice],
  );

  return (
    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-0.5 pointer-events-auto z-10">
      {Array.from({ length: BLOCK_COUNT }, (_, i) => (
        <button
          key={i}
          onClick={() => handleClick(i)}
          className={`
            w-2.5 h-3 rounded-[2px] border transition-colors
            ${
              i === activeBlock
                ? 'bg-dental-400 border-dental-300'
                : 'bg-gray-700/60 border-gray-600/40 hover:bg-gray-500/60'
            }
          `}
          title={`Szelet ${Math.round((i / (BLOCK_COUNT - 1)) * (displayTotal - 1)) + 1} / ${displayTotal}`}
        />
      ))}
    </div>
  );
}
