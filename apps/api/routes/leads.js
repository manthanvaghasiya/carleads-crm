// ============================================================
// Leads Routes — CRUD operations for leads
// ============================================================

const express = require('express');
const router = express.Router();
const { supabase, isMockMode } = require('../lib/supabase');
const { mockLeads, mockMessages } = require('../data/mockLeads');
const { scoreLeadMessage } = require('../services/scorer');
const authMiddleware = require('../middleware/auth');
const { validateLeadCreate, validateLeadUpdate } = require('../middleware/validate');

// Apply auth to all lead routes
router.use(authMiddleware);

// ── GET /api/leads — List leads ────────────────────────────
router.get('/', async (req, res) => {
  try {
    const {
      status,
      platform,
      tag,
      search,
      limit = '50',
      offset = '0',
    } = req.query;

    const limitNum = Math.min(parseInt(limit, 10) || 50, 100);
    const offsetNum = parseInt(offset, 10) || 0;

    if (isMockMode) {
      let filtered = [...mockLeads].filter(
        (l) => l.dealer_id === req.dealer.id
      );

      // Apply filters
      if (status) {
        filtered = filtered.filter((l) => l.status === status);
      }
      if (platform) {
        filtered = filtered.filter((l) => l.platform === platform);
      }
      if (tag) {
        filtered = filtered.filter((l) => l.ai_tag === tag);
      }
      if (search) {
        const q = search.toLowerCase();
        filtered = filtered.filter(
          (l) =>
            l.sender_name.toLowerCase().includes(q) ||
            l.message_preview.toLowerCase().includes(q) ||
            (l.sender_phone && l.sender_phone.includes(q)) ||
            (l.sender_handle && l.sender_handle.toLowerCase().includes(q))
        );
      }

      // Sort: ai_score DESC, then created_at DESC
      filtered.sort((a, b) => {
        if (b.ai_score !== a.ai_score) return b.ai_score - a.ai_score;
        return new Date(b.created_at) - new Date(a.created_at);
      });

      const total = filtered.length;
      const data = filtered.slice(offsetNum, offsetNum + limitNum);

      return res.json({
        data,
        pagination: {
          total,
          limit: limitNum,
          offset: offsetNum,
          hasMore: offsetNum + limitNum < total,
        },
      });
    }

    // Supabase query
    let query = supabase
      .from('leads')
      .select('*', { count: 'exact' })
      .eq('dealer_id', req.dealer.id)
      .order('ai_score', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offsetNum, offsetNum + limitNum - 1);

    if (status) query = query.eq('status', status);
    if (platform) query = query.eq('platform', platform);
    if (tag) query = query.eq('ai_tag', tag);
    if (search) {
      query = query.or(
        `sender_name.ilike.%${search}%,message_preview.ilike.%${search}%,sender_phone.ilike.%${search}%`
      );
    }

    const { data, count, error } = await query;

    if (error) {
      console.error('Leads query error:', error);
      return res.status(500).json({ error: 'Failed to fetch leads' });
    }

    return res.json({
      data: data || [],
      pagination: {
        total: count || 0,
        limit: limitNum,
        offset: offsetNum,
        hasMore: offsetNum + limitNum < (count || 0),
      },
    });
  } catch (err) {
    console.error('GET /api/leads error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /api/leads/:id — Get single lead with messages ─────
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (isMockMode) {
      const lead = mockLeads.find(
        (l) => l.id === id && l.dealer_id === req.dealer.id
      );
      if (!lead) {
        return res.status(404).json({ error: 'Lead not found' });
      }
      const messages = mockMessages[id] || [];
      return res.json({ lead, messages });
    }

    const { data: lead, error } = await supabase
      .from('leads')
      .select('*')
      .eq('id', id)
      .eq('dealer_id', req.dealer.id)
      .single();

    if (error || !lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const { data: messages } = await supabase
      .from('lead_messages')
      .select('*')
      .eq('lead_id', id)
      .order('created_at', { ascending: true });

    return res.json({ lead, messages: messages || [] });
  } catch (err) {
    console.error('GET /api/leads/:id error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /api/leads — Create lead manually ─────────────────
router.post('/', validateLeadCreate, async (req, res) => {
  try {
    const {
      sender_name,
      sender_phone,
      sender_handle,
      message_preview,
      platform = 'manual',
    } = req.body;

    // Score the message
    const scoring = await scoreLeadMessage(message_preview);

    const newLead = {
      dealer_id: req.dealer.id,
      platform,
      sender_name: sender_name.trim(),
      sender_phone: sender_phone?.trim() || null,
      sender_handle: sender_handle?.trim() || null,
      message_preview: message_preview.trim(),
      ai_score: scoring.score,
      ai_tag: scoring.tag,
      ai_reason: scoring.reason,
      ai_signals: scoring.signals,
      status: 'new',
      is_read: false,
      created_at: new Date().toISOString(),
    };

    if (isMockMode) {
      newLead.id = `manual_${Date.now()}`;
      mockLeads.unshift(newLead);
      return res.status(201).json({ lead: newLead });
    }

    const { data, error } = await supabase
      .from('leads')
      .insert(newLead)
      .select()
      .single();

    if (error) {
      console.error('Create lead error:', error);
      return res.status(500).json({ error: 'Failed to create lead' });
    }

    return res.status(201).json({ lead: data });
  } catch (err) {
    console.error('POST /api/leads error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ── PATCH /api/leads/:id — Update lead ─────────────────────
router.patch('/:id', validateLeadUpdate, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = {};

    // Only allow specific fields to be updated
    const allowedFields = ['status', 'is_read', 'ai_tag', 'ai_score', 'notes'];
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    updates.updated_at = new Date().toISOString();

    if (isMockMode) {
      const leadIndex = mockLeads.findIndex(
        (l) => l.id === id && l.dealer_id === req.dealer.id
      );
      if (leadIndex === -1) {
        return res.status(404).json({ error: 'Lead not found' });
      }
      Object.assign(mockLeads[leadIndex], updates);
      return res.json({ lead: mockLeads[leadIndex] });
    }

    const { data, error } = await supabase
      .from('leads')
      .update(updates)
      .eq('id', id)
      .eq('dealer_id', req.dealer.id)
      .select()
      .single();

    if (error) {
      console.error('Update lead error:', error);
      return res.status(500).json({ error: 'Failed to update lead' });
    }

    if (!data) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    return res.json({ lead: data });
  } catch (err) {
    console.error('PATCH /api/leads/:id error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ── DELETE /api/leads/:id — Delete lead ────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (isMockMode) {
      const leadIndex = mockLeads.findIndex(
        (l) => l.id === id && l.dealer_id === req.dealer.id
      );
      if (leadIndex === -1) {
        return res.status(404).json({ error: 'Lead not found' });
      }
      mockLeads.splice(leadIndex, 1);
      return res.json({ message: 'Lead deleted' });
    }

    const { error } = await supabase
      .from('leads')
      .delete()
      .eq('id', id)
      .eq('dealer_id', req.dealer.id);

    if (error) {
      console.error('Delete lead error:', error);
      return res.status(500).json({ error: 'Failed to delete lead' });
    }

    return res.json({ message: 'Lead deleted' });
  } catch (err) {
    console.error('DELETE /api/leads/:id error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
