/**
 * Reusable SVG dental implant silhouette: straight collar, tapered threaded
 * body, rounded apex. Origin (0,0) is the entry point (top-center, platform);
 * the body extends downward to heightPx. Rotation pivots at the entry point.
 */

interface ImplantShapeProps {
  /** Entry point position in SVG pixel coordinates */
  x: number;
  y: number;
  widthPx: number;
  heightPx: number;
  angleDeg?: number;
  active?: boolean;
  label?: string;
  /** Group opacity (e.g. depth fade on the panoramic) */
  opacity?: number;
  /** When true, the whole body (with padding) is a grab target */
  interactive?: boolean;
  onPointerDown?: (e: React.PointerEvent) => void;
}

export function ImplantShape({
  x, y, widthPx, heightPx,
  angleDeg = 0,
  active = false,
  label,
  opacity = 1,
  interactive = false,
  onPointerDown,
}: ImplantShapeProps) {
  const rTop = widthPx / 2;
  const rBot = widthPx * 0.32;
  const collarH = heightPx * 0.14;
  const apexH = heightPx * 0.10;
  const bodyBot = heightPx - apexH;

  const outline = [
    `M ${-rTop} 0`,
    `L ${rTop} 0`,
    `L ${rTop} ${collarH}`,
    `L ${rBot} ${bodyBot}`,
    `Q ${rBot} ${heightPx} 0 ${heightPx}`,
    `Q ${-rBot} ${heightPx} ${-rBot} ${bodyBot}`,
    `L ${-rTop} ${collarH}`,
    'Z',
  ].join(' ');

  // Thread lines across the tapered body, slightly slanted
  const threads = [];
  const nThreads = Math.max(3, Math.min(8, Math.round(heightPx / (widthPx * 0.55))));
  for (let i = 1; i <= nThreads; i++) {
    const t = i / (nThreads + 1);
    const ty = collarH + t * (bodyBot - collarH);
    const hw = rTop + (rBot - rTop) * t;
    const slant = Math.min(2, heightPx * 0.02);
    threads.push(<line key={i} x1={-hw} y1={ty + slant} x2={hw} y2={ty - slant} />);
  }

  const stroke = active ? 'rgb(255, 200, 0)' : 'rgb(0, 180, 255)';
  const fill = active ? 'rgba(255, 200, 0, 0.25)' : 'rgba(0, 180, 255, 0.22)';

  return (
    <g
      transform={`translate(${x}, ${y}) rotate(${angleDeg})`}
      opacity={opacity}
      style={interactive
        ? { pointerEvents: 'auto', cursor: 'move' }
        : { pointerEvents: 'none' }}
      onPointerDown={onPointerDown}
    >
      {/* Full-body grab target incl. transparent padding around the outline */}
      {interactive && (
        <rect
          x={-rTop - 4} y={-4}
          width={widthPx + 8} height={heightPx + 8}
          fill="transparent"
          style={{ pointerEvents: 'all' }}
        />
      )}
      <path d={outline} fill={fill} stroke={stroke} strokeWidth={1.5} />
      <g stroke={stroke} strokeWidth={1} opacity={0.85} style={{ pointerEvents: 'none' }}>
        {threads}
      </g>
      {/* Platform line under the collar */}
      <line x1={-rTop} y1={collarH} x2={rTop} y2={collarH} stroke={stroke} strokeWidth={1} opacity={0.85} />
      {label && (
        <text
          x={rTop + 5}
          y={heightPx / 2}
          fill={active ? 'rgb(255, 200, 0)' : 'rgb(100, 200, 255)'}
          fontSize={10}
          fontFamily="monospace"
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          {label}
        </text>
      )}
    </g>
  );
}
