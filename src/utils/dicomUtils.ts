export function formatDicomDate(dateStr: string): string {
  if (!dateStr || dateStr.length < 8) return dateStr || '';
  return `${dateStr.slice(0, 4)}.${dateStr.slice(4, 6)}.${dateStr.slice(6, 8)}`;
}

export function formatDicomName(name: string): string {
  return name.replace(/\^/g, ' ').trim();
}
