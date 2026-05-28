'use client';

import { MessageCircle, Camera as Instagram, PenLine, ShoppingBag } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * PlatformIcon — Shows the platform icon (WhatsApp, Instagram, etc.)
 */
export default function PlatformIcon({ platform, size = 16, className }) {
  const icons = {
    whatsapp: MessageCircle,
    instagram: Instagram,
    manual: PenLine,
    olx: ShoppingBag,
  };

  const Icon = icons[platform] || MessageCircle;

  return (
    <Icon
      size={size}
      className={cn(
        'flex-shrink-0',
        platform === 'whatsapp' && 'text-whatsapp',
        platform === 'instagram' && 'text-instagram',
        platform === 'manual' && 'text-manual',
        platform === 'olx' && 'text-olx',
        className
      )}
    />
  );
}
