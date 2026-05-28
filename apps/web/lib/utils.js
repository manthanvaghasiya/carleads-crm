import clsx from 'clsx';

export function cn(...inputs) {
  return clsx(inputs);
}

/**
 * Format relative time (e.g., "3 min ago", "2 hrs ago")
 */
export function timeAgo(dateString) {
  const now = new Date();
  const date = new Date(dateString);
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'yesterday';
  return `${days}d ago`;
}

/**
 * Get score tag from numeric score
 */
export function getScoreTag(score) {
  if (score >= 7) return 'hot';
  if (score >= 4) return 'warm';
  return 'fake';
}

/**
 * Get score label
 */
export function getScoreLabel(score) {
  if (score >= 9) return 'Super Hot';
  if (score >= 7) return 'Hot Lead';
  if (score >= 5) return 'Warm';
  if (score >= 3) return 'Cool';
  return 'Fake';
}

/**
 * Format phone number for display
 */
export function formatPhone(phone) {
  if (!phone) return '';
  // Indian phone: +91XXXXXXXXXX → +91 XXXXX XXXXX
  if (phone.startsWith('+91') && phone.length === 13) {
    return `+91 ${phone.slice(3, 8)} ${phone.slice(8)}`;
  }
  return phone;
}

/**
 * Get platform display name
 */
export function platformName(platform) {
  const map = {
    whatsapp: 'WhatsApp',
    instagram: 'Instagram',
    manual: 'Manual',
    olx: 'OLX',
  };
  return map[platform] || platform;
}

/**
 * Truncate text to N characters
 */
export function truncate(text, maxLength = 80) {
  if (!text || text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '…';
}
