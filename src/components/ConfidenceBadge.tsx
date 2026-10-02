import { confidenceLevel, confidenceColor, confidenceLabel } from '@/lib/confidence';

interface Props {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function ConfidenceBadge({ score, size = 'md', showLabel = true }: Props) {
  const level = confidenceLevel(score);
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-semibold ${confidenceColor(level)} ${sizeClasses[size]}`}
      role="img"
      aria-label={`Availability confidence: ${confidenceLabel(level)}, ${score} percent`}
    >
      <span
        className={`inline-block h-2 w-2 rounded-full ${
          level === 'high' ? 'bg-green-600' : level === 'medium' ? 'bg-amber-600' : 'bg-red-600'
        }`}
      />
      {score}%
      {showLabel && <span className="font-normal opacity-80">{confidenceLabel(level)}</span>}
    </span>
  );
}
