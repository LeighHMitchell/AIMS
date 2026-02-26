import { createClient } from '@supabase/supabase-js'
import { createBrowserClient } from '@supabase/ssr'

// Environment variables with validation
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// Validate URL format
function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

// Log configuration status only once
let hasLoggedConfig = false
if (typeof window === 'undefined' && !hasLoggedConfig) {
  console.log('[Supabase] Configuration status:')
  console.log('- NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓ Set' : '✗ Missing')
  console.log('- NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✓ Set' : '✗ Missing')
  console.log('- SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceRoleKey ? '✓ Set' : '✗ Missing')
  hasLoggedConfig = true
}

// Create a singleton instance for the admin client
let _supabaseAdmin: any = null

// Helper function to create admin client with proper error handling
function createAdminClient() {
  if (!supabaseUrl || !supabaseServiceRoleKey || !isValidUrl(supabaseUrl)) {
    console.error('[Supabase] Missing or invalid environment variables for admin client')
    console.error('- URL:', supabaseUrl ? 'Present' : 'Missing', supabaseUrl && !isValidUrl(supabaseUrl) ? '(Invalid format)' : '')
    console.error('- Service Key:', supabaseServiceRoleKey ? 'Present' : 'Missing')
    return null
  }

  try {
    return createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      db: {
        schema: 'public'
      },
      global: {
        headers: {
          'x-supabase-request-source': 'server'
        }
      }
    })
  } catch (error) {
    console.error('[Supabase] Error creating admin client:', error)
    return null
  }
}

// Client-side Supabase client (uses anon key with cookie-based auth)
// Uses createBrowserClient from @supabase/ssr to store sessions in cookies,
// which can be read by server-side requireAuth() using createServerClient
export const supabase = (supabaseUrl && supabaseAnonKey && isValidUrl(supabaseUrl))
  ? (typeof window !== 'undefined'
      ? createBrowserClient(supabaseUrl, supabaseAnonKey)
      : createClient(supabaseUrl, supabaseAnonKey, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          }
        }))
  : null as any

// Import local database as fallback
import { localDb } from './db/local-db'

// Server-side Supabase client with lazy initialization
export function getSupabaseAdmin() {
  if (typeof window !== 'undefined') {
    // Don't create admin client on client-side
    return null
  }
  
  // Check if we have the required environment variables
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('[Supabase] Missing required environment variables for admin client')
    console.error('- NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'Present' : 'Missing')
    console.error('- SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceRoleKey ? 'Present' : 'Missing')
    return null
  }
  
  // Validate URL format
  if (!isValidUrl(supabaseUrl)) {
    console.error('[Supabase] Invalid Supabase URL format:', supabaseUrl)
    return null
  }
  
  if (!_supabaseAdmin) {
    _supabaseAdmin = createAdminClient()
  }
  return _supabaseAdmin
}

// Get database client (Supabase or local fallback)
export function getDbClient() {
  const supabaseClient = getSupabaseAdmin()
  if (supabaseClient) {
    return supabaseClient
  }
  
  // Import and initialize local database
  const { localDb, ensureInitialized } = require('./db/local-db')
  ensureInitialized()
  
  console.log('[Database] Using local database (Supabase not configured)')
  return localDb as any
}

// Database types (you can generate these from Supabase later)
export type Database = {
  public: {
    Tables: {
      activities: {
        Row: {
          id: string
          other_identifier: string | null
          iati_identifier: string | null
          title_narrative: string
          description_narrative: string | null
          acronym: string | null
          description_objectives: string | null
          description_target_groups: string | null
          description_other: string | null
          created_by_org_name: string | null
          created_by_org_acronym: string | null
          collaboration_type: string | null
          activity_status: string
          publication_status: string
          submission_status: string
          banner: string | null
          icon: string | null
          reporting_org_id: string | null
          hierarchy: number
          linked_data_uri: string | null
          planned_start_date: string | null
          planned_end_date: string | null
          actual_start_date: string | null
          actual_end_date: string | null
          submitted_by: string | null
          submitted_at: string | null
          validated_by: string | null
          validated_at: string | null
          published_by: string | null
          published_at: string | null
          rejected_by: string | null
          rejected_at: string | null
          rejection_reason: string | null
          created_by: string | null
          last_edited_by: string | null
          created_at: string
          updated_at: string
          default_tied_status: string | null
          default_currency: string | null
          default_aid_type: string | null
          default_finance_type: string | null
          default_flow_type: string | null
          default_modality: number | null
          default_modality_override: boolean | null
          otherIdentifiers: any[] | null
          capital_spend_percentage: number | null
        }
        Insert: Omit<Database['public']['Tables']['activities']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['activities']['Insert']>
      }
      transactions: {
        Row: {
          id: string
          activity_id: string
          organization_id: string | null
          transaction_type: string
          provider_org: string | null
          receiver_org: string | null
          value: number
          currency: string
          transaction_date: string | null
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['transactions']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['transactions']['Insert']>
      }
      partners: {
        Row: {
          id: string
          name: string
          type: string | null
          country: string | null
          email: string | null
          phone: string | null
          address: string | null
          website: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['partners']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['partners']['Insert']>
      }
      users: {
        Row: {
          id: string
          email: string
          name: string
          role: string
          organization_id: string | null
          first_name: string | null
          middle_name: string | null
          last_name: string | null
          gender: string | null
          job_title: string | null
          department: string | null
          telephone: string | null
          website: string | null
          mailing_address: string | null
          address_line_1: string | null
          address_line_2: string | null
          city: string | null
          state_province: string | null
          country: string | null
          postal_code: string | null
          bio: string | null
          preferred_language: string | null
          timezone: string | null
          avatar_url: string | null
          title: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['users']['Insert']>
      }
      organizations: {
        Row: {
          id: string
          name: string
          acronym: string | null
          type: string | null
          Organisation_Type_Code: string | null
          Organisation_Type_Name: string | null
          country: string | null
          country_represented: string | null
          cooperation_modality: string | null
          iati_org_id: string | null
          description: string | null
          website: string | null
          email: string | null
          phone: string | null
          address: string | null
          logo: string | null
          banner: string | null
          alias_refs: string[] | null
          name_aliases: string[] | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['organizations']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['organizations']['Insert']>
      }
      activity_logs: {
        Row: {
          id: string
          user_id: string | null
          activity_id: string | null
          action: string
          details: any
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['activity_logs']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['activity_logs']['Insert']>
      }
      activity_sectors: {
        Row: {
          id: string
          activity_id: string
          sector_code: string
          sector_name: string
          percentage: number | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['activity_sectors']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['activity_sectors']['Insert']>
      }
      activity_comments: {
        Row: {
          id: string
          activity_id: string
          user_id: string | null
          content: string
          type: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['activity_comments']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['activity_comments']['Insert']>
      }
      activity_contributors: {
        Row: {
          id: string
          activity_id: string
          organization_id: string | null
          status: string
          nominated_by: string | null
          nominated_at: string
          responded_at: string | null
          can_edit_own_data: boolean
          can_view_other_drafts: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['activity_contributors']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['activity_contributors']['Insert']>
      }
      projects: {
        Row: {
          id: string
          name: string
          description: string | null
          start_date: string | null
          end_date: string | null
          budget: number | null
          currency: string
          status: string
          organization_id: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['projects']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['projects']['Insert']>
      }
      activity_results: {
        Row: {
          id: string
          activity_id: string
          type: string
          aggregation_status: boolean
          title: any
          description: any | null
          created_at: string
          updated_at: string
          created_by: string | null
          updated_by: string | null
        }
        Insert: Omit<Database['public']['Tables']['activity_results']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['activity_results']['Insert']>
      }
      result_indicators: {
        Row: {
          id: string
          result_id: string
          measure: string
          ascending: boolean
          aggregation_status: boolean
          title: any
          description: any | null
          reference_vocab: string | null
          reference_code: string | null
          reference_uri: string | null
          created_at: string
          updated_at: string
          created_by: string | null
          updated_by: string | null
        }
        Insert: Omit<Database['public']['Tables']['result_indicators']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['result_indicators']['Insert']>
      }
      indicator_baselines: {
        Row: {
          id: string
          indicator_id: string
          baseline_year: number | null
          iso_date: string | null
          value: number | null
          comment: string | null
          location_ref: string | null
          created_at: string
          updated_at: string
          created_by: string | null
        }
        Insert: Omit<Database['public']['Tables']['indicator_baselines']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['indicator_baselines']['Insert']>
      }
      indicator_periods: {
        Row: {
          id: string
          indicator_id: string
          period_start: string
          period_end: string
          target_value: number | null
          target_comment: string | null
          target_location_ref: string | null
          actual_value: number | null
          actual_comment: string | null
          actual_location_ref: string | null
          facet: string
          created_at: string
          updated_at: string
          created_by: string | null
          updated_by: string | null
        }
        Insert: Omit<Database['public']['Tables']['indicator_periods']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['indicator_periods']['Insert']>
      }
      national_development_goals: {
        Row: {
          id: string
          code: string
          name: string
          description: string | null
          plan_name: string
          display_order: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['national_development_goals']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['national_development_goals']['Insert']>
      }
      project_bank_projects: {
        Row: {
          id: string
          project_code: string
          name: string
          description: string | null
          nominating_ministry: string
          sector: string
          region: string | null
          estimated_cost: number | null
          currency: string
          ndp_goal_id: string | null
          ndp_aligned: boolean
          sdg_goals: string[] | null
          firr: number | null
          eirr: number | null
          firr_date: string | null
          eirr_date: string | null
          status: string
          pathway: string | null
          vgf_amount: number | null
          vgf_calculated: boolean
          land_parcel_id: string | null
          total_committed: number | null
          total_disbursed: number | null
          funding_gap: number | null
          aims_activity_id: string | null
          origin: string
          rejection_reason: string | null
          rejected_at: string | null
          nominated_at: string | null
          screened_at: string | null
          appraised_at: string | null
          approved_at: string | null
          created_at: string
          updated_at: string
          created_by: string | null
          updated_by: string | null
          appraisal_stage: string | null
          routing_outcome: string | null
          contact_officer: string | null
          contact_email: string | null
          contact_phone: string | null
          project_type: string | null
          sub_sector: string | null
          townships: string[] | null
          estimated_start_date: string | null
          estimated_duration_months: number | null
          objectives: string | null
          target_beneficiaries: string | null
          construction_period_years: number | null
          operational_period_years: number | null
          project_life_years: number | null
          preliminary_fs_summary: string | null
          preliminary_fs_date: string | null
          preliminary_fs_conducted_by: string | null
          cost_table_data: any | null
          technical_approach: string | null
          technology_methodology: string | null
          technical_risks: string | null
          has_technical_design: boolean
          technical_design_maturity: string | null
          environmental_impact_level: string | null
          social_impact_level: string | null
          land_acquisition_required: boolean
          resettlement_required: boolean
          estimated_affected_households: number | null
          has_revenue_component: boolean
          revenue_sources: string[] | null
          market_assessment_summary: string | null
          projected_annual_users: number | null
          projected_annual_revenue: number | null
          revenue_ramp_up_years: number | null
          msdp_strategy_area: string | null
          secondary_ndp_goals: string[] | null
          alignment_justification: string | null
          sector_strategy_reference: string | null
          in_sector_investment_plan: boolean
          firr_calculation_data: any | null
          eirr_calculation_data: any | null
          eirr_shadow_prices: any | null
          vgf_calculation_data: any | null
          vgf_status: string | null
          dap_compliant: boolean | null
          dap_notes: string | null
          budget_allocation_status: string | null
          budget_amount: number | null
          ppp_contract_type: string | null
          ppp_contract_details: any | null
          implementing_agency: string | null
          equity_ratio: number | null
        }
        Insert: Omit<Database['public']['Tables']['project_bank_projects']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['project_bank_projects']['Insert']>
      }
      project_bank_settings: {
        Row: {
          id: string
          key: string
          value: any
          label: string
          description: string | null
          enforcement: string
          category: string
          updated_at: string
          updated_by: string | null
        }
        Insert: Omit<Database['public']['Tables']['project_bank_settings']['Row'], 'id' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['project_bank_settings']['Insert']>
      }
      unsolicited_proposals: {
        Row: {
          id: string
          project_id: string
          proponent_name: string
          proponent_contact: string | null
          proponent_company: string | null
          proposal_date: string | null
          status: string
          rfp_published_date: string | null
          counter_proposal_deadline: string | null
          original_proponent_match_deadline: string | null
          match_response: string | null
          award_decision: string | null
          award_date: string | null
          awarded_to: string | null
          notes: string | null
          created_at: string
          updated_at: string
          created_by: string | null
        }
        Insert: Omit<Database['public']['Tables']['unsolicited_proposals']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['unsolicited_proposals']['Insert']>
      }
      proposal_bidders: {
        Row: {
          id: string
          proposal_id: string
          company_name: string
          contact_name: string | null
          contact_email: string | null
          contact_phone: string | null
          bid_amount: number | null
          currency: string
          proposal_document_id: string | null
          evaluation_score: number | null
          evaluation_notes: string | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['proposal_bidders']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['proposal_bidders']['Insert']>
      }
      project_monitoring_schedules: {
        Row: {
          id: string
          project_id: string
          interval_months: number
          next_due_date: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['project_monitoring_schedules']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['project_monitoring_schedules']['Insert']>
      }
      project_monitoring_reports: {
        Row: {
          id: string
          project_id: string
          schedule_id: string | null
          report_period_start: string | null
          report_period_end: string | null
          due_date: string | null
          submitted_date: string | null
          status: string
          compliance_status: string
          submitted_by: string | null
          reviewed_by: string | null
          reviewed_at: string | null
          review_notes: string | null
          document_id: string | null
          key_findings: string | null
          recommendations: string | null
          kpi_data: any | null
        }
        Insert: Omit<Database['public']['Tables']['project_monitoring_reports']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['project_monitoring_reports']['Insert']>
      }
      see_transfers: {
        Row: {
          id: string
          transfer_code: string
          see_name: string
          see_sector: string | null
          see_ministry: string | null
          description: string | null
          status: string
          transfer_mode: string | null
          current_annual_revenue: number | null
          current_annual_expenses: number | null
          total_assets: number | null
          total_liabilities: number | null
          employee_count: number | null
          valuation_amount: number | null
          valuation_date: string | null
          valuation_method: string | null
          valuation_firm: string | null
          shares_allotted_to_state: number | null
          regulatory_separation_done: boolean
          legislation_review_done: boolean
          fixed_asset_register_maintained: boolean
          restructuring_notes: string | null
          created_at: string
          updated_at: string
          created_by: string | null
          updated_by: string | null
        }
        Insert: Omit<Database['public']['Tables']['see_transfers']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['see_transfers']['Insert']>
      }
      see_transfer_financials: {
        Row: {
          id: string
          transfer_id: string
          year: number
          period_type: string
          revenue: number | null
          expenses: number | null
          net_income: number | null
          free_cash_flow: number | null
          capex: number | null
          depreciation: number | null
        }
        Insert: Omit<Database['public']['Tables']['see_transfer_financials']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['see_transfer_financials']['Insert']>
      }
      see_transfer_documents: {
        Row: {
          id: string
          transfer_id: string
          document_type: string
          file_name: string
          file_path: string
          file_size: number | null
          mime_type: string | null
          upload_stage: string | null
          description: string | null
          uploaded_by: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['see_transfer_documents']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['see_transfer_documents']['Insert']>
      }
      project_bank_donors: {
        Row: {
          id: string
          project_id: string
          donor_name: string
          donor_type: string | null
          instrument_type: string | null
          amount: number | null
          currency: string
          commitment_status: string
          iati_identifier: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['project_bank_donors']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['project_bank_donors']['Insert']>
      }
      project_appraisals: {
        Row: {
          id: string
          project_id: string
          appraisal_type: string
          firr_result: number | null
          eirr_result: number | null
          npv: number | null
          benefit_cost_ratio: number | null
          shadow_wage_rate: number | null
          shadow_exchange_rate: number | null
          standard_conversion_factor: number | null
          social_discount_rate: number | null
          project_life_years: number | null
          construction_years: number | null
          cost_data: any | null
          benefit_data: any | null
          appraised_by: string | null
          appraisal_date: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['project_appraisals']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['project_appraisals']['Insert']>
      }
      project_documents: {
        Row: {
          id: string
          project_id: string
          document_type: string
          file_name: string
          file_path: string
          file_size: number | null
          mime_type: string | null
          upload_stage: string | null
          description: string | null
          is_required: boolean
          uploaded_by: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['project_documents']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['project_documents']['Insert']>
      }
      appraisal_shadow_prices: {
        Row: {
          id: string
          shadow_wage_rate: number
          shadow_exchange_rate: number
          standard_conversion_factor: number
          social_discount_rate: number
          sector: string | null
          effective_from: string | null
          effective_to: string | null
          is_active: boolean
          approved_by: string | null
          notes: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['appraisal_shadow_prices']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['appraisal_shadow_prices']['Insert']>
      }
      land_parcels: {
        Row: {
          id: string
          parcel_code: string
          name: string
          state_region: string
          township: string | null
          geometry: any | null
          size_hectares: number | null
          classification: string | null
          controlling_ministry_id: string | null
          asset_type: string | null
          title_status: string
          ndp_goal_id: string | null
          secondary_ndp_goals: string[]
          status: string
          allocated_to: string | null
          lease_start_date: string | null
          lease_end_date: string | null
          notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['land_parcels']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['land_parcels']['Insert']>
      }
      land_parcel_classifications: {
        Row: {
          name: string
          description: string | null
          display_order: number
          is_active: boolean
          created_at: string
        }
        Insert: Database['public']['Tables']['land_parcel_classifications']['Row']
        Update: Partial<Database['public']['Tables']['land_parcel_classifications']['Insert']>
      }
      allocation_requests: {
        Row: {
          id: string
          parcel_id: string
          organization_id: string
          requested_by: string | null
          status: string
          purpose: string | null
          proposed_start_date: string | null
          proposed_end_date: string | null
          linked_project_id: string | null
          priority_score_purpose: number | null
          priority_score_track_record: number | null
          priority_score_feasibility: number | null
          total_score: number | null
          reviewer_notes: string | null
          reviewed_by: string | null
          reviewed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['allocation_requests']['Row'], 'id' | 'total_score' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['allocation_requests']['Insert']>
      }
      land_parcel_projects: {
        Row: {
          id: string
          parcel_id: string
          project_id: string
          linked_at: string
          linked_by: string | null
        }
        Insert: Omit<Database['public']['Tables']['land_parcel_projects']['Row'], 'id' | 'linked_at'>
        Update: Partial<Database['public']['Tables']['land_parcel_projects']['Insert']>
      }
      land_parcel_history: {
        Row: {
          id: string
          parcel_id: string
          action: string
          details: any | null
          performed_by: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['land_parcel_history']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['land_parcel_history']['Insert']>
      }
      land_parcel_documents: {
        Row: {
          id: string
          parcel_id: string
          document_type: string
          file_name: string
          file_path: string
          file_size: number | null
          mime_type: string | null
          description: string | null
          uploaded_by: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['land_parcel_documents']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['land_parcel_documents']['Insert']>
      }
      line_ministries: {
        Row: {
          id: string
          name: string
          code: string
          is_active: boolean
          display_order: number
        }
        Insert: Omit<Database['public']['Tables']['line_ministries']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['line_ministries']['Insert']>
      }
      land_asset_types: {
        Row: {
          name: string
          description: string | null
          display_order: number
          is_active: boolean
        }
        Insert: Database['public']['Tables']['land_asset_types']['Row']
        Update: Partial<Database['public']['Tables']['land_asset_types']['Insert']>
      }
    }
  }
}