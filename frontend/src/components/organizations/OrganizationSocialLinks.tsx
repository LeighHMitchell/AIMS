'use client';

/**
 * A row of brand-coloured social icon buttons for an organisation.
 * Mirrors the shadcn-space "button-08" social-icon button pattern, but uses
 * locally-bundled brand SVGs and only renders platforms that have a value.
 *
 * Reusable on both the editor (live preview) and the public profile.
 */
import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  SOCIAL_ICONS,
  SOCIAL_LABELS,
  type SocialPlatform,
} from '@/components/ui/social-icons';

interface OrganizationSocialLinksProps {
  twitter?: string;
  facebook?: string;
  linkedin?: string;
  instagram?: string;
  youtube?: string;
  className?: string;
  /** Optional message shown when no links are set (editor preview only) */
  emptyHint?: string;
}

// Turn a stored value (full URL, bare domain, or @handle) into an openable URL.
const normalizeUrl = (platform: SocialPlatform, raw: string): string => {
  const value = raw.trim();
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;

  const handle = value.replace(/^@/, '');
  switch (platform) {
    case 'twitter':
      return `https://x.com/${handle}`;
    case 'facebook':
      return `https://facebook.com/${handle}`;
    case 'linkedin':
      // Could be a company or personal slug — default to company.
      return value.includes('/') ? `https://${value}` : `https://linkedin.com/company/${handle}`;
    case 'instagram':
      return `https://instagram.com/${handle}`;
    case 'youtube':
      return `https://youtube.com/${value.startsWith('@') ? value : `@${handle}`}`;
    default:
      return `https://${value}`;
  }
};

export function OrganizationSocialLinks({
  twitter,
  facebook,
  linkedin,
  instagram,
  youtube,
  className = '',
  emptyHint,
}: OrganizationSocialLinksProps) {
  const entries: { platform: SocialPlatform; value?: string }[] = [
    { platform: 'twitter', value: twitter },
    { platform: 'facebook', value: facebook },
    { platform: 'linkedin', value: linkedin },
    { platform: 'instagram', value: instagram },
    { platform: 'youtube', value: youtube },
  ];

  const present = entries.filter((e) => e.value && e.value.trim().length > 0);

  if (present.length === 0) {
    return emptyHint ? (
      <p className="text-body text-muted-foreground">{emptyHint}</p>
    ) : null;
  }

  return (
    <TooltipProvider>
      <div className={`flex items-center gap-3 flex-wrap ${className}`}>
        {present.map(({ platform, value }) => {
          const Icon = SOCIAL_ICONS[platform];
          const href = normalizeUrl(platform, value as string);
          return (
            <Tooltip key={platform}>
              <TooltipTrigger asChild>
                <Button
                  asChild
                  variant="outline"
                  size="icon"
                  className="rounded-lg hover:scale-110 transition-all duration-300"
                >
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={SOCIAL_LABELS[platform]}
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                </Button>
              </TooltipTrigger>
              <TooltipContent>{SOCIAL_LABELS[platform]}</TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}

export default OrganizationSocialLinks;
