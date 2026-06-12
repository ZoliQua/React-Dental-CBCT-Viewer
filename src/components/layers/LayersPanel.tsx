/**
 * Right-side slide-in layers panel. Lists every overlay layer (implants,
 * measurements, future additions) with 4 actions per row:
 * show/hide · edit (popup) · delete · rename.
 */

import { useState } from 'react';
import { useViewer } from '@/context/ViewerContext';
import { ImplantEditPopup } from '@/components/implant/ImplantEditPopup';
import { setMeasurementsVisible, clearAllMeasurements } from '@/core/annotationLayer';

// ── Tiny inline icons ──────────────────────────────────────────

function EyeIcon({ off = false }: { off?: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
      <circle cx="12" cy="12" r="3" />
      {off && <line x1="2" y1="2" x2="22" y2="22" stroke="currentColor" />}
    </svg>
  );
}

function SlidersIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" />
      <line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" />
      <line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" />
      <line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </svg>
  );
}

function IconButton({
  title, onClick, disabled = false, danger = false, children,
}: {
  title: string;
  onClick?: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`
        w-6 h-6 flex items-center justify-center rounded transition-colors
        ${disabled
          ? 'text-gray-600 cursor-not-allowed'
          : danger
            ? 'text-gray-400 hover:text-white hover:bg-red-700'
            : 'text-gray-400 hover:text-white hover:bg-gray-600'}
      `}
    >
      {children}
    </button>
  );
}

// ── Generic layer row ──────────────────────────────────────────

interface LayerRowProps {
  name: string;
  visible: boolean;
  active?: boolean;
  onToggleVisible: () => void;
  onEdit?: () => void;       // undefined → disabled
  onDelete?: () => void;     // undefined → disabled
  onRename?: (name: string) => void;
  onSelect?: () => void;
}

function LayerRow({ name, visible, active = false, onToggleVisible, onEdit, onDelete, onRename, onSelect }: LayerRowProps) {
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(name);

  const commitRename = () => {
    setRenaming(false);
    const trimmed = draft.trim();
    if (trimmed && trimmed !== name) onRename?.(trimmed);
  };

  return (
    <div
      className={`
        flex items-center gap-1 px-2 py-1.5 rounded border
        ${active ? 'border-dental-500 bg-gray-700/60' : 'border-transparent hover:bg-gray-700/40'}
      `}
      onClick={onSelect}
    >
      {renaming ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitRename();
            if (e.key === 'Escape') { setDraft(name); setRenaming(false); }
          }}
          className="flex-1 min-w-0 bg-gray-900 text-gray-200 text-xs rounded px-1 py-0.5 border border-dental-500 outline-none"
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span className={`flex-1 min-w-0 truncate text-xs select-none ${visible ? 'text-gray-200' : 'text-gray-500 line-through'}`}>
          {name}
        </span>
      )}

      <IconButton title={visible ? 'Elrejtés' : 'Megjelenítés'} onClick={onToggleVisible}>
        <EyeIcon off={!visible} />
      </IconButton>
      <IconButton title="Módosítás" onClick={onEdit} disabled={!onEdit}>
        <SlidersIcon />
      </IconButton>
      <IconButton title="Törlés" onClick={onDelete} disabled={!onDelete} danger>
        <TrashIcon />
      </IconButton>
      <IconButton
        title="Átnevezés"
        onClick={onRename ? () => { setDraft(name); setRenaming(true); } : undefined}
        disabled={!onRename}
      >
        <PencilIcon />
      </IconButton>
    </div>
  );
}

// ── Panel ──────────────────────────────────────────────────────

export function LayersPanel() {
  const { state, dispatch } = useViewer();
  const [editingId, setEditingId] = useState<string | null>(null);

  const open = state.layersPanelOpen;

  return (
    <>
      <div
        className={`
          absolute top-0 right-0 bottom-0 w-72 z-40
          bg-gray-800 border-l border-gray-700 shadow-2xl
          transform transition-transform duration-200
          ${open ? 'translate-x-0' : 'translate-x-full'}
          flex flex-col
        `}
      >
        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700">
          <span className="text-sm font-bold text-dental-400 select-none">Rétegek</span>
          <button
            onClick={() => dispatch({ type: 'SET_LAYERS_PANEL_OPEN', payload: false })}
            className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700 rounded"
            title="Bezárás"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {/* Implant layers */}
          {state.implants.length > 0 && (
            <div className="text-[10px] uppercase tracking-wide text-gray-500 px-1 pt-1 select-none">
              Implantátumok
            </div>
          )}
          {state.implants.map(imp => (
            <LayerRow
              key={imp.id}
              name={imp.name}
              visible={imp.visible}
              active={state.activeImplantId === imp.id}
              onSelect={() => dispatch({ type: 'SET_ACTIVE_IMPLANT', payload: imp.id })}
              onToggleVisible={() => dispatch({ type: 'UPDATE_IMPLANT', payload: { ...imp, visible: !imp.visible } })}
              onEdit={() => {
                dispatch({ type: 'SET_ACTIVE_IMPLANT', payload: imp.id });
                setEditingId(imp.id);
              }}
              onDelete={() => {
                if (editingId === imp.id) setEditingId(null);
                dispatch({ type: 'REMOVE_IMPLANT', payload: imp.id });
              }}
              onRename={(name) => dispatch({ type: 'UPDATE_IMPLANT', payload: { ...imp, name } })}
            />
          ))}
          {state.implants.length === 0 && (
            <div className="text-xs text-gray-500 px-1 py-2 select-none">
              Még nincs implantátum — a „+ Implantátum” gombbal helyezhetsz el a keresztmetszeten.
            </div>
          )}

          {/* Measurements layer */}
          <div className="text-[10px] uppercase tracking-wide text-gray-500 px-1 pt-2 select-none">
            Egyéb rétegek
          </div>
          <LayerRow
            name="Mérések"
            visible={state.measurementsVisible}
            onToggleVisible={() => {
              const next = !state.measurementsVisible;
              setMeasurementsVisible(next);
              dispatch({ type: 'SET_MEASUREMENTS_VISIBLE', payload: next });
            }}
            onDelete={() => {
              if (window.confirm('Minden mérés törlése?')) {
                clearAllMeasurements();
              }
            }}
          />
        </div>
      </div>

      {/* Edit popup */}
      {editingId && (
        <ImplantEditPopup implantId={editingId} onClose={() => setEditingId(null)} />
      )}
    </>
  );
}
