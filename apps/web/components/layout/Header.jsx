'use client';

import { Bell, Search, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { mockNotifications } from '@/lib/mock-data';
import { useState } from 'react';

/**
 * Header — Top bar with search, notifications, and user avatar
 */
export default function Header({ title, subtitle }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const unreadCount = mockNotifications.filter((n) => !n.is_read).length;

  return (
    <header className="flex items-center justify-between h-16 px-4 md:px-6 border-b border-border bg-surface/50 backdrop-blur-sm flex-shrink-0">
      {/* Left: Title */}
      <div className="min-w-0">
        <h1 className="text-lg font-semibold text-text-primary truncate">
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs text-text-muted">{subtitle}</p>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <button
          onClick={() => setSearchOpen(!searchOpen)}
          className="p-2 rounded-lg hover:bg-surface-hover transition-colors text-text-muted hover:text-text-primary"
        >
          <Search size={18} />
        </button>

        {/* Notifications */}
        <button className="relative p-2 rounded-lg hover:bg-surface-hover transition-colors text-text-muted hover:text-text-primary">
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-fake text-white text-[10px] font-bold flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </button>

        {/* User avatar */}
        <button className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center text-white text-xs font-bold ml-1">
          KP
        </button>
      </div>
    </header>
  );
}
