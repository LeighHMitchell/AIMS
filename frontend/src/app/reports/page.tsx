"use client"

import React from "react"
import { MainLayout } from '@/components/layout/main-layout'
import { ReportCard, ReportHeader } from "@/components/reports/ReportCard"
import {
  FileText,
  DollarSign,
  TrendingUp,
  PieChart,
  Building2,
  MapPin,
  AlertCircle,
  ShieldCheck,
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
  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Header */}
        <header>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
            <FileText className="h-8 w-8 text-blue-600" />
            Reports
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Download pre-formatted CSV reports for analysis and reporting. Click any report to generate and download the latest data.
          </p>
        </header>

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
      </div>
    </MainLayout>
  )
}


