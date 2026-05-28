'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Users, Flame, ArrowUpRight, ShieldAlert,
  MessageCircle, Camera as Instagram, PenLine, TrendingUp, ExternalLink,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import { cn, timeAgo } from '@/lib/utils';
import AppShell from '@/components/layout/AppShell';
import Header from '@/components/layout/Header';
import ScoreBadge from '@/components/leads/ScoreBadge';
import PlatformIcon from '@/components/leads/PlatformIcon';

// ── Animated Counter Hook ──
function useAnimatedCounter(end, duration = 1200) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    let startTime = null;
    let animationFrame;

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setCount(Math.floor(eased * end));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration]);

  return count;
}

// ── Stats Card ──
function StatsCard({ label, value, suffix = '', icon: Icon, color, trend }) {
  const animatedValue = useAnimatedCounter(value);

  return (
    <div className="card card-elevated p-5 group hover:shadow-elevated transition-all duration-300">
      <div className="flex items-start justify-between mb-3">
        <div
          className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110',
            color
          )}
        >
          <Icon size={18} className="text-white" />
        </div>
        {trend && (
          <span className="flex items-center gap-0.5 text-xs font-medium text-hot">
            <TrendingUp size={12} />
            {trend}
          </span>
        )}
      </div>
      <div className="font-mono-numbers text-3xl font-bold text-text-primary mb-1 animate-count-up">
        {animatedValue}{suffix}
      </div>
      <p className="text-sm text-text-secondary">{label}</p>
    </div>
  );
}

// ── Custom Tooltip ──
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface border border-border rounded-lg px-3 py-2 shadow-elevated text-sm">
      <p className="text-text-muted text-xs mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="font-mono-numbers font-semibold" style={{ color: p.color }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
}

import { useLeads } from '@/hooks/useLeads';
import { Loader2 } from 'lucide-react';

export default function DashboardPage() {
  const { leads, loading } = useLeads();

  const { overview, byPlatform, scoreDistribution, weekly, followUpLeads, recentHotLeads } = useMemo(() => {
    // 1. Overview
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const leadsToday = leads.filter(l => new Date(l.created_at) >= today);
    const hotLeadsToday = leadsToday.filter(l => l.ai_score >= 7);
    
    const leadsWithAction = leads.filter(l => l.status !== 'new');
    const responseRate = leads.length > 0 ? Math.round((leadsWithAction.length / leads.length) * 100) : 0;
    
    const fakeLeads = leads.filter(l => l.ai_score <= 3 || l.ai_tag === 'fake');
    const fakePercentage = leads.length > 0 ? Math.round((fakeLeads.length / leads.length) * 100) : 0;

    const overview = {
      totalLeadsToday: leadsToday.length,
      hotLeadsToday: hotLeadsToday.length,
      responseRate,
      fakePercentage
    };

    // 2. By Platform
    const byPlatform = [
      { platform: 'WhatsApp', count: leads.filter(l => l.platform === 'whatsapp').length, color: '#00D26A' },
      { platform: 'Instagram', count: leads.filter(l => l.platform === 'instagram').length, color: '#E1306C' }
    ].filter(p => p.count > 0);
    
    // Fallback if empty so chart doesn't break
    if (byPlatform.length === 0) byPlatform.push({ platform: 'No Data', count: 1, color: '#2A2D37' });

    // 3. Score Distribution
    const scoreDistribution = [
      { range: '1-3 (Fake)', count: fakeLeads.length, color: '#FF3B30' },
      { range: '4-6 (Warm)', count: leads.filter(l => l.ai_score >= 4 && l.ai_score <= 6).length, color: '#FF9500' },
      { range: '7-10 (Hot)', count: leads.filter(l => l.ai_score >= 7 || l.ai_tag === 'hot').length, color: '#00D26A' }
    ];

    // 4. Weekly Trend (Last 7 days)
    const weeklyMap = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStr = d.toLocaleDateString('en-US', { weekday: 'short' });
      weeklyMap[dayStr] = { day: dayStr, leads: 0, hot: 0 };
    }
    
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);
    
    leads.forEach(l => {
      const date = new Date(l.created_at);
      if (date >= sevenDaysAgo) {
        const dayStr = date.toLocaleDateString('en-US', { weekday: 'short' });
        if (weeklyMap[dayStr]) {
          weeklyMap[dayStr].leads++;
          if (l.ai_score >= 7 || l.ai_tag === 'hot') weeklyMap[dayStr].hot++;
        }
      }
    });
    
    const weekly = Object.values(weeklyMap);

    // 5. Follow-up Leads
    const followUpLeads = leads
      .filter((l) => {
        const age = Date.now() - new Date(l.created_at).getTime();
        return l.status === 'new' && l.ai_tag !== 'fake' && age > 3600000;
      })
      .slice(0, 3);

    // 6. Recent Hot Leads
    const recentHotLeads = leads
      .filter((l) => l.ai_score >= 7 || l.ai_tag === 'hot')
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5);

    return { overview, byPlatform, scoreDistribution, weekly, followUpLeads, recentHotLeads };
  }, [leads]);

  if (loading) {
    return (
      <AppShell>
        <Header title="Dashboard" subtitle="Shree Motors • Surat" />
        <div className="flex-1 flex items-center justify-center p-4">
          <Loader2 className="animate-spin text-primary w-8 h-8" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <Header title="Dashboard" subtitle="Shree Motors • Surat" />

      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        {/* ── Stats Row ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 fade-stagger">
          <StatsCard
            label="Today's Leads"
            value={overview.totalLeadsToday}
            icon={Users}
            color="bg-gradient-to-br from-primary to-primary-hover"
            trend="+12%"
          />
          <StatsCard
            label="Hot Leads"
            value={overview.hotLeadsToday}
            icon={Flame}
            color="bg-gradient-to-br from-hot to-emerald-600"
            trend="+3"
          />
          <StatsCard
            label="Response Rate"
            value={overview.responseRate}
            suffix="%"
            icon={ArrowUpRight}
            color="bg-gradient-to-br from-info to-blue-600"
          />
          <StatsCard
            label="Fake Lead %"
            value={overview.fakePercentage}
            suffix="%"
            icon={ShieldAlert}
            color="bg-gradient-to-br from-fake to-red-600"
          />
        </div>

        {/* ── Charts Grid (Bento) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Leads by Platform — Donut */}
          <div className="card card-elevated p-5">
            <h3 className="text-sm font-semibold text-text-secondary mb-4 uppercase tracking-wider">
              Leads by Platform
            </h3>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={byPlatform}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="count"
                    nameKey="platform"
                    stroke="none"
                  >
                    {byPlatform.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    iconType="circle"
                    iconSize={8}
                    formatter={(value) => (
                      <span className="text-xs text-text-secondary">{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Score Distribution — Bar */}
          <div className="card card-elevated p-5">
            <h3 className="text-sm font-semibold text-text-secondary mb-4 uppercase tracking-wider">
              Score Distribution
            </h3>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={scoreDistribution} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2D37" vertical={false} />
                  <XAxis
                    dataKey="range"
                    tick={{ fill: '#8B8F9A', fontSize: 11 }}
                    axisLine={{ stroke: '#2A2D37' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#8B8F9A', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="Leads" radius={[4, 4, 0, 0]}>
                    {scoreDistribution.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Weekly Trend — Line */}
          <div className="card card-elevated p-5">
            <h3 className="text-sm font-semibold text-text-secondary mb-4 uppercase tracking-wider">
              This Week
            </h3>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weekly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2D37" vertical={false} />
                  <XAxis
                    dataKey="day"
                    tick={{ fill: '#8B8F9A', fontSize: 11 }}
                    axisLine={{ stroke: '#2A2D37' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#8B8F9A', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="leads"
                    name="Total"
                    stroke="#6C5CE7"
                    strokeWidth={2}
                    dot={{ fill: '#6C5CE7', r: 4, strokeWidth: 0 }}
                    activeDot={{ r: 6, fill: '#6C5CE7' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="hot"
                    name="Hot"
                    stroke="#00D26A"
                    strokeWidth={2}
                    dot={{ fill: '#00D26A', r: 3, strokeWidth: 0 }}
                    strokeDasharray="4 4"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* ── Bottom Row ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Recent Hot Leads */}
          <div className="card card-elevated p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
                Recent Hot Leads
              </h3>
              <a
                href="/leads"
                className="text-xs text-primary hover:text-primary-hover font-medium flex items-center gap-1"
              >
                View All <ArrowUpRight size={12} />
              </a>
            </div>
            <div className="space-y-3">
              {recentHotLeads.map((lead) => (
                <div
                  key={lead.id}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-surface-hover transition-colors group"
                >
                  <div className="w-9 h-9 rounded-full bg-hot-bg flex items-center justify-center text-hot text-sm font-bold flex-shrink-0">
                    {(lead.sender_name || '?')[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-text-primary truncate">
                        {lead.sender_name}
                      </span>
                      <PlatformIcon platform={lead.platform} size={12} />
                    </div>
                    <p className="text-xs text-text-muted truncate">
                      {lead.message_preview}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <ScoreBadge score={lead.ai_score} size="sm" />
                    {lead.sender_phone && (
                      <a
                        href={`https://wa.me/${lead.sender_phone.replace('+', '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md bg-whatsapp/10 text-whatsapp hover:bg-whatsapp/20 transition-all"
                      >
                        <MessageCircle size={14} />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Follow-up Reminders */}
          <div className="card card-elevated p-5">
            <h3 className="text-sm font-semibold text-text-secondary mb-4 uppercase tracking-wider">
              Follow-up Reminders
            </h3>
            {followUpLeads.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-text-muted">All caught up! No follow-ups needed.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {followUpLeads.map((lead) => {
                  const age = Date.now() - new Date(lead.created_at).getTime();
                  const hours = Math.floor(age / 3600000);
                  return (
                    <div
                      key={lead.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-warm-bg/30 border border-warm/10"
                    >
                      <div className="w-9 h-9 rounded-full bg-warm-bg flex items-center justify-center text-warm text-sm font-bold flex-shrink-0">
                        {(lead.sender_name || '?')[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-text-primary truncate block">
                          {lead.sender_name}
                        </span>
                        <span className="text-xs text-warm font-medium">
                          No response for {hours}h
                        </span>
                      </div>
                      <a
                        href="/leads"
                        className="px-3 py-1.5 rounded-md bg-warm/10 text-warm text-xs font-medium hover:bg-warm/20 transition-colors"
                      >
                        Reply Now
                      </a>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
