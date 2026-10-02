interface BarChartProps {
  data: { label: string; value: number; color?: string }[];
  maxValue?: number;
  height?: number;
  showValues?: boolean;
  ariaLabel?: string;
}

export function BarChart({
  data,
  maxValue,
  height = 200,
  showValues = true,
  ariaLabel = 'Bar chart',
}: BarChartProps) {
  const max = maxValue ?? Math.max(...data.map((d) => d.value), 1);

  return (
    <div
      className="w-full"
      role="img"
      aria-label={ariaLabel}
    >
      <div className="flex items-end justify-between gap-2" style={{ height }}>
        {data.map((item, i) => {
          const pct = (item.value / max) * 100;
          const color = item.color ?? 'bg-teal-500';
          return (
            <div key={i} className="flex flex-1 flex-col items-center justify-end gap-1">
              {showValues && (
                <span className="text-xs font-semibold text-gray-700">{item.value}</span>
              )}
              <div
                className={`w-full max-w-[60px] rounded-t-md transition-all duration-500 ${color}`}
                style={{ height: `${Math.max(pct, 2)}%` }}
              />
              <span className="text-[10px] text-gray-500 text-center leading-tight">{item.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface DonutChartProps {
  segments: { label: string; value: number; color: string }[];
  size?: number;
  ariaLabel?: string;
}

export function DonutChart({ segments, size = 160, ariaLabel = 'Donut chart' }: DonutChartProps) {
  const total = segments.reduce((sum, s) => sum + s.value, 0) || 1;
  const radius = size / 2 - 12;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div
      className="flex items-center gap-4"
      role="img"
      aria-label={ariaLabel}
    >
      <svg width={size} height={size} className="flex-shrink-0">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#f3f4f6"
          strokeWidth={12}
        />
        {segments.map((seg, i) => {
          const dash = (seg.value / total) * circumference;
          const circle = (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={12}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-offset}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          );
          offset += dash;
          return circle;
        })}
        <text
          x={size / 2}
          y={size / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          className="text-2xl font-bold fill-gray-900"
        >
          {total}
        </text>
      </svg>
      <div className="flex flex-col gap-1.5">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span
              className="inline-block h-3 w-3 rounded-sm"
              style={{ backgroundColor: seg.color }}
            />
            <span className="text-gray-700">{seg.label}</span>
            <span className="font-semibold text-gray-900">
              {seg.value} ({Math.round((seg.value / total) * 100)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
