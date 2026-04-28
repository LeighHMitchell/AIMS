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
  /** Optional action element (e.g. button) rendered on the right */
  action?: React.ReactNode
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
  action,
}: SectionHeaderProps) {
  return (
    <div
      className={`section-header ${className}`}
      data-section-header={id}
    >
      {showDivider && (
        <div className="border-t border-border my-8" />
      )}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-3xl font-semibold text-foreground">{title}</h2>
          {helpText && (
            <HelpTextTooltip content={helpText}>
              <HelpCircle className="w-5 h-5 text-muted-foreground hover:text-foreground cursor-help" />
            </HelpTextTooltip>
          )}
        </div>
        {action}
      </div>
    </div>
  )
}

/**
 * Section labels mapping - mirrors the getSectionLabel function from page.tsx
 */
export const SECTION_LABELS: Record<string, string> = {
  metadata: "Metadata",
  general: "Overview",
  iati: "IATI Sync",
  sectors: "Sectors",
  humanitarian: "Humanitarian Marker",
  locations: "Activity Sites",
  "country-region": "Countries & Regions",
  "subnational-allocation": "Sub-national",
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
  national_plans: "Plan Alignment",
  policy_markers: "Policy Markers",
  government: "Government Inputs",
  documents: "Documents & Images",
  aid_effectiveness: "Aid Effectiveness",
  budgets: "Budgets",
  "planned-disbursements": "Planned Disbursements",
  "forward-spending-survey": "Forward Spending Survey",
  "financing-terms": "Financing Terms",
  conditions: "Conditions",
  "fund-overview": "Fund Overview",
  "fund-contributions": "Contributions",
  "fund-disbursements": "Disbursements",
  "fund-reconciliation": "Reconciliation",
  "fund-suggestions": "Suggested Links",
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
  national_plans: "Align this activity to the national development plan and any relevant sectoral or thematic strategies. You can allocate a percentage of the activity to each priority area to show how the activity contributes to government goals. Alignment is optional but helps government and partners understand how aid supports national priorities.",
  policy_markers: "Assign OECD DAC and IATI-compliant policy markers to show how this activity addresses cross-cutting development issues. Policy markers are a standard way of signalling whether and to what extent an activity contributes to objectives such as gender equality, climate change, biodiversity, or disaster risk reduction. Each marker is scored to reflect the importance of the objective within the activity—for example, whether it is a principal objective, a significant objective, or not targeted at all. The Rio Markers are a specific subset that track environmental objectives in line with OECD DAC guidelines. Providing a short rationale alongside your chosen scores helps explain and justify the assessment, making the data more transparent and easier to interpret across organisations and reports.",
  documents: "You can drag and drop files into the upload area or click \"Choose Files\" to browse your computer. Supported formats include images (PNG, JPG, GIF), PDFs, Word documents, Excel sheets, and CSV files. Add a clear title and category so your uploads are easy to find later in the library.",
  "xml-import": "Import activity data from an IATI-compliant XML file. You can review and select which fields to import.",
  "capital-spend": "Capital expenditure represents the percentage of the total activity cost used for fixed assets or infrastructure (e.g., buildings, equipment, vehicles). This helps distinguish between capital investment and operational/recurrent costs.",
  conditions: "Conditions are requirements that must be met for the activity to proceed. They can be policy-related (requiring implementation of particular policies), performance-based (requiring achievement of specific outputs or outcomes), or fiduciary (requiring use of specific financial management measures).",
  "country-budget": "Map activity budget to recipient country budget classifications.",
  sdg: "Link this activity to the United Nations Sustainable Development Goals and their specific targets. Select the goals the activity contributes to, then choose the most relevant targets under each goal. You can mark whether a contribution is primary or secondary and add a short note explaining how the activity advances the target. Accurate SDG mapping strengthens reporting against global commitments and shows how aid supports Agenda 2030.",
  "forward-spending-survey": "Record forward-looking spending estimates for the activity beyond the current year. These projections help government and partners plan future budgets and understand the medium-term aid outlook. Enter expected disbursements by year in the currency of the commitment, along with any assumptions or caveats that affect the estimates.",
  "financing-terms": "Capture the financial terms of the activity, including the type of finance (grant, loan, guarantee, or equity), interest rate, repayment schedule, grace period, and maturity. For concessional loans, record the grant element where available. These details determine how the activity is classified for ODA reporting and help recipients understand the true cost of the financing.",
  metadata: "Administrative information about this activity record, including who created and last modified it, the reporting organisation, publication status, and IATI identifiers. Use this section to review the record's provenance and confirm it is attributed correctly before publishing.",
  results: "Record the results framework for this activity — the outputs, outcomes, and impacts the activity aims to deliver. For each result, add indicators with baselines, targets, and actual values over time. A well-structured results section allows progress to be tracked against original intentions and supports evidence-based reporting to funders and partners.",
  finances: "Record every financial transaction associated with the activity, including commitments, disbursements, expenditures, incoming funds, and reimbursements. Each transaction captures the value, date, currency, provider, receiver, and (optionally) sector, aid type, flow type, and finance type. Accurate transaction data underpins all financial reporting and reconciliation across the system.",
  budgets: "Record the activity's planned budget broken down by period, typically by year or quarter. Budgets show the intended spending profile over the life of the activity and are distinct from actual disbursements. Periods should not overlap and, together, should cover the full duration of the activity. Budget status (indicative or committed) indicates how firm each figure is.",
  "planned-disbursements": "Record expected future disbursements to help partners and government forecast incoming funds. Each planned disbursement covers a specific period and includes the amount, currency, provider organisation, and receiver organisation. Planned disbursements differ from budgets: they reflect actual money flows expected on specific dates rather than the overall spending plan.",
  aid_effectiveness: "Capture information relevant to the aid effectiveness principles, including use of country systems, alignment with government priorities, predictability, and mutual accountability. Responses here feed into national and global monitoring of the Paris Declaration, Accra Agenda for Action, and Busan commitments on effective development cooperation.",
  government: "Record information specific to the recipient government's oversight of this activity, including on-budget status, the responsible ministry or agency, any MoUs or project agreements signed, and the government's role in implementation. This section helps ensure the activity is visible within national planning and public financial management systems.",
  readiness_checklist: "Track preparatory milestones and ensure project readiness before validation. Complete each checklist item by uploading supporting documents and marking the status. All required items must be completed before signing off each stage.",
  humanitarian: "This section captures humanitarian-specific information for the activity, including emergency type, GLIDE number, and humanitarian scope classifications. These details help identify activities that respond to humanitarian crises and enable proper categorisation in humanitarian coordination systems.",
  "country-region": "This section defines the geographic scope of the activity at the country and region level. You can specify recipient countries with percentage allocations showing how the budget is distributed across locations. Regional classifications help group activities by broader geographic areas.",
  "subnational-allocation": "This section allows you to allocate percentages of the activity budget across sub-national regions within recipient countries. Use this to show how resources are distributed geographically at a more granular level than country allocations.",
  "fund-overview": "A summary dashboard showing the fund's balance (total contributions minus total disbursements), key metrics such as number of donors and child activities, top contributors, top sectors, and a quarterly disbursement trend.",
  "fund-contributions": "View all contributions into this fund by donor organisation. Shows pledged, committed, and received amounts with year-by-year breakdowns. Data is drawn from incoming transactions and participating organisations with a funding role.",
  "fund-disbursements": "View all disbursements from this fund to child activities. Includes breakdowns by child activity, sector, and region, with committed versus disbursed comparisons and planned versus actual analysis.",
  "fund-reconciliation": "Compare fund-side outgoing transactions with child-side incoming transactions to identify matches, mismatches, and unmatched records. Helps fund managers ensure both sides of each transfer are properly recorded.",
  "fund-suggestions": "Discover activities that may be children of this fund based on transaction references, funding organisation matches, or title similarity. Link suggested activities or dismiss them.",
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
