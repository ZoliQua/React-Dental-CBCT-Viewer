import { useCallback, useState, type DragEvent, type ChangeEvent } from 'react';
import { useDicomLoader } from '@/hooks/useDicomLoader';

export function FileDropZone() {
  const { loadFiles, isLoading, loadProgress, error } = useDicomLoader();
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const collectFiles = async (entries: FileSystemEntry[]): Promise<File[]> => {
    const files: File[] = [];

    async function readEntry(entry: FileSystemEntry): Promise<void> {
      if (entry.isFile) {
        const file = await new Promise<File>((resolve, reject) => {
          (entry as FileSystemFileEntry).file(resolve, reject);
        });
        files.push(file);
      } else if (entry.isDirectory) {
        const reader = (entry as FileSystemDirectoryEntry).createReader();
        // readEntries returns results in batches — must loop until empty
        let batch: FileSystemEntry[];
        do {
          batch = await new Promise<FileSystemEntry[]>((resolve, reject) => {
            reader.readEntries(resolve, reject);
          });
          for (const sub of batch) {
            await readEntry(sub);
          }
        } while (batch.length > 0);
      }
    }

    for (const entry of entries) {
      await readEntry(entry);
    }
    return files;
  };

  const handleDrop = useCallback(
    async (e: DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      const entries: FileSystemEntry[] = [];
      for (let i = 0; i < e.dataTransfer.items.length; i++) {
        const entry = e.dataTransfer.items[i].webkitGetAsEntry();
        if (entry) entries.push(entry);
      }

      const files = await collectFiles(entries);
      if (files.length > 0) {
        loadFiles(files);
      }
    },
    [loadFiles],
  );

  const handleFileInput = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const fileList = e.target.files;
      if (fileList && fileList.length > 0) {
        loadFiles(Array.from(fileList));
      }
    },
    [loadFiles],
  );

  const progressPercent =
    loadProgress && loadProgress.total > 0
      ? Math.round((loadProgress.loaded / loadProgress.total) * 100)
      : 0;

  return (
    <div className="flex items-center justify-center w-full h-full bg-gray-900 p-8">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative flex flex-col items-center justify-center
          w-full max-w-2xl h-80
          border-2 border-dashed rounded-2xl
          transition-all duration-200 cursor-pointer
          ${
            isDragOver
              ? 'border-dental-400 bg-dental-900/30 scale-[1.02]'
              : 'border-gray-600 bg-gray-800/50 hover:border-gray-500 hover:bg-gray-800/70'
          }
        `}
      >
        <input
          type="file"
          multiple
          onChange={handleFileInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          accept=".dcm,.dicom,application/dicom"
        />

        {isLoading ? (
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-dental-400 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-lg text-gray-300">DICOM fájlok feldolgozása...</p>
            {loadProgress && (
              <div className="mt-3 w-64">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>
                    {loadProgress.loaded} / {loadProgress.total} fájl
                  </span>
                  <span>{progressPercent}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-dental-500 h-2 rounded-full transition-all duration-150"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            <svg
              className="w-16 h-16 text-gray-500 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p className="text-lg text-gray-300 mb-2">DICOM fájlok betöltése</p>
            <p className="text-sm text-gray-500">
              Húzza ide a fájlokat vagy mappát, vagy kattintson a tallózáshoz
            </p>
            <p className="text-xs text-gray-600 mt-2">.dcm fájlok vagy DICOM mappa</p>
          </>
        )}

        {error && (
          <div className="absolute bottom-4 left-4 right-4 bg-red-900/80 border border-red-700 rounded-lg p-3 text-sm text-red-200">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
