// Activity Editor Grouped Sections
// These components render multiple sections in a scrollable container
// with scroll spy integration for dynamic sidebar highlighting.

export { ActivityOverviewGroup, ACTIVITY_OVERVIEW_SECTIONS, isActivityOverviewSection } from './ActivityOverviewGroup'
export type { ActivityOverviewSectionId } from './ActivityOverviewGroup'

export { StakeholdersGroup, STAKEHOLDERS_SECTIONS, isStakeholdersSection } from './StakeholdersGroup'
export type { StakeholdersSectionId } from './StakeholdersGroup'

export { FundingDeliveryGroup, FUNDING_DELIVERY_SECTIONS, isFundingDeliverySection } from './FundingDeliveryGroup'
export type { FundingDeliverySectionId } from './FundingDeliveryGroup'

export { StrategicAlignmentGroup, STRATEGIC_ALIGNMENT_SECTIONS, isStrategicAlignmentSection } from './StrategicAlignmentGroup'
export type { StrategicAlignmentSectionId } from './StrategicAlignmentGroup'

export { SupportingInfoGroup, SUPPORTING_INFO_SECTIONS, isSupportingInfoSection } from './SupportingInfoGroup'
export type { SupportingInfoSectionId } from './SupportingInfoGroup'

export { SectionHeader, SECTION_LABELS, SECTION_HELP_TEXTS, getSectionLabel, getSectionHelpText } from './SectionHeader'
