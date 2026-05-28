# CarLeads CRM — Claude Code Prompts v2.0
# Using: Superpowers + ui-ux-pro-max + antigravity-awesome-skills

---

## 🚀 MASTER START PROMPT (paste this first in every session)

```
Read CLAUDE.md fully. That is the complete project spec.

Project: CarLeads CRM — AI lead management for Indian car dealers (Webiox Agency, Surat)

Skills active:
- Superpowers (@brainstorming, @writing-plans, @test-driven-development)
- ui-ux-pro-max (design system in design-system/MASTER.md)
- antigravity (@architecture, @api-design-principles, @security-auditor, @react-patterns)

Follow Superpowers workflow: brainstorm → plan → test first → code → review.
Never jump to code without plan. Never write code before failing test exists.

Start: use @brainstorming to confirm MVP scope, then @writing-plans for Phase 1 tasks.
```

---

## 📦 ONE-TIME SETUP PROMPT

```
Read CLAUDE.md. Set up the full CarLeads CRM project from scratch.

Steps:
1. Create folder structure exactly as in CLAUDE.md
2. Init Next.js 14 in apps/web (JS not TS, App Router, Tailwind v3)
3. Install shadcn/ui dark theme
4. Install shadcn components: button card badge input dialog sheet tabs dropdown-menu avatar separator toggle tooltip
5. Init Express in apps/api
6. Create supabase/migrations/001_initial_schema.sql from CLAUDE.md schema
7. Create both .env template files
8. Run uipro design system generator:
   python3 .claude/skills/ui-ux-pro-max/scripts/search.py "car dealer crm sales dashboard" --design-system -p "CarLeads" --persist
9. Seed mock data: 20 leads (mix of hot/warm/fake), Indian names, Hinglish messages, real car models (Swift, Innova, Baleno, City)

Do NOT build UI yet. Setup only. Report what was created.
```

---

## 🎯 FEATURE PROMPTS

### Lead Inbox (Build First)
```
Read CLAUDE.md and design-system/MASTER.md.
Use @react-patterns skill.

Build Lead Inbox page: apps/web/app/leads/page.js

Requirements:
- All leads sorted by ai_score DESC, then created_at DESC
- LeadCard shows: sender name, platform icon (Lucide MessageCircle/Instagram), 
  score badge (green 7-10 / amber 4-6 / red 1-3), message preview (max 80 chars), 
  time ago, status chip
- LeadFilters: tabs All/Hot/Warm/Fake + platform dropdown + search input
- Click lead → LeadDetail opens as Sheet (slide-over, not new page)
- LeadDetail: full message, AI score breakdown, ai_reason, quick reply button, 
  status dropdown, add note input
- "Reply on WhatsApp" button → opens wa.me/{phone}
- Supabase Realtime: new leads appear without refresh
- Empty state: car icon + "No leads yet. Connect WhatsApp in Settings to start."
- Mobile: full-width cards, no sidebar visible

Write tests first (tests/leads.test.js) then build components.
Design tokens from design-system/MASTER.md. Dark mode only.
```

### AI Scoring Service
```
Read CLAUDE.md. Use @api-design-principles skill.

Build: apps/api/services/scorer.js

Write tests first in tests/scorer.test.js:
- "hello" → score <= 3, tag "fake"
- "price?" → score <= 3, tag "fake"  
- "koi acchi car hai" → score 4-6, tag "warm"
- "Swift 2019 chahiye budget 4 lakh cash Surat" → score >= 8, tag "hot"
- "Honda City 2022, 8 lakh budget, buying this week" → score >= 8, tag "hot"
- API timeout → returns {score:5, tag:"warm", reason:"AI unavailable"}

Then implement:
- Call Claude API (claude-sonnet-4-20250514, max_tokens:200)
- System prompt from CLAUDE.md
- Parse JSON response
- 3 second timeout
- Fallback on any error
- Log: lead_id, score, time_taken (must be < 3s)
```

### WhatsApp Webhook
```
Read CLAUDE.md. Use @security-auditor skill for this file.

Build: apps/api/routes/webhooks/whatsapp.js

Write tests first:
- GET with valid verify_token → returns challenge
- GET with wrong token → 403
- POST with invalid signature → 403
- POST with duplicate message_id → 200 but skip (idempotency)
- POST with valid message → creates lead, triggers scoring, returns 200

Implement:
- GET: verify hub.mode=subscribe, hub.verify_token, return hub.challenge
- POST: verify X-Hub-Signature-256 (HMAC SHA-256 with WHATSAPP_TOKEN)
- Extract: sender phone, name, message text, message ID
- Check external_message_id exists → skip if duplicate
- Insert into leads table (platform=whatsapp)
- Insert into lead_messages (direction=inbound)
- Call scorer.js → update lead with score/tag/reason
- If score >= 7: call notifier.js → send WhatsApp alert to dealer
- Handle: text/image/voice/document message types gracefully
- Respond 200 fast (<500ms) — score async if needed
```

### Dashboard
```
Read CLAUDE.md and design-system/MASTER.md.
Use @react-patterns skill.

Build: apps/web/app/page.js (Dashboard)

Stats row (4 cards, DM Mono font for numbers):
- Today's Leads (total)
- Hot Leads Today (score >= 7)
- Response Rate (contacted/total %)
- Fake Lead % 
- Numbers animate count-up on load (custom hook)

Bento grid charts (Recharts):
- Leads by Platform: PieChart/donut (WhatsApp=blue, Instagram=pink, Manual=gray)
- Score Distribution: BarChart (fake/warm/hot bars)
- This Week Trend: LineChart (leads per day, 7 days)

Recent Hot Leads section:
- Last 5 leads with score >= 7
- Each has: name, message preview, score badge, "Reply" button → wa.me

Follow-up Reminders:
- Leads with status="new", older than 24hrs
- Show count as warning badge

Design: bento grid layout, cards with subtle border, DM Sans text, DM Mono numbers
Mobile: single column stack
```

### Settings Page
```
Read CLAUDE.md. Build: apps/web/app/settings/page.js

Sections (tabbed):
1. Profile: name, shop_name, phone (read-only), city — save button
2. WhatsApp: 
   - Status dot (green=connected, red=not)
   - If not connected: 5-step guide to get Meta Cloud API
   - Input: paste WhatsApp Phone ID + Token
   - Test connection button
3. Instagram: similar to WhatsApp connection
4. Notifications:
   - Toggle: Hot lead WhatsApp alert (default ON)
   - Toggle: Daily summary at 8pm (default OFF)
   - Toggle: Follow-up reminders (default ON)
5. Plan & Billing:
   - Show current plan badge
   - Feature comparison table
   - Upgrade button (links to razorpay later)
6. Team (Premium only):
   - Lock icon + "Upgrade to Premium" for Basic/Pro
   - For Premium: invite by phone, show team list

Mobile: full-width, no tabs — accordion sections instead
```

---

## 🐛 BUG FIX PROMPT

```
Read CLAUDE.md for project context.
Use @systematic-debugging skill.

Bug: [DESCRIBE BUG]
File: [FILE PATH]
Error: [EXACT ERROR MESSAGE]
Expected: [WHAT SHOULD HAPPEN]
Actual: [WHAT HAPPENS]

Follow 4-phase debug: Reproduce → Isolate → Root cause → Fix + test
Write regression test before fixing.
```

---

## ✨ NEW FEATURE PROMPT

```
Read CLAUDE.md. 
Use @brainstorming first, then @writing-plans, then build.

Feature: [DESCRIBE FEATURE]

Constraints from CLAUDE.md:
- Dark mode only
- DM Sans + DM Mono fonts
- Mobile-first (375px)
- Lucide icons only
- Write tests before code (TDD)
- Follow Superpowers workflow

After brainstorming confirm plan with me before coding.
```

---

## 🔒 SECURITY AUDIT PROMPT

```
Read CLAUDE.md.
Use @security-auditor skill.

Audit this file for: [apps/api/routes/webhooks/whatsapp.js]

Check:
- Signature verification
- Input sanitization  
- SQL injection (Supabase RLS check)
- Rate limiting
- Auth bypass
- Data leakage in logs
- Idempotency

Report: Critical / High / Medium / Low issues with fix for each.
```

---

## 📊 USEFUL COMMANDS

```bash
# Dev
cd apps/web && npm run dev          # Frontend :3000
cd apps/api && npm run dev          # Backend :3001

# Test
cd apps/api && npm test             # Run all tests
cd apps/web && npm test             # Frontend tests

# DB
supabase start                      # Local Supabase
supabase db push                    # Push migrations
supabase db reset                   # Reset + reseed

# Design system
python3 .claude/skills/ui-ux-pro-max/scripts/search.py \
  "sales intelligence dashboard" --domain style

# Add shadcn component
cd apps/web && npx shadcn@latest add [component]

# Test webhook locally
ngrok http 3001
# Paste ngrok URL → Meta Developer Console → WhatsApp → Webhook

# Test Claude API
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{"model":"claude-sonnet-4-20250514","max_tokens":200,"messages":[{"role":"user","content":"Score: Swift 2019 chahiye 4 lakh budget. Respond JSON only: {score,tag,reason}"}]}'
```

---

*Save this file in project root. Use every Claude Code session.*
*CarLeads CRM v2.0 — Webiox Agency, Surat, Gujarat*
