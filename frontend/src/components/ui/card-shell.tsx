'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

// Standardized brand palette — uses CSS variables for theme compatibility
const colors = {
  blueSlate: 'hsl(var(--brand-blue-slate))',
  coolSteel: 'hsl(var(--brand-cool-steel))',
  paleSlate: 'hsl(var(--brand-pale-slate))',
  platinum: 'hsl(var(--brand-platinum))',
};

// ── Rip Line ────────────────────────────────────────────────────────────────
// Decorative dashed separator with circular cutouts, used between main
// content and a bottom section on ticket-style cards.
export function CardShellRipLine() {
  return (
    <div className="relative flex items-center justify-center">
      <div className="absolute -left-5 h-10 w-10 rounded-full z-20 bg-background" />
      <div
        className="w-full border-t-2 border-dashed"
        style={{ borderColor: colors.paleSlate }}
      />
      <div className="absolute -right-5 h-10 w-10 rounded-full z-20 bg-background" />
    </div>
  );
}

// ── Logo Overlay ────────────────────────────────────────────────────────────
// Circular image overlapping the boundary between banner and content.
// Positioned via CSS so it doesn't cover title text in the banner.
interface CardShellLogoOverlayProps {
  src: string;
  alt: string;
}

export function CardShellLogoOverlay({ src, alt }: CardShellLogoOverlayProps) {
  return (
    <div className="absolute right-4 top-48 -translate-y-1/2 z-30">
      <div
        className="w-14 h-14 rounded-full border-4 shadow-lg overflow-hidden p-1 bg-card"
        style={{ borderColor: colors.platinum }}
      >
        <img src={src} alt={alt} className="w-full h-full object-contain" />
      </div>
    </div>
  );
}

// ── Bottom Section ──────────────────────────────────────────────────────────
// Optional section below the rip line with rounded bottom corners.
interface CardShellBottomSectionProps {
  children: React.ReactNode;
}

export function CardShellBottomSection({ children }: CardShellBottomSectionProps) {
  return (
    <div className="p-5 pt-3 bg-card rounded-b-3xl">
      {children}
    </div>
  );
}

// ── Card Shell ──────────────────────────────────────────────────────────────
export interface CardShellProps {
  /** URL the card links to. Omit for non-navigable cards. */
  href?: string;
  /** Accessible label for the card. */
  ariaLabel: string;
  /** Additional CSS class names on the outer wrapper. */
  className?: string;

  // ── Banner ────────────────────────────────────────────────────────────
  /** Optional banner image URL. When set the image scales on hover. */
  bannerImage?: string;
  /** Fallback icon shown in the banner when no image is provided. */
  bannerIcon?: LucideIcon;
  /** Override the default banner background colour. */
  bannerColor?: string;
  /** Override the gradient opacity. Defaults to from-black/80. */
  bannerGradient?: string;
  /** Custom content rendered inside the banner (replaces the default icon/image). */
  bannerContent?: React.ReactNode;
  /** Content rendered at the bottom of the banner (title area, z-20). */
  bannerOverlay?: React.ReactNode;
  /** Content rendered on top of the banner at a high z-index (e.g. action menus). */
  bannerActions?: React.ReactNode;

  // ── Body ──────────────────────────────────────────────────────────────
  /** Main card content rendered below the banner. */
  children: React.ReactNode;

  // ── Behaviour ─────────────────────────────────────────────────────────
  /** Ref forwarded to the outer motion.div (useful for html2canvas export). */
  cardRef?: React.Ref<HTMLDivElement>;
  /** Disable the hover-lift animation (e.g. while exporting). */
  disableHover?: boolean;
}

export function CardShell({
  href,
  ariaLabel,
  className = '',
  bannerImage,
  bannerIcon: BannerIcon,
  bannerColor,
  bannerGradient,
  bannerContent,
  bannerOverlay,
  bannerActions,
  children,
  cardRef,
  disableHover = false,
}: CardShellProps) {
  const bgColor = bannerColor ?? colors.blueSlate;
  const gradient = bannerGradient ?? 'from-black/80 via-black/20 to-transparent';

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, type: 'spring', bounce: 0.3 }}
      whileHover={disableHover ? undefined : { y: -8 }}
      className={`group relative flex w-full flex-col rounded-3xl shadow-sm hover:shadow-xl transition-shadow duration-300 cursor-pointer isolate overflow-hidden border bg-card ${className}`}
      role="article"
      aria-label={ariaLabel}
    >
      {/* Invisible link overlay — sits below all interactive elements */}
      {href && (
        <Link
          href={href}
          className="absolute inset-0 z-0"
          aria-label={ariaLabel}
        >
          <span className="sr-only">View details</span>
        </Link>
      )}

      {/* Banner actions (action menus, etc.) — above everything */}
      {bannerActions && (
        <div
          className="absolute top-4 left-4 z-50"
          onClick={(e) => e.stopPropagation()}
        >
          {bannerActions}
        </div>
      )}

      {/* Banner / Poster section */}
      <div
        className="relative h-48 w-full overflow-hidden"
        style={{ backgroundColor: bgColor }}
      >
        {/* Gradient overlay */}
        <div
          className={`absolute inset-0 bg-gradient-to-t ${gradient} z-10`}
        />

        {/* Banner visual — custom content, image, or icon fallback */}
        {bannerContent ? (
          bannerContent
        ) : bannerImage ? (
          <img
            src={bannerImage}
            alt=""
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : BannerIcon ? (
          <div className="h-full w-full flex items-center justify-center">
            <BannerIcon
              className="h-16 w-16"
              style={{ color: colors.coolSteel, opacity: 0.3 }}
            />
          </div>
        ) : null}

        {/* Title / metadata overlay at bottom of banner */}
        {bannerOverlay && (
          <div className="absolute bottom-0 left-0 right-0 p-4 z-20">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              {bannerOverlay}
            </motion.div>
          </div>
        )}
      </div>

      {/* Body — card-specific content */}
      {children}
    </motion.div>
  );
}

export default CardShell;
