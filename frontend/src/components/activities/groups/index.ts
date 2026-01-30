// Activity Editor Grouped Sections
// These components render multiple sections in a scrollable container
// with scroll spy integration for dynamic sidebar highlighting.

export { ActivityOverviewGroup, ACTIVITY_OVERVIEW_SECTIONS, isActivityOverviewSection } from './ActivityOverviewGroup'
export type { ActivityOverviewSectionId } from './ActivityOverviewGroup'

export { StakeholdersGroup, STAKEHOLDERS_SECTIONS, isStakeholdersSection } from './StakeholdersGroup'
export type { StakeholdersSectionId } from './StakeholdersGroup'

export { SectionHeader, SECTION_LABELS, SECTION_HELP_TEXTS, getSectionLabel, getSectionHelpText } from './SectionHeader'
