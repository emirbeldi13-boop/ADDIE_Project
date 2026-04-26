/**
 * Semi-circular gauge component
 */
export function Gauge({ value, max = 5, label, color = '#2E75B6', size = 80 }) {
  const pct = Math.min(1, Math.max(0, value / max));
  const r = (size / 2) - 8;
  const cx = size / 2;
  const cy = size / 2;
  const startAngle = -Math.PI;
  const endAngle = 0;
  const angle = startAngle + pct * Math.PI;
  const x1 = cx + r * Math.cos(startAngle);
  const y1 = cy + r * Math.sin(startAngle);
  const x2 = cx + r * Math.cos(endAngle);
  const y2 = cy + r * Math.sin(endAngle);
  const x3 = cx + r * Math.cos(angle);
  const y3 = cy + r * Math.sin(angle);
  const largeArcFull = endAngle - startAngle > Math.PI ? 1 : 0;
  const largeArc = angle - startAngle > Math.PI ? 1 : 0;

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size / 2 + 4} viewBox={`0 0 ${size} ${size / 2 + 4}`}>
        {/* Background arc */}
        <path
          d={`M ${x1} ${y1} A ${r} ${r} 0 ${largeArcFull} 1 ${x2} ${y2}`}
          fill="none"
          stroke="#E5E7EB"
          strokeWidth="8"
          strokeLinecap="round"
        />
        {/* Value arc */}
        {pct > 0 && (
          <path
            d={`M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x3} ${y3}`}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
          />
        )}
        <text x={cx} y={cy + 4} textAnchor="middle" fontSize="13" fontWeight="bold" fill={color}>
          {typeof value === 'number' ? value.toFixed(2) : value}
        </text>
      </svg>
      {label && <span className="text-xs text-gray-500 text-center">{label}</span>}
    </div>
  );
}

/**
 * Progress bar component
 */
export function ProgressBar({ value, max = 100, color = '#2E75B6', label, showValue = true }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className="w-full">
      {(label || showValue) && (
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          {label && <span>{label}</span>}
          {showValue && <span className="font-medium" style={{ color }}>{value}{max !== 100 ? `/${max}` : '%'}</span>}
        </div>
      )}
      <div className="w-full bg-gray-100 rounded-full h-2">
        <div
          className="h-2 rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
