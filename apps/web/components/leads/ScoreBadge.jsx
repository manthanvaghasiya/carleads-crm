'use client';

import { cn } from '@/lib/utils';

/**
 * ScoreBadge — Color-coded AI score badge
 * Green (7-10 hot), Amber (4-6 warm), Red (1-3 fake)
 */
export default function ScoreBadge({ score, showLabel = false, size = 'md' }) {
  const tag = score >= 7 ? 'hot' : score >= 4 ? 'warm' : 'fake';

  const label =
    score >= 9
      ? 'Super Hot'
      : score >= 7
        ? 'Hot'
        : score >= 5
          ? 'Warm'
          : score >= 3
            ? 'Cool'
            : 'Fake';

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-sm px-2.5 py-1 gap-1.5',
    lg: 'text-base px-3 py-1.5 gap-2',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center font-mono-numbers font-semibold rounded-full transition-all duration-200',
        sizeClasses[size],
        tag === 'hot' && 'score-hot',
        tag === 'warm' && 'score-warm',
        tag === 'fake' && 'score-fake'
      )}
    >
      <span className="relative flex h-2 w-2">
        {tag === 'hot' && (
          <span className="absolute inline-flex h-full w-full rounded-full bg-hot opacity-40 pulse-dot" />
        )}
        <span
          className={cn(
            'relative inline-flex h-2 w-2 rounded-full',
            tag === 'hot' && 'bg-hot',
            tag === 'warm' && 'bg-warm',
            tag === 'fake' && 'bg-fake'
          )}
        />
      </span>
      <span>{score}</span>
      {showLabel && (
        <span className="font-sans font-medium text-xs opacity-80">
          {label}
        </span>
      )}
    </span>
  );
}
