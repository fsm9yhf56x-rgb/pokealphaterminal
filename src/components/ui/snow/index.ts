/**
 * Snow+ component primitives — import barrel.
 *
 * Usage:
 *   import { SnowCard, SnowPill, SnowSection, SnowButton, SoonBadge, SoonModal } from '@/components/ui/snow'
 */

export { SnowCard } from './SnowCard'
export { SnowPill } from './SnowPill'
export { SnowSection } from './SnowSection'
export { SnowButton } from './SnowButton'
export { SoonBadge } from './SoonBadge'
export { SoonModal } from './SoonModal'

// Re-export design tokens pour usage direct
export { SNOW, FONT, GLASS, SHADOW, RADIUS, EASE, DURATION, TRANSITION, SPACE, HOVER_LIFT_STYLE, HOVER_TRANSITION, fmtPrice, fmtRelative } from '@/lib/design/snow'
