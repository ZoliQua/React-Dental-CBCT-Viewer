/**
 * Shared right-side slide-in panel shell (settings, help, layers all use the
 * same look and animation).
 */

import type { ReactNode } from 'react';

interface SidePanelProps {
  open: boolean;
  title: string;
  onClose: () => void;
  closeTitle: string;
  children: ReactNode;
}

export function SidePanel({ open, title, onClose, closeTitle, children }: SidePanelProps) {
  return (
    <div
      className={`
        fixed top-0 right-0 bottom-0 w-80 z-40
        bg-white border-l border-gray-300 shadow-2xl
        dark:bg-gray-800 dark:border-gray-700
        transform transition-transform duration-200
        ${open ? 'translate-x-0' : 'translate-x-full'}
        flex flex-col
      `}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-300 dark:border-gray-700">
        <span className="text-sm font-bold text-dental-600 dark:text-dental-400 select-none">{title}</span>
        <button
          onClick={onClose}
          className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-200 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700 rounded"
          title={closeTitle}
        >
          ✕
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {children}
      </div>
    </div>
  );
}
