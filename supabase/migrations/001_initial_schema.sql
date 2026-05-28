-- CarLeads CRM — Initial Database Schema
-- Supabase/PostgreSQL Migration
-- Created for Webiox Agency, Surat

-- ============================================
-- DEALERS (users/shop owners)
-- ============================================
CREATE TABLE dealers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE,
  phone TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  shop_name TEXT,
  city TEXT DEFAULT 'Surat',
  state TEXT DEFAULT 'Gujarat',
  plan TEXT DEFAULT 'basic' CHECK (plan IN ('basic', 'pro', 'premium')),
  whatsapp_connected BOOLEAN DEFAULT false,
  instagram_connected BOOLEAN DEFAULT false,
  whatsapp_phone_id TEXT,
  instagram_page_id TEXT,
  notification_hot_lead BOOLEAN DEFAULT true,
  notification_daily_summary BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- LEADS (incoming customer queries)
-- ============================================
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id UUID REFERENCES dealers(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('whatsapp', 'instagram', 'manual', 'olx')),
  sender_name TEXT,
  sender_phone TEXT,
  sender_handle TEXT,
  message_preview TEXT,
  ai_score INTEGER CHECK (ai_score BETWEEN 1 AND 10),
  ai_tag TEXT CHECK (ai_tag IN ('hot', 'warm', 'fake')),
  ai_reason TEXT,
  ai_signals JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'follow_up', 'converted', 'lost')),
  is_read BOOLEAN DEFAULT false,
  external_message_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- LEAD MESSAGES (conversation threads)
-- ============================================
CREATE TABLE lead_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  message_text TEXT,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'voice', 'video', 'media')),
  platform_message_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- NOTIFICATIONS
-- ============================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id UUID REFERENCES dealers(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('hot_lead', 'follow_up_reminder', 'daily_summary')),
  title TEXT NOT NULL,
  body TEXT,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  is_read BOOLEAN DEFAULT false,
  sent_via TEXT DEFAULT 'in_app' CHECK (sent_via IN ('in_app', 'whatsapp', 'both')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES for performance
-- ============================================
CREATE INDEX idx_leads_dealer_score ON leads(dealer_id, ai_score DESC);
CREATE INDEX idx_leads_dealer_created ON leads(dealer_id, created_at DESC);
CREATE INDEX idx_leads_platform ON leads(platform);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_tag ON leads(ai_tag);
CREATE INDEX idx_leads_external_id ON leads(external_message_id) WHERE external_message_id IS NOT NULL;
CREATE INDEX idx_messages_lead ON lead_messages(lead_id, created_at);
CREATE INDEX idx_notifications_dealer ON notifications(dealer_id, is_read, created_at DESC);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE dealers ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Dealers can only see their own data
CREATE POLICY "Dealers can view own profile" ON dealers
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Dealers can update own profile" ON dealers
  FOR UPDATE USING (auth.uid() = id);

-- Leads scoped to dealer
CREATE POLICY "Dealers can view own leads" ON leads
  FOR SELECT USING (dealer_id = auth.uid());

CREATE POLICY "Dealers can insert own leads" ON leads
  FOR INSERT WITH CHECK (dealer_id = auth.uid());

CREATE POLICY "Dealers can update own leads" ON leads
  FOR UPDATE USING (dealer_id = auth.uid());

CREATE POLICY "Dealers can delete own leads" ON leads
  FOR DELETE USING (dealer_id = auth.uid());

-- Messages scoped via lead ownership
CREATE POLICY "Dealers can view own lead messages" ON lead_messages
  FOR SELECT USING (
    lead_id IN (SELECT id FROM leads WHERE dealer_id = auth.uid())
  );

CREATE POLICY "Dealers can insert own lead messages" ON lead_messages
  FOR INSERT WITH CHECK (
    lead_id IN (SELECT id FROM leads WHERE dealer_id = auth.uid())
  );

-- Notifications scoped to dealer
CREATE POLICY "Dealers can view own notifications" ON notifications
  FOR SELECT USING (dealer_id = auth.uid());

CREATE POLICY "Dealers can update own notifications" ON notifications
  FOR UPDATE USING (dealer_id = auth.uid());

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_dealers_updated_at
  BEFORE UPDATE ON dealers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- REALTIME SUBSCRIPTIONS
-- ============================================
-- Enable realtime for leads and notifications
ALTER PUBLICATION supabase_realtime ADD TABLE leads;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
