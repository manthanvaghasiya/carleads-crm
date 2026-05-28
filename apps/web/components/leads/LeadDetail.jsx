'use client';

import { X, ExternalLink, Phone, MessageCircle, CheckCircle, Clock, User, Zap, Send } from 'lucide-react';
import { cn, timeAgo, formatPhone, platformName } from '@/lib/utils';
import ScoreBadge from './ScoreBadge';
import PlatformIcon from './PlatformIcon';
import { mockMessages } from '@/lib/mock-data';
import { useState } from 'react';

/**
 * LeadDetail — Slide-over panel showing full lead info + conversation
 */
export default function LeadDetail({ lead, onClose, onStatusChange }) {
  const [replyText, setReplyText] = useState('');
  const messages = mockMessages[lead.id] || [];

  if (!lead) return null;

  const tag = lead.ai_tag;
  const whatsappLink = lead.sender_phone
    ? `https://wa.me/${lead.sender_phone.replace('+', '')}`
    : null;

  return (
    <div className="flex flex-col h-full bg-background slide-in-right">
      {/* ── Header ── */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-surface/50">
        <div className="flex items-center gap-3 min-w-0">
          {/* Avatar */}
          <div
            className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0',
              tag === 'hot' && 'bg-hot-bg text-hot',
              tag === 'warm' && 'bg-warm-bg text-warm',
              tag === 'fake' && 'bg-fake-bg text-fake'
            )}
          >
            {(lead.sender_name || '?')[0].toUpperCase()}
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-text-primary truncate">
              {lead.sender_name || 'Unknown'}
            </h2>
            <div className="flex items-center gap-2 text-xs text-text-muted">
              <PlatformIcon platform={lead.platform} size={12} />
              <span>{platformName(lead.platform)}</span>
              <span>•</span>
              <span suppressHydrationWarning>{timeAgo(lead.created_at)}</span>
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-surface-hover transition-colors text-text-muted hover:text-text-primary"
        >
          <X size={18} />
        </button>
      </div>

      {/* ── AI Analysis Card ── */}
      <div className="p-4 border-b border-border">
        <div
          className={cn(
            'rounded-xl p-4',
            tag === 'hot' && 'bg-hot-bg/50 border border-hot/10',
            tag === 'warm' && 'bg-warm-bg/50 border border-warm/10',
            tag === 'fake' && 'bg-fake-bg/50 border border-fake/10'
          )}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Zap size={14} className="text-primary" />
              <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                AI Analysis
              </span>
            </div>
            <ScoreBadge score={lead.ai_score} showLabel size="md" />
          </div>
          <p className="text-sm text-text-primary leading-relaxed mb-3">
            {lead.ai_reason}
          </p>
          {lead.ai_signals && lead.ai_signals.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {lead.ai_signals.map((signal) => (
                <span
                  key={signal}
                  className="text-xs px-2 py-0.5 rounded-full bg-surface text-text-muted border border-border"
                >
                  {signal.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Contact Info ── */}
      <div className="p-4 border-b border-border space-y-2">
        {lead.sender_phone && (
          <div className="flex items-center gap-3 text-sm">
            <Phone size={14} className="text-text-muted flex-shrink-0" />
            <span className="font-mono-numbers text-text-primary">
              {formatPhone(lead.sender_phone)}
            </span>
          </div>
        )}
        {lead.sender_handle && (
          <div className="flex items-center gap-3 text-sm">
            <User size={14} className="text-text-muted flex-shrink-0" />
            <span className="text-text-primary">{lead.sender_handle}</span>
          </div>
        )}
      </div>

      {/* ── Quick Actions & Status ── */}
      <div className="p-4 border-b border-border space-y-3">
        <div className="flex items-center gap-2">
          {whatsappLink && (
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-whatsapp/10 text-whatsapp text-sm font-medium hover:bg-whatsapp/20 transition-colors"
            >
              <MessageCircle size={14} />
              Reply on WhatsApp
            </a>
          )}
          {lead.sender_phone && (
            <a
              href={`tel:${lead.sender_phone}`}
              className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-surface-hover text-text-secondary text-sm font-medium hover:text-text-primary hover:bg-surface-active transition-colors"
            >
              <Phone size={14} />
            </a>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-text-muted uppercase tracking-wider w-16">
            Status:
          </span>
          <select
            value={lead.status}
            onChange={(e) => onStatusChange?.(lead.id, e.target.value)}
            className="flex-1 bg-surface-hover border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary transition-colors"
          >
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="follow_up">Follow Up</option>
            <option value="converted">Converted</option>
            <option value="lost">Lost</option>
          </select>
        </div>
      </div>

      {/* ── Conversation Thread ── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
          Conversation
        </h3>
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <MessageCircle size={24} className="text-text-muted mx-auto mb-2 opacity-40" />
            <p className="text-sm text-text-muted">No conversation history yet</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
                msg.direction === 'inbound'
                  ? 'bg-surface border border-border mr-auto rounded-bl-md'
                  : 'bg-primary/15 text-primary-hover ml-auto rounded-br-md'
              )}
            >
              <p className={msg.direction === 'inbound' ? 'text-text-primary' : ''}>
                {msg.message_text || msg.content}
              </p>
              <span className="block text-xs text-text-muted mt-1 text-right" suppressHydrationWarning>
                {timeAgo(msg.created_at)}
              </span>
            </div>
          ))
        )}
      </div>

      {/* ── Add Note ── */}
      <div className="p-4 border-t border-border bg-surface/50">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Add a private note..."
            className="flex-1 bg-surface-hover border border-border rounded-lg px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors"
          />
          <button
            className="px-4 py-2.5 rounded-lg bg-surface-hover text-text-primary text-sm font-medium hover:bg-surface-active transition-colors disabled:opacity-50 border border-border"
            disabled={!replyText.trim()}
            onClick={() => setReplyText('')}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
