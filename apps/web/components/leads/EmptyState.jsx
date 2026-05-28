'use client';

import { MessageCircle, Plug } from 'lucide-react';

/**
 * EmptyState — Shown when no leads match filters or no leads exist
 */
export default function EmptyState({ type = 'no-leads' }) {
  if (type === 'no-results') {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-surface-hover flex items-center justify-center mb-4">
          <MessageCircle size={28} className="text-text-muted" />
        </div>
        <h3 className="text-lg font-semibold text-text-primary mb-2">
          No leads match your filters
        </h3>
        <p className="text-sm text-text-secondary max-w-[280px]">
          Try adjusting your filters or search to find the leads you&apos;re looking for.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
          <Plug size={32} className="text-primary" />
        </div>
        <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-warm flex items-center justify-center">
          <span className="text-xs font-bold text-background">!</span>
        </div>
      </div>
      <h3 className="text-lg font-semibold text-text-primary mb-2">
        No leads yet
      </h3>
      <p className="text-sm text-text-secondary max-w-[320px] mb-6">
        Connect your WhatsApp Business account to start receiving leads automatically.
      </p>
      <a
        href="/settings"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-hover transition-all duration-200 shadow-[0_0_20px_rgba(108,92,231,0.3)]"
      >
        <Plug size={14} />
        Connect WhatsApp
      </a>
    </div>
  );
}
