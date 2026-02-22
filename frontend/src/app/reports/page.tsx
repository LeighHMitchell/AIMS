"use client"

import React from "react"
import { useSearchParams, useRouter } from 'next/navigation'
import { MainLayout } from '@/components/layout/main-layout'
import { ReportCard, ReportHeader } from "@/components/reports/ReportCard"
import { CustomReportBuilder } from "@/components/reports/CustomReportBuilder"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  FileText,
  DollarSign,
  TrendingUp,
  PieChart,
  Building2,
  MapPin,
  AlertCircle,
  ShieldCheck,
  BarChart3,
  Wallet,
  Users,
} from "lucide-react"

// Report configurations
interface ReportConfig {
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  apiEndpoint: string
  filename: string
  headers: ReportHeader[]
}

const activityReports: ReportConfig[] = [
  {
    title: "All Activities Master List",
    description: "Complete list of all activities with key details including IATI ID, status, dates, budgets, and locations.",
    icon: FileText,
    apiEndpoint: "/api/reports/activities",
    filename: "activities_master_list",
    headers: [
      { key: "iati_identifier", label: "IATI ID" },
      { key: "title", label: "Title" },
      { key: "status", label: "Status" },
      { key: "reporting_org", label: "Reporting Org" },
      { key: "start_date", label: "Start Date" },
      { key: "end_date", label: "End Date" },
      { key: "total_budget", label: "Total Budget (USD)" },
      { key: "total_disbursed", label: "Total Disbursed (USD)" },
      { key: "sectors", label: "Sectors" },
      { key: "locations", label: "Locations" },
    ],
  },
]

const financialReports: ReportConfig[] = [
  {
    title: "Disbursements by Development Partner",
    description: "Financial summary showing total commitments and disbursements by each development partner organization.",
    icon: DollarSign,
    apiEndpoint: "/api/reports/disbursements-by-partner",
    filename: "disbursements_by_partner",
    headers: [
      { key: "organization_name", label: "Organization Name" },
      { key: "organization_type", label: "Organization Type" },
      { key: "total_committed", label: "Total Committed (USD)" },
      { key: "total_disbursed", label: "Total Disbursed (USD)" },
      { key: "activity_count", label: "Activity Count" },
      { key: "last_transaction_date", label: "Last Transaction Date" },
    ],
  },
  {
    title: "Commitments vs Disbursements",
    description: "Year-over-year comparison of total commitments versus disbursements with variance analysis.",
    icon: TrendingUp,
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
    icon: PieChart,
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
    icon: MapPin,
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
]

const organizationReports: ReportConfig[] = [
  {
    title: "Development Partners Summary",
    description: "Overview of all development partner organizations with their activity counts and financial totals.",
    icon: Building2,
    apiEndpoint: "/api/reports/organizations-summary",
    filename: "organizations_summary",
    headers: [
      { key: "organization_name", label: "Organization Name" },
      { key: "organization_type", label: "Type" },
      { key: "iati_ref", label: "IATI Ref" },
      { key: "active_activities", label: "Active Activities" },
      { key: "total_budget", label: "Total Budget (USD)" },
      { key: "total_disbursed", label: "Total Disbursed (USD)" },
    ],
  },
]

const fundReports: ReportConfig[] = [
  {
    title: "Fund Utilisation Report",
    description: "Summary of all pooled funds showing contributions, disbursements, balance, utilisation rate, and child activity counts.",
    icon: Wallet,
    apiEndpoint: "/api/reports/fund-utilisation",
    filename: "fund_utilisation",
    headers: [
      { key: "fund_name", label: "Fund Name" },
      { key: "total_contributions", label: "Total Contributions (USD)" },
      { key: "total_disbursements", label: "Total Disbursements (USD)" },
      { key: "balance", label: "Balance (USD)" },
      { key: "utilisation_percent", label: "Utilisation (%)" },
      { key: "child_activities", label: "Child Activities" },
      { key: "status", label: "Status" },
    ],
  },
  {
    title: "Donor Contribution Summary",
    description: "All contributions across all pooled funds, grouped by donor organisation with pledged, committed, and received breakdowns.",
    icon: Users,
    apiEndpoint: "/api/reports/fund-donor-contributions",
    filename: "fund_donor_contributions",
    headers: [
      { key: "donor_name", label: "Donor Name" },
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
    icon: PieChart,
    apiEndpoint: "/api/reports/fund-sector-allocation",
    filename: "fund_sector_allocation",
    headers: [
      { key: "fund_name", label: "Fund Name" },
      { key: "sector", label: "Sector" },
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
    icon: AlertCircle,
    apiEndpoint: "/api/reports/data-quality",
    filename: "data_quality_report",
    headers: [
      { key: "activity_title", label: "Activity Title" },
      { key: "iati_id", label: "IATI ID" },
      { key: "missing_fields", label: "Missing Fields" },
      { key: "completeness_score", label: "Completeness Score (%)" },
      { key: "last_updated", label: "Last Updated" },
      { key: "reporting_org", label: "Reporting Org" },
    ],
  },
  {
    title: "Transparency Index Export",
    description: "Full transparency score data for all activities based on the 2026 Aid Transparency Index methodology.",
    icon: ShieldCheck,
    apiEndpoint: "/api/reports/transparency-export",
    filename: "transparency_index",
    headers: [
      { key: "activity_title", label: "Activity Title" },
      { key: "reporting_org", label: "Reporting Org" },
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
        <header>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
            <FileText className="h-8 w-8 text-blue-600" />
            Reports
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Download pre-formatted reports or design your own custom pivot tables.
          </p>
        </header>

        {/* Tabs for Standard vs Custom Reports */}
        <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="p-1 h-auto bg-background gap-1 border mb-6 flex flex-wrap">
            <TabsTrigger value="standard" className="gap-2 data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900 data-[state=active]:shadow-sm">
              <FileText className="h-4 w-4" />
              Standard Reports
            </TabsTrigger>
            <TabsTrigger value="custom" className="group gap-2 data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900 data-[state=active]:shadow-sm">
              <BarChart3 className="h-4 w-4" />
              Design Your Own
              <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-[#3C6255] text-white group-data-[state=active]:bg-white group-data-[state=active]:text-[#3C6255]">
                New
              </span>
            </TabsTrigger>
          </TabsList>

          {/* Standard Reports Tab */}
          <TabsContent value="standard" className="space-y-8 mt-0 border-0 p-0">
            {/* Activity Reports */}
            <section>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
                Activity Reports
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activityReports.map((report) => (
                  <ReportCard
                    key={report.filename}
                    title={report.title}
                    description={report.description}
                    icon={report.icon}
                    apiEndpoint={report.apiEndpoint}
                    filename={report.filename}
                    headers={report.headers}
                  />
                ))}
              </div>
            </section>

            {/* Financial Reports */}
            <section>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
                Financial Reports
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {financialReports.map((report) => (
                  <ReportCard
                    key={report.filename}
                    title={report.title}
                    description={report.description}
                    icon={report.icon}
                    apiEndpoint={report.apiEndpoint}
                    filename={report.filename}
                    headers={report.headers}
                  />
                ))}
              </div>
            </section>

            {/* Organization Reports */}
            <section>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
                Organization Reports
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {organizationReports.map((report) => (
                  <ReportCard
                    key={report.filename}
                    title={report.title}
                    description={report.description}
                    icon={report.icon}
                    apiEndpoint={report.apiEndpoint}
                    filename={report.filename}
                    headers={report.headers}
                  />
                ))}
              </div>
            </section>

            {/* Fund Reports */}
            <section>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
                Pooled Fund Reports
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {fundReports.map((report) => (
                  <ReportCard
                    key={report.filename}
                    title={report.title}
                    description={report.description}
                    icon={report.icon}
                    apiEndpoint={report.apiEndpoint}
                    filename={report.filename}
                    headers={report.headers}
                  />
                ))}
              </div>
            </section>

            {/* Data Quality Reports */}
            <section>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
                Data Quality Reports
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {dataQualityReports.map((report) => (
                  <ReportCard
                    key={report.filename}
                    title={report.title}
                    description={report.description}
                    icon={report.icon}
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



