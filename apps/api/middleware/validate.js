// ============================================================
// Request Validation Middleware
// ============================================================

function validateLeadCreate(req, res, next) {
  const { sender_name, message_preview, platform } = req.body;

  const errors = [];

  if (!sender_name || typeof sender_name !== 'string' || sender_name.trim().length === 0) {
    errors.push('sender_name is required and must be a non-empty string');
  }

  if (!message_preview || typeof message_preview !== 'string' || message_preview.trim().length === 0) {
    errors.push('message_preview is required and must be a non-empty string');
  }

  const validPlatforms = ['whatsapp', 'instagram', 'manual', 'website'];
  if (platform && !validPlatforms.includes(platform)) {
    errors.push(`platform must be one of: ${validPlatforms.join(', ')}`);
  }

  if (req.body.sender_phone && typeof req.body.sender_phone === 'string') {
    const phone = req.body.sender_phone.trim();
    if (phone && !/^\+?[0-9]{10,15}$/.test(phone)) {
      errors.push('sender_phone must be a valid phone number (10-15 digits, optional + prefix)');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({ error: 'Validation failed', details: errors });
  }

  next();
}

function validateLeadUpdate(req, res, next) {
  const { status, is_read, ai_tag } = req.body;

  const errors = [];

  const validStatuses = ['new', 'contacted', 'follow_up', 'converted', 'lost', 'archived'];
  if (status && !validStatuses.includes(status)) {
    errors.push(`status must be one of: ${validStatuses.join(', ')}`);
  }

  if (is_read !== undefined && typeof is_read !== 'boolean') {
    errors.push('is_read must be a boolean');
  }

  const validTags = ['hot', 'warm', 'fake'];
  if (ai_tag && !validTags.includes(ai_tag)) {
    errors.push(`ai_tag must be one of: ${validTags.join(', ')}`);
  }

  if (errors.length > 0) {
    return res.status(400).json({ error: 'Validation failed', details: errors });
  }

  next();
}

module.exports = { validateLeadCreate, validateLeadUpdate };
