"use client"

import { useSearchParams, useRouter } from 'next/navigation'
import { MainLayout } from '@/components/layout/main-layout'
import { ReportCard, ReportHeader } from "@/components/reports/ReportCard"
import { CustomReportBuilder } from "@/components/reports/CustomReportBuilder"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Report configurations
interface ReportConfig {
  title: string
  description: string
  apiEndpoint: string
  filename: string
  headers: ReportHeader[]
}

const activityReports: ReportConfig[] = [
  {
    title: "All Activities Master List",
    description: "Complete list of all activities with key details including IATI ID, status, dates, budgets, and locations.",
    apiEndpoint: "/api/reports/activities",
    filename: "activities_master_list",
    headers: [
      { key: "iati_identifier", label: "IATI ID" },
      { key: "title", label: "Title" },
      { key: "activity_status_code", label: "Activity Status Code" },
      { key: "activity_status_name", label: "Activity Status Name" },
      { key: "reporting_org", label: "Reporting Organisation" },
      { key: "planned_start_date", label: "Planned Start Date" },
      { key: "actual_start_date", label: "Actual Start Date" },
      { key: "planned_end_date", label: "Planned End Date" },
      { key: "actual_end_date", label: "Actual End Date" },
      { key: "total_budget", label: "Total Budget (USD)" },
      { key: "total_disbursed", label: "Total Disbursed (USD)" },
      { key: "sectors", label: "Sectors" },
      { key: "locations", label: "Locations" },
      { key: "adm_levels", label: "ADM Level" },
    ],
  },
  {
    title: "Activity Status Summary",
    description: "Count of activities with their total budget and disbursement, grouped by IATI activity status.",
    apiEndpoint: "/api/reports/activity-status-summary",
    filename: "activity_status_summary",
    headers: [
      { key: "activity_status_code", label: "Activity Status Code" },
      { key: "activity_status_name", label: "Activity Status Name" },
      { key: "activity_count", label: "Activity Count" },
      { key: "percentage_of_activities", label: "% of Activities" },
      { key: "total_budget", label: "Total Budget (USD)" },
      { key: "total_disbursed", label: "Total Disbursed (USD)" },
    ],
  },
  {
    title: "Activities Ending Soon",
    description: "Activities scheduled to end within the next 12 months, with remaining undisbursed balance — useful for closure and pipeline planning.",
    apiEndpoint: "/api/reports/activities-ending-soon",
    filename: "activities_ending_soon",
    headers: [
      { key: "iati_identifier", label: "IATI ID" },
      { key: "title", label: "Title" },
      { key: "reporting_org", label: "Reporting Organisation" },
      { key: "activity_status_code", label: "Activity Status Code" },
      { key: "activity_status_name", label: "Activity Status" },
      { key: "planned_end_date", label: "Planned End Date" },
      { key: "actual_end_date", label: "Actual End Date" },
      { key: "total_budget", label: "Total Budget (USD)" },
      { key: "total_disbursed", label: "Total Disbursed (USD)" },
      { key: "undisbursed_balance", label: "Undisbursed Balance (USD)" },
    ],
  },
]

const financialReports: ReportConfig[] = [
  {
    title: "Disbursements by Development Partner",
    description: "Financial summary showing total commitments and disbursements by each development partner organization.",
    apiEndpoint: "/api/reports/disbursements-by-partner",
    filename: "disbursements_by_partner",
    headers: [
      { key: "organization_name", label: "Organisation Name" },
      { key: "organization_type_code", label: "Organisation Type Code" },
      { key: "organization_type_name", label: "Organisation Type Name" },
      { key: "total_committed", label: "Total Committed (USD)" },
      { key: "total_disbursed", label: "Total Disbursed (USD)" },
      { key: "activity_count", label: "Activity Count" },
      { key: "last_transaction_date", label: "Last Transaction Date" },
    ],
  },
  {
    title: "Commitments vs Disbursements",
    description: "Year-over-year comparison of total commitments versus disbursements with variance analysis.",
    apiEndpoint: "/api/reports/commitments-vs-disbursements",
    filename: "commitments_vs_disbursements",
    headers: [
      { key: "year", label: "Year" },
      { key: "total_commitments", label: "Total Commitments (USD)" },
      { key: "total_disbursements", label: "Total Disbursements (USD)" },
      { key: "variance", label: "Variance (USD)" },
      { key: "disbursement_rate", label: "Disbursement Rate (%)" },
    ],
  },
  {
    title: "Sector Funding Breakdown",
    description: "Funding distribution across DAC sectors showing commitments, disbursements, and percentage of total.",
    apiEndpoint: "/api/reports/sector-funding",
    filename: "sector_funding",
    headers: [
      { key: "sector_code", label: "DAC Code" },
      { key: "sector_name", label: "Sector Name" },
      { key: "total_committed", label: "Total Committed (USD)" },
      { key: "total_disbursed", label: "Total Disbursed (USD)" },
      { key: "activity_count", label: "Activity Count" },
      { key: "percentage_of_total", label: "% of Total" },
    ],
  },
  {
    title: "Funding by Region",
    description: "Geographic distribution of funding across regions and states with sector breakdown.",
    apiEndpoint: "/api/reports/funding-by-region",
    filename: "funding_by_region",
    headers: [
      { key: "region", label: "Region/State" },
      { key: "activity_count", label: "Activity Count" },
      { key: "total_committed", label: "Total Committed (USD)" },
      { key: "total_disbursed", label: "Total Disbursed (USD)" },
      { key: "top_sectors", label: "Top Sectors" },
    ],
  },
  {
    title: "Transaction Detail Export",
    description: "Line-by-line export of every transaction with type, date, provider, receiver, original value, currency, USD value, and IATI classifications.",
    apiEndpoint: "/api/reports/transactions-detail",
    filename: "transactions_detail",
    headers: [
      { key: "activity_iati_id", label: "Activity IATI ID" },
      { key: "activity_title", label: "Activity Title" },
      { key: "transaction_type_code", label: "Transaction Type Code" },
      { key: "transaction_type_name", label: "Transaction Type" },
      { key: "transaction_date", label: "Transaction Date" },
      { key: "provider_org", label: "Provider Org" },
      { key: "receiver_org", label: "Receiver Org" },
      { key: "value", label: "Value" },
      { key: "currency", label: "Currency" },
      { key: "value_usd", label: "Value (USD)" },
      { key: "aid_type_code", label: "Aid Type Code" },
      { key: "aid_type_name", label: "Aid Type" },
      { key: "finance_type_code", label: "Finance Type Code" },
      { key: "finance_type_name", label: "Finance Type" },
      { key: "flow_type_code", label: "Flow Type Code" },
      { key: "flow_type_name", label: "Flow Type" },
      { key: "tied_status_code", label: "Tied Status Code" },
      { key: "tied_status_name", label: "Tied Status" },
      { key: "description", label: "Description" },
      { key: "reference", label: "Reference" },
    ],
  },
  {
    title: "Transaction Type Summary",
    description: "Total value and count of transactions grouped by IATI transaction type (commitments, disbursements, expenditure, etc.). Excludes internal pooled-fund transfers.",
    apiEndpoint: "/api/reports/transactions-by-type",
    filename: "transactions_by_type",
    headers: [
      { key: "transaction_type_code", label: "Transaction Type Code" },
      { key: "transaction_type_name", label: "Transaction Type" },
      { key: "transaction_count", label: "Transaction Count" },
      { key: "total_value_usd", label: "Total Value (USD)" },
      { key: "percentage_of_total", label: "% of Total" },
    ],
  },
  {
    title: "Budget Execution Report",
    description: "Per-activity comparison of total budget against disbursements, with execution rate and undisbursed balance.",
    apiEndpoint: "/api/reports/budget-execution",
    filename: "budget_execution",
    headers: [
      { key: "iati_identifier", label: "IATI ID" },
      { key: "title", label: "Title" },
      { key: "reporting_org", label: "Reporting Organisation" },
      { key: "activity_status_code", label: "Activity Status Code" },
      { key: "activity_status_name", label: "Activity Status" },
      { key: "total_budget", label: "Total Budget (USD)" },
      { key: "total_disbursed", label: "Total Disbursed (USD)" },
      { key: "undisbursed_balance", label: "Undisbursed Balance (USD)" },
      { key: "execution_rate", label: "Execution Rate (%)" },
    ],
  },
]

const organizationReports: ReportConfig[] = [
  {
    title: "Development Partners Summary",
    description: "Overview of all development partner organizations with their activity counts and financial totals.",
    apiEndpoint: "/api/reports/organizations-summary",
    filename: "organizations_summary",
    headers: [
      { key: "organization_name", label: "Organisation Name" },
      { key: "organization_type_code", label: "Organisation Type Code" },
      { key: "organization_type_name", label: "Organisation Type Name" },
      { key: "iati_ref", label: "IATI Ref" },
      { key: "total_activities", label: "Total Activities" },
      { key: "active_activities", label: "Active Activities" },
      { key: "total_budget", label: "Total Budget (USD)" },
      { key: "total_disbursed", label: "Total Disbursed (USD)" },
    ],
  },
  {
    title: "Activity Portfolio by Reporting Organisation",
    description: "Every reporting organisation with its total number of activities, active activities, and aggregate budget and disbursement.",
    apiEndpoint: "/api/reports/org-activity-portfolio",
    filename: "org_activity_portfolio",
    headers: [
      { key: "organization_name", label: "Organisation Name" },
      { key: "organization_type_code", label: "Organisation Type Code" },
      { key: "organization_type_name", label: "Organisation Type" },
      { key: "activity_count", label: "Activity Count" },
      { key: "active_activities", label: "Active Activities" },
      { key: "total_budget", label: "Total Budget (USD)" },
      { key: "total_disbursed", label: "Total Disbursed (USD)" },
    ],
  },
]

const geographicReports: ReportConfig[] = [
  {
    title: "Funding by Location",
    description: "Subnational distribution of committed and disbursed funding aggregated by reported activity location. Excludes internal pooled-fund transfers.",
    apiEndpoint: "/api/reports/funding-by-location",
    filename: "funding_by_location",
    headers: [
      { key: "location_name", label: "Location" },
      { key: "state_region_name", label: "State / Region" },
      { key: "adm_level", label: "ADM Level" },
      { key: "activity_count", label: "Activity Count" },
      { key: "total_committed", label: "Total Committed (USD)" },
      { key: "total_disbursed", label: "Total Disbursed (USD)" },
    ],
  },
  {
    title: "Activity Location Register",
    description: "Raw export of every reported activity location with administrative area and geographic coordinates — ready for mapping or GIS.",
    apiEndpoint: "/api/reports/location-register",
    filename: "activity_location_register",
    headers: [
      { key: "activity_iati_id", label: "Activity IATI ID" },
      { key: "activity_title", label: "Activity Title" },
      { key: "location_name", label: "Location" },
      { key: "admin_area", label: "State / Region" },
      { key: "adm_level", label: "ADM Level" },
      { key: "latitude", label: "Latitude" },
      { key: "longitude", label: "Longitude" },
      { key: "location_type", label: "Location Type" },
      { key: "coverage", label: "Coverage" },
      { key: "percentage", label: "% Allocation" },
    ],
  },
]

const fundReports: ReportConfig[] = [
  {
    title: "Fund Utilisation Report",
    description: "Summary of all pooled funds showing contributions, disbursements, balance, utilisation rate, and child activity counts.",
    apiEndpoint: "/api/reports/fund-utilisation",
    filename: "fund_utilisation",
    headers: [
      { key: "fund_name", label: "Fund Name" },
      { key: "total_contributions", label: "Total Contributions (USD)" },
      { key: "total_disbursements", label: "Total Disbursements (USD)" },
      { key: "balance", label: "Balance (USD)" },
      { key: "utilisation_percent", label: "Utilisation (%)" },
      { key: "child_activities", label: "Child Activities" },
      { key: "activity_status_code", label: "Activity Status Code" },
      { key: "activity_status_name", label: "Activity Status Name" },
    ],
  },
  {
    title: "Development Partner Contribution Summary",
    description: "All contributions across all pooled funds, grouped by development partner organisation with pledged, committed, and received breakdowns.",
    apiEndpoint: "/api/reports/fund-donor-contributions",
    filename: "fund_donor_contributions",
    headers: [
      { key: "donor_name", label: "Development Partner Name" },
      { key: "fund_name", label: "Fund Name" },
      { key: "pledged", label: "Pledged (USD)" },
      { key: "committed", label: "Committed (USD)" },
      { key: "received", label: "Received (USD)" },
      { key: "total", label: "Total (USD)" },
    ],
  },
  {
    title: "Fund Sector Allocation",
    description: "How fund disbursements are distributed across sectors via child activities, showing amounts and percentage of fund total.",
    apiEndpoint: "/api/reports/fund-sector-allocation",
    filename: "fund_sector_allocation",
    headers: [
      { key: "fund_name", label: "Fund Name" },
      { key: "sector_code", label: "Sector Code" },
      { key: "sector_name", label: "Sector Name" },
      { key: "disbursed_amount", label: "Disbursed Amount (USD)" },
      { key: "percent_of_fund", label: "% of Fund Total" },
      { key: "activity_count", label: "Activities" },
    ],
  },
]

const dataQualityReports: ReportConfig[] = [
  {
    title: "Data Quality Report",
    description: "Assessment of data completeness for all activities, highlighting missing required fields.",
    apiEndpoint: "/api/reports/data-quality",
    filename: "data_quality_report",
    headers: [
      { key: "activity_title", label: "Activity Title" },
      { key: "iati_id", label: "IATI ID" },
      { key: "missing_fields", label: "Missing Fields" },
      { key: "completeness_score", label: "Completeness Score (%)" },
      { key: "last_updated", label: "Last Updated" },
      { key: "reporting_org", label: "Reporting Organisation" },
    ],
  },
  {
    title: "Transparency Index Export",
    description: "Full transparency score data for all activities based on the 2026 Aid Transparency Index methodology.",
    apiEndpoint: "/api/reports/transparency-export",
    filename: "transparency_index",
    headers: [
      { key: "activity_title", label: "Activity Title" },
      { key: "reporting_org", label: "Reporting Organisation" },
      { key: "total_score", label: "Total Score" },
      { key: "operational_planning", label: "Operational Planning" },
      { key: "finance", label: "Finance" },
      { key: "attributes", label: "Attributes" },
      { key: "joining_up", label: "Joining Up" },
      { key: "performance", label: "Performance" },
    ],
  },
]

export default function ReportsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  
  // Get current tab from URL, default to "standard"
  const currentTab = searchParams.get('tab') || 'standard'
  
  // Handle tab change by updating URL
  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', value)
    router.replace(`/reports?${params.toString()}`, { scroll: false })
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Reports</h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            Pre-formatted downloads and custom pivot tables.
          </p>
        </div>

        {/* Tabs for Standard vs Custom Reports */}
        <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="h-auto bg-transparent p-0 gap-6 border-b mb-6 flex flex-wrap rounded-none w-full justify-start">
            <TabsTrigger value="standard" className="rounded-none border-b-2 border-transparent bg-transparent px-0 pb-3 -mb-px text-sm font-medium text-muted-foreground data-[state=active]:border-foreground data-[state=active]:text-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none hover:text-foreground transition-colors">
              Standard Reports
            </TabsTrigger>
            <TabsTrigger value="custom" className="group rounded-none border-b-2 border-transparent bg-transparent px-0 pb-3 -mb-px text-sm font-medium text-muted-foreground data-[state=active]:border-foreground data-[state=active]:text-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none hover:text-foreground transition-colors gap-2">
              Design Your Own
              <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-[#3C6255] text-white">
                New
              </span>
            </TabsTrigger>
          </TabsList>

          {/* Standard Reports Tab */}
          <TabsContent value="standard" className="space-y-8 mt-0 border-0 p-0">
            {/* Activity Reports */}
            <section>
              <h2 className="text-lg font-semibold text-foreground dark:text-gray-200 mb-4">
                Activity Reports
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activityReports.map((report) => (
                  <ReportCard
                    key={report.filename}
                    title={report.title}
                    description={report.description}
                    apiEndpoint={report.apiEndpoint}
                    filename={report.filename}
                    headers={report.headers}
                  />
                ))}
              </div>
            </section>

            {/* Financial Reports */}
            <section>
              <h2 className="text-lg font-semibold text-foreground dark:text-gray-200 mb-4">
                Financial Reports
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {financialReports.map((report) => (
                  <ReportCard
                    key={report.filename}
                    title={report.title}
                    description={report.description}
                    apiEndpoint={report.apiEndpoint}
                    filename={report.filename}
                    headers={report.headers}
                  />
                ))}
              </div>
            </section>

            {/* Organization Reports */}
            <section>
              <h2 className="text-lg font-semibold text-foreground dark:text-gray-200 mb-4">
                Organisation Reports
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {organizationReports.map((report) => (
                  <ReportCard
                    key={report.filename}
                    title={report.title}
                    description={report.description}
                    apiEndpoint={report.apiEndpoint}
                    filename={report.filename}
                    headers={report.headers}
                  />
                ))}
              </div>
            </section>

            {/* Geographic Reports */}
            <section>
              <h2 className="text-lg font-semibold text-foreground dark:text-gray-200 mb-4">
                Geographic Reports
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {geographicReports.map((report) => (
                  <ReportCard
                    key={report.filename}
                    title={report.title}
                    description={report.description}
                    apiEndpoint={report.apiEndpoint}
                    filename={report.filename}
                    headers={report.headers}
                  />
                ))}
              </div>
            </section>

            {/* Fund Reports */}
            <section>
              <h2 className="text-lg font-semibold text-foreground dark:text-gray-200 mb-4">
                Pooled Fund Reports
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {fundReports.map((report) => (
                  <ReportCard
                    key={report.filename}
                    title={report.title}
                    description={report.description}
                    apiEndpoint={report.apiEndpoint}
                    filename={report.filename}
                    headers={report.headers}
                  />
                ))}
              </div>
            </section>

            {/* Data Quality Reports */}
            <section>
              <h2 className="text-lg font-semibold text-foreground dark:text-gray-200 mb-4">
                Data Quality Reports
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {dataQualityReports.map((report) => (
                  <ReportCard
                    key={report.filename}
                    title={report.title}
                    description={report.description}
                    apiEndpoint={report.apiEndpoint}
                    filename={report.filename}
                    headers={report.headers}
                  />
                ))}
              </div>
            </section>
          </TabsContent>

          {/* Custom Report Builder Tab */}
          <TabsContent value="custom" className="mt-0 border-0 p-0">
            <CustomReportBuilder />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  )
}



