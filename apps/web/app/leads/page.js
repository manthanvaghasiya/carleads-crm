'use client';

import { useState, useMemo } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLeads } from '@/hooks/useLeads';
import AppShell from '@/components/layout/AppShell';
import Header from '@/components/layout/Header';
import LeadCard from '@/components/leads/LeadCard';
import LeadFilters from '@/components/leads/LeadFilters';
import LeadDetail from '@/components/leads/LeadDetail';
import EmptyState from '@/components/leads/EmptyState';

export default function LeadsPage() {
  const { leads, loading, updateLeadStatus, markAsRead } = useLeads();
  const [selectedLead, setSelectedLead] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [activePlatform, setActivePlatform] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // ── Filtered leads ──
  const filteredLeads = useMemo(() => {
    let result = [...leads];

    // Filter by score tag
    if (activeFilter !== 'all') {
      result = result.filter((l) => l.ai_tag === activeFilter);
    }

    // Filter by platform
    if (activePlatform !== 'all') {
      result = result.filter((l) => l.platform === activePlatform);
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (l) =>
          (l.sender_name || '').toLowerCase().includes(q) ||
          (l.message_preview || '').toLowerCase().includes(q) ||
          (l.sender_phone || '').includes(q) ||
          (l.sender_handle || '').toLowerCase().includes(q)
      );
    }

    // Sort by score DESC, then by created_at DESC
    result.sort((a, b) => {
      if (b.ai_score !== a.ai_score) return b.ai_score - a.ai_score;
      return new Date(b.created_at) - new Date(a.created_at);
    });

    return result;
  }, [leads, activeFilter, activePlatform, searchQuery]);

  // ── Filter counts ──
  const counts = useMemo(() => {
    const base = activePlatform !== 'all'
      ? leads.filter((l) => l.platform === activePlatform)
      : leads;
    return {
      all: base.length,
      hot: base.filter((l) => l.ai_tag === 'hot').length,
      warm: base.filter((l) => l.ai_tag === 'warm').length,
      fake: base.filter((l) => l.ai_tag === 'fake').length,
    };
  }, [leads, activePlatform]);

  // ── Handlers ──
  const handleSelectLead = (lead) => {
    setSelectedLead(lead);
    // Mark as read
    if (!lead.is_read) {
      markAsRead(lead.id);
    }
  };

  const handleStatusChange = (leadId, newStatus) => {
    updateLeadStatus(leadId, newStatus);
    if (selectedLead?.id === leadId) {
      setSelectedLead((prev) => ({ ...prev, status: newStatus }));
    }
  };

  const handleCloseDetail = () => {
    setSelectedLead(null);
  };

  return (
    <AppShell>
      {/* Header */}
      <Header
        title="Lead Inbox"
        subtitle={`${filteredLeads.length} leads • ${counts.hot} hot`}
      />

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Lead list */}
        <div
          className={cn(
            'flex flex-col border-r border-border transition-all duration-300 overflow-hidden',
            selectedLead
              ? 'hidden md:flex md:w-[380px] lg:w-[420px]'
              : 'w-full'
          )}
        >
          {/* Search bar */}
          <div className="px-4 py-2 border-b border-border">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search leads by name, message, phone..."
                className="w-full bg-surface-hover border border-border rounded-lg pl-10 pr-8 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Filters */}
          <LeadFilters
            activeFilter={activeFilter}
            activePlatform={activePlatform}
            onFilterChange={setActiveFilter}
            onPlatformChange={setActivePlatform}
            counts={counts}
          />

          {/* Lead list */}
          <div className="flex-1 overflow-y-auto fade-stagger">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full space-y-4">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-sm text-text-muted">Loading live leads...</p>
              </div>
            ) : filteredLeads.length === 0 ? (
              <EmptyState
                type={leads.length === 0 ? 'no-leads' : 'no-results'}
              />
            ) : (
              filteredLeads.map((lead) => (
                <LeadCard
                  key={lead.id}
                  lead={lead}
                  isSelected={selectedLead?.id === lead.id}
                  onClick={handleSelectLead}
                />
              ))
            )}
          </div>
        </div>

        {/* Right: Lead detail panel */}
        {selectedLead ? (
          <div
            className={cn(
              'flex-1 min-w-0',
              'flex flex-col'
            )}
          >
            <LeadDetail
              lead={selectedLead}
              onClose={handleCloseDetail}
              onStatusChange={handleStatusChange}
            />
          </div>
        ) : (
          /* Empty state when no lead selected (desktop) */
          <div className="hidden md:flex flex-1 items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-surface-hover flex items-center justify-center mx-auto mb-4">
                <Search size={24} className="text-text-muted opacity-40" />
              </div>
              <p className="text-sm text-text-muted">
                Select a lead to view details
              </p>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
