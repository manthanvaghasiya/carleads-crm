'use client';

import { cn } from '@/lib/utils';
import { Flame, ThermometerSun, ShieldAlert, Inbox, MessageCircle, Camera as Instagram } from 'lucide-react';

const FILTERS = [
  { key: 'all', label: 'All Leads', icon: Inbox },
  { key: 'hot', label: 'Hot', icon: Flame },
  { key: 'warm', label: 'Warm', icon: ThermometerSun },
  { key: 'fake', label: 'Fake', icon: ShieldAlert },
];

const PLATFORMS = [
  { key: 'all', label: 'All Platforms' },
  { key: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { key: 'instagram', label: 'Instagram', icon: Instagram },
];

/**
 * LeadFilters — Tab-style filter bar for lead inbox
 */
export default function LeadFilters({
  activeFilter,
  activePlatform,
  onFilterChange,
  onPlatformChange,
  counts,
}) {
  return (
    <div className="flex flex-col gap-3 px-4 py-3 border-b border-border bg-surface/50">
      {/* Score filter tabs */}
      <div className="flex items-center gap-1">
        {FILTERS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => onFilterChange(key)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200',
              activeFilter === key
                ? 'bg-primary/15 text-primary shadow-[0_0_12px_rgba(108,92,231,0.15)]'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
            )}
          >
            <Icon size={14} />
            <span>{label}</span>
            {counts?.[key] !== undefined && (
              <span
                className={cn(
                  'font-mono-numbers text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center',
                  activeFilter === key
                    ? 'bg-primary/20 text-primary'
                    : 'bg-surface-active text-text-muted'
                )}
              >
                {counts[key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Platform filter */}
      <div className="flex items-center gap-1">
        {PLATFORMS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => onPlatformChange(key)}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-200',
              activePlatform === key
                ? 'bg-surface-active text-text-primary border border-border-light'
                : 'text-text-muted hover:text-text-secondary hover:bg-surface-hover'
            )}
          >
            {Icon && (
              <Icon
                size={12}
                className={cn(
                  key === 'whatsapp' && 'text-whatsapp',
                  key === 'instagram' && 'text-instagram'
                )}
              />
            )}
            <span>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
