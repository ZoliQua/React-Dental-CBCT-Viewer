/**
 * Small inline SVG icons for the toolbar tool buttons.
 */

const P = { width: 13, height: 13, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

export const TOOL_ICONS: Record<string, () => JSX.Element> = {
  windowLevel: () => (
    <svg {...P}><circle cx="12" cy="12" r="9" /><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" stroke="none" /></svg>
  ),
  pan: () => (
    <svg {...P}><polyline points="5 9 2 12 5 15" /><polyline points="9 5 12 2 15 5" /><polyline points="15 19 12 22 9 19" /><polyline points="19 9 22 12 19 15" /><line x1="2" y1="12" x2="22" y2="12" /><line x1="12" y1="2" x2="12" y2="22" /></svg>
  ),
  zoom: () => (
    <svg {...P}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" /></svg>
  ),
  scroll: () => (
    <svg {...P}><polyline points="7 7 12 2 17 7" /><polyline points="7 17 12 22 17 17" /><line x1="12" y1="2" x2="12" y2="22" /></svg>
  ),
  crosshairs: () => (
    <svg {...P}><circle cx="12" cy="12" r="8" /><line x1="12" y1="1" x2="12" y2="7" /><line x1="12" y1="17" x2="12" y2="23" /><line x1="1" y1="12" x2="7" y2="12" /><line x1="17" y1="12" x2="23" y2="12" /></svg>
  ),
  length: () => (
    <svg {...P}><line x1="4" y1="20" x2="20" y2="4" /><line x1="3" y1="17" x2="7" y2="21" /><line x1="17" y1="3" x2="21" y2="7" /></svg>
  ),
  angle: () => (
    <svg {...P}><line x1="4" y1="20" x2="20" y2="20" /><line x1="4" y1="20" x2="16" y2="6" /><path d="M11 20a8 8 0 0 0-2.5-5.5" /></svg>
  ),
  ellipse: () => (
    <svg {...P}><ellipse cx="12" cy="12" rx="9" ry="6" /></svg>
  ),
  circle: () => (
    <svg {...P}><circle cx="12" cy="12" r="8" /></svg>
  ),
  rectangle: () => (
    <svg {...P}><rect x="4" y="6" width="16" height="12" rx="1" /></svg>
  ),
  freehand: () => (
    <svg {...P}><path d="M3 17c3-6 5 4 8-2s5 2 10-8" /></svg>
  ),
  bidirectional: () => (
    <svg {...P}><line x1="4" y1="12" x2="20" y2="12" /><line x1="12" y1="4" x2="12" y2="20" /><circle cx="12" cy="12" r="1" fill="currentColor" /></svg>
  ),
  probe: () => (
    <svg {...P}><circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="7" strokeDasharray="2 3" /></svg>
  ),
  arrow: () => (
    <svg {...P}><line x1="20" y1="4" x2="6" y2="18" /><polyline points="6 12 6 18 12 18" /></svg>
  ),
};
