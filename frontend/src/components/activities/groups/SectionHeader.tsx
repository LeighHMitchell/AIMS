"use client"

import React from "react"
import { HelpCircle } from "lucide-react"
import { HelpTextTooltip } from "@/components/ui/help-text-tooltip"

interface SectionHeaderProps {
  /** The section title to display */
  title: string
  /** Help text to show in the tooltip */
  helpText?: string
  /** Section ID for the data attribute (used by scroll spy) */
  id: string
  /** Optional className for additional styling */
  className?: string
  /** Whether to show a divider line above the header */
  showDivider?: boolean
}

/**
 * Consistent header component for sections within a scrollable group.
 * Displays the section title with an optional help tooltip.
 */
export function SectionHeader({
  title,
  helpText,
  id,
  className = "",
  showDivider = false,
}: SectionHeaderProps) {
  return (
    <div 
      className={`section-header ${className}`}
      data-section-header={id}
    >
      {showDivider && (
        <div className="border-t border-gray-200 my-8" />
      )}
      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">{title}</h2>
        {helpText && (
          <HelpTextTooltip content={helpText}>
            <HelpCircle className="w-5 h-5 text-gray-500 hover:text-gray-700 cursor-help" />
          </HelpTextTooltip>
        )}
      </div>
    </div>
  )
}

/**
 * Section labels mapping - mirrors the getSectionLabel function from page.tsx
 */
export const SECTION_LABELS: Record<string, string> = {
  metadata: "Metadata",
  general: "General Information",
  iati: "IATI Sync",
  sectors: "Sectors",
  humanitarian: "Humanitarian",
  locations: "Activity Locations",
  "country-region": "Country/Region",
  subnational_breakdown: "Subnational Breakdown",
  organisations: "Participating Organisations",
  contacts: "Activity Contacts",
  focal_points: "Focal Points",
  linked_activities: "Linked Activities",
  finances: "Transactions",
  results: "Results",
  "capital-spend": "Capital Spend",
  sdg: "SDG Alignment",
  "country-budget": "Country Budget Mapping",
  tags: "Tags",
  working_groups: "Working Groups",
  policy_markers: "Policy Markers",
  government: "Government Inputs",
  documents: "Documents & Images",
  aid_effectiveness: "Aid Effectiveness",
  budgets: "Budgets",
  "planned-disbursements": "Planned Disbursements",
  "forward-spending-survey": "Forward Spending Survey",
  "financing-terms": "Financing Terms",
  conditions: "Conditions",
  "xml-import": "IATI Import",
  readiness_checklist: "Government Readiness Checklist",
}

/**
 * Section help texts mapping - mirrors the getSectionHelpText function from page.tsx
 */
export const SECTION_HELP_TEXTS: Record<string, string> = {
  general: "This tab brings together the core details that define the activity, including its identifiers, title, description, imagery, collaboration type, status, and dates. Completing this section establishes the basic profile of the activity and provides a clear reference point for all other information entered elsewhere.",
  iati: "This tab controls synchronisation with the IATI Registry and Datastore. Enabling sync ensures that updates made to the activity in this system are reflected in your published IATI file, maintaining consistency between internal records and the official public dataset.",
  locations: "This tab records where the activity takes place. You can add locations using the map or by entering coordinates manually. Each location can include a name, type, address, and description, along with subnational breakdowns. These details establish the geographic footprint of the activity and allow analysis at the national, regional, or project-site level.",
  sectors: "This tab defines the focus areas of the activity. You select sub-sectors, and the system automatically links each choice to its corresponding sector and sector category. You can assign multiple sub-sectors and use percentage shares to show how the activity budget is divided. The allocations must add up to 100 percent, and a visual summary displays the distribution. Planned Disbursements and Budgets will be calculated based on this sector breakdown.",
  organisations: "This tab records the official roles of organisations involved in the activity. Participating organisations may be listed as extending partners, implementing partners, or government partners. Extending partners are entities that channel funds onward, implementing partners are responsible for delivering the activity, and government partners provide oversight or maintain responsibility under agreements such as MoUs. These roles define the structure of participation for reporting.",
  contacts: "The Contacts tab records key individuals associated with the activity, including their name, role, organisation, and contact details. It can also include a short narrative description of their responsibilities or function within the project. Adding contacts helps identify focal points for communication and coordination, while multiple entries allow both general enquiries and specific role-based contacts to be captured.",
  focal_points: "The Focal Points tab designates the individuals accountable for maintaining and validating the activity record. Recipient government focal points are officials who review or endorse the activity, while development partner focal points are the main contacts responsible for updating and managing the information on behalf of their organisations. Super users can assign focal points directly, and current focal points can hand off their role to another user who must accept the transfer.",
  linked_activities: "The Linked Activities tab shows connections between this activity and others, defined through recognised relationship types such as parent, child, or related projects. Each linked activity is displayed with its title, identifier, and reporting organisation, along with its relationship to the current activity. A relationship visualisation provides a clear overview of how activities are structured and connected across partners.",
  tags: "Add custom tags to categorise this activity and make it easier to find through search and reporting. You can click on any tag to edit it inline. When creating tags, use clear and specific terms, such as \"water-infrastructure\" instead of simply \"water,\" to ensure accuracy. Tags ignore letter cases and will always be saved in lowercase. For consistency, try to reuse existing tags whenever possible. Careful tagging not only improves searchability but also strengthens the quality of filtering and reporting across activities.",
  working_groups: "In this section you can map the activity to the relevant technical or sector working groups. Doing so ensures that the activity is visible within the appropriate coordination structures, helps align it with other initiatives in the same area, and supports joint planning, monitoring and reporting. By linking your activity to the correct working group, you contribute to better coordination across partners and provide government and sector leads with a clearer picture of collective efforts.",
  policy_markers: "Assign OECD DAC and IATI-compliant policy markers to show how this activity addresses cross-cutting development issues. Policy markers are a standard way of signalling whether and to what extent an activity contributes to objectives such as gender equality, climate change, biodiversity, or disaster risk reduction. Each marker is scored to reflect the importance of the objective within the activity—for example, whether it is a principal objective, a significant objective, or not targeted at all. The Rio Markers are a specific subset that track environmental objectives in line with OECD DAC guidelines. Providing a short rationale alongside your chosen scores helps explain and justify the assessment, making the data more transparent and easier to interpret across organisations and reports.",
  documents: "You can drag and drop files into the upload area or click \"Choose Files\" to browse your computer. Supported formats include images (PNG, JPG, GIF), PDFs, Word documents, Excel sheets, and CSV files. Add a clear title and category so your uploads are easy to find later in the library.",
  "xml-import": "Import activity data from an IATI-compliant XML file. You can review and select which fields to import.",
  "capital-spend": "Capital expenditure represents the percentage of the total activity cost used for fixed assets or infrastructure (e.g., buildings, equipment, vehicles). This helps distinguish between capital investment and operational/recurrent costs.",
  conditions: "Conditions are requirements that must be met for the activity to proceed. They can be policy-related (requiring implementation of particular policies), performance-based (requiring achievement of specific outputs or outcomes), or fiduciary (requiring use of specific financial management measures).",
  "country-budget": "Map activity budget to recipient country budget classifications.",
  "forward-spending-survey": "Complete this section to provide additional details about your activity.",
  "financing-terms": "Complete this section to provide additional details about your activity.",
  readiness_checklist: "Track preparatory milestones and ensure project readiness before validation. Complete each checklist item by uploading supporting documents and marking the status. All required items must be completed before signing off each stage.",
  humanitarian: "This section captures humanitarian-specific information for the activity, including emergency type, GLIDE number, and humanitarian scope classifications. These details help identify activities that respond to humanitarian crises and enable proper categorisation in humanitarian coordination systems.",
  "country-region": "This section defines the geographic scope of the activity at the country and region level. You can specify recipient countries with percentage allocations showing how the budget is distributed across locations. Regional classifications help group activities by broader geographic areas.",
}

/**
 * Get section label by ID with fallback
 */
export function getSectionLabel(sectionId: string): string {
  return SECTION_LABELS[sectionId] || sectionId.charAt(0).toUpperCase() + sectionId.slice(1).replace(/-/g, ' ')
}

/**
 * Get section help text by ID with fallback
 */
export function getSectionHelpText(sectionId: string): string {
  return SECTION_HELP_TEXTS[sectionId] || "Complete this section to provide additional details about your activity."
}
