'use client';

import { cn, timeAgo, truncate, formatPhone } from '@/lib/utils';
import ScoreBadge from './ScoreBadge';
import PlatformIcon from './PlatformIcon';
import { Eye, EyeOff, ExternalLink, Bot } from 'lucide-react';

/**
 * LeadCard — Individual lead card in the inbox list
 */
export default function LeadCard({ lead, isSelected, onClick }) {
  const isUnread = !lead.is_read;

  return (
    <button
      onClick={() => onClick(lead)}
      className={cn(
        'w-full text-left p-4 border-b border-border transition-all duration-200 cursor-pointer group',
        'hover:bg-surface-hover',
        isSelected && 'bg-surface-hover border-l-2 border-l-primary',
        !isSelected && 'border-l-2 border-l-transparent',
        isUnread && 'bg-surface/80'
      )}
    >
      {/* Top row: Name + Score + Time */}
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {/* Unread dot */}
          {isUnread && (
            <span className="flex-shrink-0 w-2 h-2 rounded-full bg-primary pulse-dot" />
          )}

          {/* Platform icon */}
          <PlatformIcon platform={lead.platform} size={14} />

          {/* Sender name */}
          <span
            className={cn(
              'truncate text-sm',
              isUnread ? 'font-semibold text-text-primary' : 'font-medium text-text-secondary'
            )}
          >
            {lead.sender_name || 'Unknown'}
          </span>
        </div>

        {/* Score badge + time */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <ScoreBadge score={lead.ai_score} size="sm" />
          <span className="text-xs text-text-muted whitespace-nowrap" suppressHydrationWarning>
            {timeAgo(lead.created_at)}
          </span>
        </div>
      </div>

      {/* Message preview */}
      <p
        className={cn(
          'text-sm leading-relaxed mb-2 pl-4',
          isUnread ? 'text-text-primary' : 'text-text-secondary'
        )}
      >
        {truncate(lead.message_preview, 100)}
      </p>

      {/* Bottom row: Status + Phone/Handle + Actions */}
      <div className="flex items-center justify-between pl-4">
        <div className="flex items-center gap-2">
          {lead.auto_reply_active ? (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-primary-muted text-primary border border-primary/20 flex items-center gap-1">
              <Bot size={12} />
              AI Qualifying...
            </span>
          ) : lead.auto_reply_count > 0 ? (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-hot-bg text-hot border border-hot/20 flex items-center gap-1">
              <Bot size={12} />
              Ready for dealer
            </span>
          ) : (
            <span
              className={cn(
                'text-xs px-2 py-0.5 rounded-full font-medium',
                lead.status === 'new' && 'bg-primary-muted text-primary',
                lead.status === 'contacted' && 'bg-hot-bg text-hot',
                lead.status === 'follow_up' && 'bg-warm-bg text-warm',
                lead.status === 'converted' && 'bg-hot-bg text-hot',
                lead.status === 'lost' && 'bg-fake-bg text-fake'
              )}
            >
              {lead.status === 'new'
                ? 'New'
                : lead.status === 'contacted'
                  ? 'Contacted'
                  : lead.status === 'follow_up'
                    ? 'Follow Up'
                    : lead.status === 'converted'
                      ? 'Converted'
                      : 'Lost'}
            </span>
          )}

          {/* Contact info */}
          {lead.sender_phone && (
            <span className="text-xs text-text-muted font-mono-numbers">
              {formatPhone(lead.sender_phone).slice(-10)}
            </span>
          )}
          {lead.sender_handle && (
            <span className="text-xs text-text-muted">
              {lead.sender_handle}
            </span>
          )}
        </div>

        {/* Quick action (shows on hover) */}
        {lead.ai_tag === 'hot' && lead.sender_phone && (
          <a
            href={`https://wa.me/${lead.sender_phone.replace('+', '')}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-xs text-whatsapp hover:text-whatsapp/80 font-medium"
          >
            <ExternalLink size={12} />
            Reply
          </a>
        )}
      </div>
    </button>
  );
}
