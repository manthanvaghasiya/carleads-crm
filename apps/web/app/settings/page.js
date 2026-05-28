'use client';

import { useState } from 'react';
import {
  User, Store, Phone, MapPin, MessageCircle, Camera as Instagram,
  Bell, BellOff, Users, Lock, Check, X, ExternalLink, ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { mockDealer } from '@/lib/mock-data';
import AppShell from '@/components/layout/AppShell';
import Header from '@/components/layout/Header';

// ── Toggle Switch ──
function Toggle({ enabled, onChange, label, description }) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="text-sm font-medium text-text-primary">{label}</p>
        {description && (
          <p className="text-xs text-text-muted mt-0.5">{description}</p>
        )}
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={cn(
          'relative w-11 h-6 rounded-full transition-colors duration-200',
          enabled ? 'bg-primary' : 'bg-surface-active'
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200',
            enabled && 'translate-x-5'
          )}
        />
      </button>
    </div>
  );
}

// ── Connection Status ──
function ConnectionCard({ platform, connected, icon: Icon, color, onConnect }) {
  return (
    <div className="card p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center',
            connected ? `${color} bg-opacity-15` : 'bg-surface-hover'
          )}
          style={connected ? { backgroundColor: `${color}20` } : {}}
        >
          <Icon size={20} style={{ color: connected ? color : '#5C6070' }} />
        </div>
        <div>
          <p className="text-sm font-semibold text-text-primary">{platform}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span
              className={cn(
                'w-2 h-2 rounded-full',
                connected ? 'bg-hot' : 'bg-fake'
              )}
            />
            <span className="text-xs text-text-muted">
              {connected ? 'Connected' : 'Not connected'}
            </span>
          </div>
        </div>
      </div>
      <button
        onClick={onConnect}
        className={cn(
          'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
          connected
            ? 'bg-surface-hover text-text-secondary hover:bg-surface-active'
            : 'bg-primary text-white hover:bg-primary-hover'
        )}
      >
        {connected ? 'Manage' : 'Connect'}
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const [dealer, setDealer] = useState(mockDealer);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const updateField = (field, value) => {
    setDealer((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <AppShell>
      <Header title="Settings" />

      <div className="flex-1 overflow-y-auto p-4 md:p-6 max-w-3xl">
        {/* ── Profile Section ── */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4 flex items-center gap-2">
            <User size={14} />
            My Profile
          </h2>
          <div className="card p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  value={dealer.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  className="w-full bg-surface-hover border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1.5">
                  Shop Name
                </label>
                <div className="relative">
                  <Store
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
                  />
                  <input
                    type="text"
                    value={dealer.shop_name}
                    onChange={(e) => updateField('shop_name', e.target.value)}
                    className="w-full bg-surface-hover border border-border rounded-lg pl-9 pr-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1.5">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
                  />
                  <input
                    type="tel"
                    value={dealer.phone}
                    onChange={(e) => updateField('phone', e.target.value)}
                    className="w-full bg-surface-hover border border-border rounded-lg pl-9 pr-3 py-2.5 text-sm text-text-primary font-mono-numbers focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1.5">
                  City
                </label>
                <div className="relative">
                  <MapPin
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
                  />
                  <input
                    type="text"
                    value={dealer.city}
                    onChange={(e) => updateField('city', e.target.value)}
                    className="w-full bg-surface-hover border border-border rounded-lg pl-9 pr-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Plan badge */}
            <div className="flex items-center gap-2 pt-2 border-t border-border">
              <span className="text-xs text-text-muted">Current Plan:</span>
              <span className="text-xs font-semibold text-primary bg-primary-muted px-2.5 py-1 rounded-full uppercase">
                {dealer.plan}
              </span>
            </div>

            <button
              onClick={handleSave}
              className={cn(
                'px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                saved
                  ? 'bg-hot text-white'
                  : 'bg-primary text-white hover:bg-primary-hover shadow-glow-primary'
              )}
            >
              {saved ? (
                <span className="flex items-center gap-2">
                  <Check size={14} /> Saved!
                </span>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </section>

        {/* ── Platform Connections ── */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4 flex items-center gap-2">
            <MessageCircle size={14} />
            Platform Connections
          </h2>
          <div className="space-y-3">
            <ConnectionCard
              platform="WhatsApp Business"
              connected={dealer.whatsapp_connected}
              icon={MessageCircle}
              color="#25D366"
              onConnect={() => updateField('whatsapp_connected', !dealer.whatsapp_connected)}
            />
            <ConnectionCard
              platform="Instagram"
              connected={dealer.instagram_connected}
              icon={Instagram}
              color="#E1306C"
              onConnect={() => updateField('instagram_connected', !dealer.instagram_connected)}
            />
          </div>

          {/* Setup Guide */}
          <div className="card p-4 mt-3 border-dashed">
            <p className="text-xs text-text-muted mb-2 font-medium">
              WhatsApp Setup Guide:
            </p>
            <ol className="text-xs text-text-muted space-y-1 list-decimal list-inside">
              <li>Create a Meta Developer account at developers.facebook.com</li>
              <li>Set up a WhatsApp Business API app</li>
              <li>Get your Phone Number ID and Access Token</li>
              <li>Set the webhook URL to your API endpoint</li>
            </ol>
          </div>
        </section>

        {/* ── Notification Preferences ── */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4 flex items-center gap-2">
            <Bell size={14} />
            Notifications
          </h2>
          <div className="card p-5">
            <Toggle
              enabled={dealer.notification_hot_lead}
              onChange={(v) => updateField('notification_hot_lead', v)}
              label="Hot Lead WhatsApp Alerts"
              description="Get instant WhatsApp notification when a hot lead (score 7+) arrives"
            />
            <div className="border-t border-border" />
            <Toggle
              enabled={dealer.notification_daily_summary}
              onChange={(v) => updateField('notification_daily_summary', v)}
              label="Daily Summary"
              description="Receive a daily summary of all leads at 9 AM"
            />
          </div>
        </section>

        {/* ── Team Members (Premium) ── */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4 flex items-center gap-2">
            <Users size={14} />
            Team Members
          </h2>
          <div className="card p-5">
            {dealer.plan === 'premium' ? (
              <div>
                <p className="text-sm text-text-secondary mb-3">
                  Invite team members to access the CRM.
                </p>
                <div className="flex gap-2">
                  <input
                    type="tel"
                    placeholder="Enter phone number"
                    className="flex-1 bg-surface-hover border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary"
                  />
                  <button className="px-4 py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-hover transition-colors">
                    Invite
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 opacity-60">
                <Lock size={20} className="text-text-muted" />
                <div>
                  <p className="text-sm font-medium text-text-primary">
                    Premium Feature
                  </p>
                  <p className="text-xs text-text-muted">
                    Upgrade to Premium to invite team members.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
