import { NextResponse } from 'next/server';
import { verifyCronSecret } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// ─── helpers ────────────────────────────────────────────────────────────────
function cashFlows(
  years: number,
  capexPerYear: number,
  constructionYears: number,
  opexPerYear: number,
  revenueAtSteadyState: number,
  rampUpYears: number,
): { year: number; capex: number; opex: number; revenue: number }[] {
  const rows: { year: number; capex: number; opex: number; revenue: number }[] = [];
  for (let y = 0; y < years; y++) {
    const yr = 2026 + y;
    const capex = y < constructionYears ? capexPerYear : 0;
    const opex = y >= constructionYears ? opexPerYear : opexPerYear * 0.1;
    let revenue = 0;
    if (y >= constructionYears) {
      const opYears = y - constructionYears;
      revenue =
        opYears < rampUpYears
          ? revenueAtSteadyState * ((opYears + 1) / (rampUpYears + 1))
          : revenueAtSteadyState;
    }
    rows.push({ year: yr, capex: Math.round(capex), opex: Math.round(opex), revenue: Math.round(revenue) });
  }
  return rows;
}

// ─── project definitions ────────────────────────────────────────────────────
function buildProjects() {
  const now = new Date().toISOString();
  const ago = (days: number) => new Date(Date.now() - days * 86400000).toISOString();

  // Shared intake fields helper
  const intake = (extra: Record<string, any>) => ({
    project_code: '',
    currency: 'USD',
    ndp_aligned: true,
    sdg_goals: ['9', '11'],
    status: 'screening' as const,
    origin: 'GOV',
    estimated_start_date: '2027-01-01',
    estimated_duration_months: 36,
    project_type: 'Infrastructure',
    contact_officer: 'U Kyaw Win',
    contact_email: 'kyawwin@mopfi.gov.mm',
    contact_phone: '+95-67-407-234',
    contact_position: 'Director',
    contact_ministry: 'Ministry of Planning and Finance',
    contact_department: 'Project Appraisal Division',
    ...extra,
  });

  // FS-1 fields helper (adds onto intake)
  const fs1Fields = (extra: Record<string, any>) => ({
    fs_conductor_type: 'company',
    fs_conductor_company_name: 'Myanmar Infrastructure Consulting Group',
    fs_conductor_company_address: '123 Pyay Road, Kamayut Township, Yangon',
    fs_conductor_company_phone: '+95-1-512-345',
    fs_conductor_company_email: 'info@micg.com.mm',
    fs_conductor_company_website: 'https://micg.com.mm',
    fs_conductor_contact_person: 'Dr Aung Myint',
    technical_design_maturity: 'preliminary',
    has_technical_design: true,
    land_acquisition_required: true,
    resettlement_required: false,
    estimated_affected_households: 0,
    has_revenue_component: true,
    revenue_ramp_up_years: 3,
    msdp_strategy_area: 'Goal 3: Job Creation & Private Sector-Led Growth',
    alignment_justification: 'Directly supports MSDP Strategy 3.4 on improving transport and ICT connectivity to reduce cost of doing business, create employment opportunities, and support regional economic integration across Myanmar.',
    sector_strategy_reference: 'National Transport Master Plan 2025–2040',
    in_sector_investment_plan: true,
    ...extra,
  });

  return [
    // ── 1. Yangon–Mandalay Expressway Upgrade ──────────────────────────
    intake({
      name: 'Yangon–Mandalay Expressway Upgrade',
      description:
        'Widening and resurfacing of the 587 km Yangon–Mandalay Expressway from four to six lanes, adding rest areas, weigh stations, and intelligent transport systems (ITS) including electronic toll collection.',
      objectives:
        'Reduce travel time from 8 h to 5 h, decrease accident rate by 40%, increase freight throughput by 60%, and improve all-weather reliability for intercity logistics.',
      target_beneficiaries:
        'Approximately 12 million residents in Yangon and Mandalay Regions plus 3 million in transit corridors; 15,000 daily commercial vehicles and 25,000 passenger vehicles.',
      nominating_ministry: 'Ministry of Construction',
      implementing_agency: 'Department of Highways',
      sector: 'Transport',
      sub_sector: 'Roads & Highways',
      region: 'Nationwide',
      estimated_cost: 850_000_000,
      project_stage: 'intake_draft',
    }),

    // ── 2. Myitkyina Solar Farm ────────────────────────────────────────
    intake({
      name: 'Myitkyina Solar Farm',
      description:
        '100 MW utility-scale solar photovoltaic farm on 200 hectares of degraded agricultural land near Myitkyina, Kachin State, with battery energy storage system (BESS) for grid stabilisation.',
      objectives:
        'Add 100 MW of clean baseload capacity to the northern grid, reduce diesel-generator dependence in Kachin by 70%, and lower electricity costs for 250,000 households.',
      target_beneficiaries:
        '250,000 households and 1,200 small businesses in Kachin State currently relying on expensive off-grid diesel generation.',
      nominating_ministry: 'Ministry of Electricity and Energy',
      implementing_agency: 'Department of Electric Power Planning',
      sector: 'Energy',
      sub_sector: 'Renewable Energy',
      region: 'Kachin',
      estimated_cost: 120_000_000,
      project_stage: 'intake_submitted',
      nominated_at: ago(14),
    }),

    // ── 3. Sagaing Agricultural Training Centre ────────────────────────
    intake({
      name: 'Sagaing Agricultural Training Centre',
      description:
        'Construction of a 5-hectare regional agricultural vocational training centre in Monywa, Sagaing Region, offering certified courses in modern farming techniques, post-harvest handling, and agro-processing.',
      objectives:
        'Train 2,000 farmers and extension workers per year, increase regional crop yields by 25%, reduce post-harvest losses from 30% to 10%, and create 500 direct jobs.',
      target_beneficiaries:
        '2,000 trainees per year from Sagaing, Magway, and Mandalay Regions; 120,000 smallholder farming households in the dry zone.',
      nominating_ministry: 'Ministry of Agriculture, Livestock and Irrigation',
      implementing_agency: 'Department of Agriculture',
      sector: 'Agriculture',
      sub_sector: 'Agro-processing',
      region: 'Sagaing',
      estimated_cost: 18_000_000,
      project_stage: 'intake_returned',
      review_comments: 'Please clarify land tenure arrangements for the proposed site and provide letters of support from Sagaing Regional Government. Cost estimates for laboratory equipment appear understated — please revise with itemised quotations.',
      nominated_at: ago(30),
    }),

    // ── 4. Bago Water Treatment Plant ──────────────────────────────────
    intake({
      ...fs1Fields({
        technical_approach:
          'Conventional treatment train: coagulation, flocculation, sedimentation, rapid sand filtration, and chlorine disinfection. Designed for 50 MLD capacity with modular expansion to 100 MLD.',
        technology_methodology:
          'Proven conventional water treatment technology with local material sourcing. Pre-treatment includes intake screens and aeration. Sludge handling via gravity thickener and drying beds.',
        technical_risks:
          'Seasonal turbidity spikes during monsoon (June–October) may require additional pre-treatment. Raw water quality from Bago River subject to upstream agricultural runoff. Land acquisition for pipeline corridor may encounter encroachment.',
        environmental_impact_level: 'moderate',
        social_impact_level: 'low',
        revenue_sources: ['User charges', 'Service charges'],
        market_assessment_summary:
          'Bago City population of 500,000 currently served at only 35% coverage. Willingness-to-pay survey (2025) shows 85% of households willing to pay MMK 5,000/month for reliable piped water. Industrial demand from Bago Industrial Zone adds 8 MLD.',
        projected_annual_users: 350_000,
        projected_annual_revenue: 4_200_000,
        construction_period_years: 3,
        operational_period_years: 25,
        project_life_years: 28,
      }),
      name: 'Bago Water Treatment Plant',
      description:
        'New 50 MLD water treatment plant drawing from the Bago River to serve Bago City and surrounding townships, including 45 km of transmission mains and 120 km of distribution network.',
      objectives:
        'Increase piped water coverage in Bago City from 35% to 85%, provide safe drinking water meeting WHO standards, and reduce waterborne disease incidence by 60%.',
      target_beneficiaries:
        '350,000 residents in Bago City and surrounding peri-urban townships; 200 industrial units in Bago Industrial Zone.',
      nominating_ministry: 'Ministry of Construction',
      implementing_agency: 'Department of Urban and Housing Development',
      sector: 'WASH',
      sub_sector: 'Water Supply',
      region: 'Bago',
      estimated_cost: 65_000_000,
      project_stage: 'fs1_draft',
      feasibility_stage: 'registered',
      nominated_at: ago(60),
      screened_at: ago(45),
    }),

    // ── 5. Mandalay Industrial Zone Expansion ──────────────────────────
    intake({
      ...fs1Fields({
        technical_approach:
          'Greenfield industrial zone development on 300 hectares including internal roads, power substations, water/wastewater treatment, fibre-optic backbone, and worker amenities.',
        technology_methodology:
          'Modular zone development in three phases. Phase 1 covers 100 ha with plug-and-play factory shells. Smart metering and SCADA for all utilities.',
        technical_risks:
          'Geotechnical conditions may require deep piling in some areas. Power supply from the national grid may be insufficient during peak — on-site 20 MW gas turbine backup planned.',
        environmental_impact_level: 'significant',
        social_impact_level: 'moderate',
        revenue_sources: ['Lease income', 'Service charges', 'User charges'],
        market_assessment_summary:
          'Pre-registration of interest from 45 firms (garment, food processing, light assembly). Demand study projects 80% occupancy within 5 years. Land lease rates benchmarked at USD 35/m²/year.',
        projected_annual_users: 45,
        projected_annual_revenue: 31_500_000,
        construction_period_years: 2,
        operational_period_years: 30,
        project_life_years: 32,
      }),
      name: 'Mandalay Industrial Zone Expansion',
      description:
        'Development of a 300-hectare modern industrial zone adjacent to the Mandalay–Myotha Expressway, targeting garment, food processing, and light manufacturing, with full utility infrastructure.',
      objectives:
        'Attract USD 500 M in FDI, create 50,000 direct jobs, and increase manufactured exports from the Mandalay corridor by 30% over 10 years.',
      target_beneficiaries:
        '50,000 workers and their families (approx. 200,000 people); 45+ domestic and foreign firms.',
      nominating_ministry: 'Ministry of Industry',
      implementing_agency: 'Directorate of Industrial Supervision and Inspection',
      sector: 'Industrial',
      sub_sector: 'Industrial Parks',
      region: 'Mandalay',
      estimated_cost: 220_000_000,
      origin: 'UNSOL',
      proponent_name: 'Myanmar Industrial Development Corporation',
      proponent_company: 'MIDC Holdings Ltd',
      proponent_contact: 'U Tun Aung Kyaw, CEO — +95-2-456-789',
      project_stage: 'fs1_submitted',
      feasibility_stage: 'fs1_submitted',
      firr: 12,
      firr_date: ago(10),
      firr_cost_table_data: cashFlows(32, 36_666_667, 2, 6_000_000, 31_500_000, 3),
      nominated_at: ago(90),
      screened_at: ago(75),
    }),

    // ── 6. Chin State Rural Health Clinics ─────────────────────────────
    intake({
      ...fs1Fields({
        fs_conductor_type: 'individual',
        fs_conductor_individual_name: 'Dr Khin Maung Oo',
        fs_conductor_individual_email: 'khinmgoo@mohs.gov.mm',
        fs_conductor_individual_phone: '+95-67-411-234',
        fs_conductor_individual_job_title: 'Senior Health Economist',
        fs_conductor_individual_company: 'Ministry of Health and Sports',
        technical_approach:
          'Construction of 25 modular rural health clinics using prefabricated steel-frame construction for rapid deployment. Each clinic: 200 m², 3 consultation rooms, pharmacy, lab, solar power, rainwater harvesting.',
        technology_methodology:
          'Prefabricated construction with local assembly. Solar PV (5 kW per clinic) with battery storage. Telemedicine connectivity via satellite link for specialist consultations.',
        technical_risks:
          'Remote locations in Chin State pose significant logistics challenges — road access limited during monsoon. Skilled labour availability is low. Cold chain maintenance for vaccines requires reliable solar power.',
        environmental_impact_level: 'negligible',
        social_impact_level: 'negligible',
        has_revenue_component: false,
        revenue_sources: [],
        market_assessment_summary: null,
        projected_annual_users: 150_000,
        projected_annual_revenue: 600_000,
        construction_period_years: 2,
        operational_period_years: 20,
        project_life_years: 22,
      }),
      name: 'Chin State Rural Health Clinics',
      description:
        'Construction and equipping of 25 rural health clinics across Chin State to improve primary healthcare access for remote communities, including telemedicine facilities and solar-powered cold chain storage.',
      objectives:
        'Reduce average travel time to nearest health facility from 6 h to 1 h, increase immunisation coverage from 40% to 80%, and reduce maternal mortality rate by 50%.',
      target_beneficiaries:
        '150,000 residents in 25 townships across Chin State, with focus on women, children under 5, and elderly populations.',
      nominating_ministry: 'Ministry of Health and Sports',
      implementing_agency: 'Department of Public Health',
      sector: 'Health',
      sub_sector: 'Primary Healthcare',
      region: 'Chin',
      estimated_cost: 12_000_000,
      project_stage: 'fs1_submitted',
      feasibility_stage: 'fs1_submitted',
      firr: 4,
      firr_date: ago(8),
      firr_cost_table_data: cashFlows(22, 3_000_000, 2, 800_000, 600_000, 2),
      nominated_at: ago(80),
      screened_at: ago(65),
    }),

    // ── 7. Ayeyarwady River Port Modernisation ─────────────────────────
    intake({
      ...fs1Fields({
        technical_approach:
          'Modernisation of three river ports (Pyay, Hinthada, Pathein) with new container handling equipment, dredging of approach channels to 4 m depth, and construction of RoRo ramps.',
        technology_methodology:
          'Mobile harbour cranes (2 per port), reach stackers, and automated gate systems. Dredging via cutter-suction dredger with disposal to engineered containment areas.',
        technical_risks:
          'Sedimentation rates in the Ayeyarwady are high — annual maintenance dredging of ~500,000 m³ required. Monsoon flooding may damage port infrastructure if flood walls are not raised.',
        environmental_impact_level: 'moderate',
        social_impact_level: 'moderate',
        revenue_sources: ['User charges', 'Concession fees', 'Lease income'],
        market_assessment_summary:
          'Inland waterway freight currently at 4 M tonnes/year, projected to reach 8 M tonnes by 2035. Three ports handle 60% of delta trade. Container throughput expected to triple with modernisation.',
        projected_annual_users: 1_200,
        projected_annual_revenue: 18_000_000,
        construction_period_years: 3,
        operational_period_years: 30,
        project_life_years: 33,
      }),
      name: 'Ayeyarwady River Port Modernisation',
      description:
        'Modernisation of three strategic river ports on the Ayeyarwady (Pyay, Hinthada, Pathein) to increase freight capacity, introduce container handling, and improve intermodal connectivity.',
      objectives:
        'Double inland waterway freight capacity, reduce cargo handling time by 60%, lower transport costs by 25%, and shift 15% of road freight to waterways.',
      target_beneficiaries:
        '1,200 vessel operators, 5,000 port workers, and 2 million residents in the Ayeyarwady delta who depend on river transport for goods and services.',
      nominating_ministry: 'Ministry of Transport and Communications',
      implementing_agency: 'Directorate of Water Resources and Improvement of River Systems',
      sector: 'Transport',
      sub_sector: 'Ports & Waterways',
      region: 'Ayeyarwady',
      estimated_cost: 180_000_000,
      project_stage: 'fs2_assigned',
      feasibility_stage: 'fs2_assigned',
      firr: 6,
      firr_date: ago(60),
      eirr: 18,
      eirr_date: ago(55),
      firr_cost_table_data: cashFlows(33, 20_000_000, 3, 5_000_000, 18_000_000, 3),
      category_recommendation: 'category_c',
      nominated_at: ago(180),
      screened_at: ago(160),
    }),

    // ── 8. Shan State Telecom Backbone ─────────────────────────────────
    intake({
      ...fs1Fields({
        technical_approach:
          '1,200 km fibre-optic backbone from Mandalay to Kengtung via Lashio and Taunggyi, with 15 repeater stations and 8 metro access nodes.',
        technology_methodology:
          'DWDM (Dense Wavelength Division Multiplexing) over single-mode fibre. 100 Gbps initial capacity upgradable to 400 Gbps. Underground duct installation along existing road corridors.',
        technical_risks:
          'Difficult terrain in eastern Shan State with landslide risk. Some segments cross conflict-affected areas requiring security coordination. Maintenance access during monsoon is limited.',
        environmental_impact_level: 'low',
        social_impact_level: 'low',
        revenue_sources: ['Lease income', 'Service charges'],
        market_assessment_summary:
          'Eastern Shan State has <10% broadband penetration. 4 mobile network operators committed to lease capacity. Government e-services require backbone connectivity for 28 township offices.',
        projected_annual_users: 500_000,
        projected_annual_revenue: 22_000_000,
        construction_period_years: 2,
        operational_period_years: 25,
        project_life_years: 27,
      }),
      name: 'Shan State Telecom Backbone',
      description:
        'Installation of 1,200 km of fibre-optic backbone connecting Mandalay to Kengtung via Lashio and Taunggyi, providing high-speed broadband to 28 townships in Shan State.',
      objectives:
        'Achieve 50% broadband penetration in Shan State by 2032, connect 28 township government offices to the national e-government network, and enable telemedicine and e-learning for 500,000 residents.',
      target_beneficiaries:
        '500,000 residents, 28 township administrations, 4 mobile operators, and 2,000 SMEs in eastern Shan State.',
      nominating_ministry: 'Ministry of Transport and Communications',
      implementing_agency: 'Posts and Telecommunications Department',
      sector: 'ICT',
      sub_sector: 'Telecommunications',
      region: 'Shan',
      estimated_cost: 95_000_000,
      origin: 'UNSOL',
      proponent_name: 'Shan Digital Infrastructure Consortium',
      proponent_company: 'Myanmar Telecom Ventures Ltd',
      proponent_contact: 'Daw Su Su Lwin, Managing Director — +95-1-234-567',
      project_stage: 'fs2_categorized',
      feasibility_stage: 'categorized',
      firr: 14,
      firr_date: ago(90),
      firr_cost_table_data: cashFlows(27, 15_833_333, 2, 3_000_000, 22_000_000, 3),
      category_recommendation: 'category_a',
      category_decision: 'category_a',
      category_rationale:
        'FIRR of 14% exceeds the 10% commercial viability threshold. The project is commercially attractive for private sector investment without requiring state financial support. The consortium has demonstrated technical capability and committed equity.',
      nominated_at: ago(240),
      screened_at: ago(220),
    }),

    // ── 9. Rakhine Coastal Highway PPP ─────────────────────────────────
    intake({
      ...fs1Fields({
        technical_approach:
          '280 km two-lane coastal highway from Sittwe to Gwa with 12 bridges, 3 tunnels, and 6 township bypasses. Design speed 80 km/h with climate-resilient embankments.',
        technology_methodology:
          'Asphalt concrete pavement on reinforced earth embankments. Bridge superstructures: pre-stressed concrete I-girders. Tunnels: NATM (New Austrian Tunnelling Method). Slope stabilisation with soil nailing and shotcrete.',
        technical_risks:
          'Coastal erosion and cyclone risk require raised embankments and armoured shoulders. Three river crossings have scour-prone alluvial foundations. Tunnel sections through weathered sandstone may encounter groundwater ingress.',
        environmental_impact_level: 'significant',
        social_impact_level: 'significant',
        estimated_affected_households: 450,
        resettlement_required: true,
        revenue_sources: ['Toll fees', 'Lease income'],
        market_assessment_summary:
          'No direct road link currently exists along the Rakhine coast — travel requires a 14-hour detour via Magway. Traffic demand study estimates 8,000 vehicles/day by Year 5 of operation. Toll willingness-to-pay validated at MMK 3,000 per car and MMK 8,000 per truck.',
        projected_annual_users: 2_920_000,
        projected_annual_revenue: 24_000_000,
        construction_period_years: 4,
        operational_period_years: 30,
        project_life_years: 34,
      }),
      name: 'Rakhine Coastal Highway PPP',
      description:
        'Construction of a 280 km two-lane coastal highway from Sittwe to Gwa in Rakhine State under a PPP concession, including 12 bridges, 3 tunnels, and toll collection infrastructure.',
      objectives:
        'Provide direct road connectivity along the Rakhine coast, reduce Sittwe–Gwa travel time from 14 h to 4 h, stimulate coastal economic development, and improve disaster evacuation routes.',
      target_beneficiaries:
        '1.5 million residents along the Rakhine coast; fishing communities, tourism operators, and agricultural producers in 6 townships.',
      nominating_ministry: 'Ministry of Construction',
      implementing_agency: 'Department of Highways',
      sector: 'Transport',
      sub_sector: 'Roads & Highways',
      region: 'Rakhine',
      estimated_cost: 420_000_000,
      project_stage: 'fs3_in_progress',
      feasibility_stage: 'fs3_in_progress',
      firr: 5,
      firr_date: ago(120),
      eirr: 16,
      eirr_date: ago(110),
      firr_cost_table_data: cashFlows(34, 35_000_000, 4, 6_000_000, 24_000_000, 4),
      category_recommendation: 'category_c',
      category_decision: 'category_c',
      category_rationale:
        'FIRR of 5% is below the 10% commercial threshold but EIRR of 16% exceeds the 15% economic viability benchmark. The project qualifies for PPP support mechanisms to bridge the viability gap and attract private participation.',
      ppp_support_mechanism: 'vgf',
      vgf_amount: 168_000_000,
      vgf_calculation_data: {
        method: 'capital_grant',
        vgf_pct_of_capex: 40,
        total_capex: 420_000_000,
        equity_contribution: 84_000_000,
        debt_contribution: 168_000_000,
        vgf_contribution: 168_000_000,
        target_equity_irr: 12,
        concession_period_years: 30,
      },
      vgf_status: 'calculated',
      nominated_at: ago(300),
      screened_at: ago(280),
    }),

    // ── 10. Kayah Eco-Tourism Resort ───────────────────────────────────
    intake({
      name: 'Kayah Eco-Tourism Resort',
      description:
        'Development of a 50-room eco-lodge and adventure tourism complex near Loikaw, Kayah State, featuring cultural heritage experiences, kayaking, and trekking, with community revenue-sharing model.',
      objectives:
        'Attract 20,000 international tourists per year, generate USD 3 M annual tourism revenue, create 200 permanent jobs, and fund community development through 10% revenue share.',
      target_beneficiaries:
        '5,000 residents in 12 villages around Loikaw who will benefit from tourism employment and community revenue sharing; 200 direct employees.',
      nominating_ministry: 'Ministry of Hotels and Tourism',
      implementing_agency: 'Directorate of Hotels and Tourism',
      sector: 'Tourism',
      sub_sector: 'Eco-Tourism',
      region: 'Kayah',
      estimated_cost: 8_000_000,
      origin: 'UNSOL',
      proponent_name: 'Kayah Heritage Tourism Group',
      proponent_company: 'Green Lotus Hospitality Ltd',
      proponent_contact: 'U Sai Kyaw Zin, Director — +95-83-221-456',
      project_stage: 'intake_rejected',
      rejection_reason:
        'The proposed site overlaps with a protected cultural heritage zone under the Ministry of Religious Affairs. Environmental screening indicates high biodiversity sensitivity. The proponent has not demonstrated adequate experience in eco-tourism development. Recommend resubmission after obtaining heritage clearance and partnering with an experienced operator.',
      rejected_at: ago(20),
      nominated_at: ago(45),
    }),
  ];
}

// ─── related records builders ───────────────────────────────────────────────

/** Intake desk + senior reviews for projects that passed intake (projects 4–9) */
function buildIntakeReviews(projectId: string, daysAgoDesk: number, daysAgoSenior: number) {
  const ago = (d: number) => new Date(Date.now() - d * 86400000).toISOString();
  return [
    {
      project_id: projectId,
      reviewer_id: null,
      review_tier: 'desk',
      decision: 'screened',
      comments: 'All intake fields complete. Sector alignment confirmed. Forwarding to senior review.',
      reviewed_at: ago(daysAgoDesk),
    },
    {
      project_id: projectId,
      reviewer_id: null,
      review_tier: 'senior',
      decision: 'approved',
      comments: 'Project meets all intake criteria. Approved for Preliminary Feasibility Study phase.',
      reviewed_at: ago(daysAgoSenior),
    },
  ];
}

/** FS-1 narrative for projects that passed FS-1 (projects 7–9) */
function buildFS1Narrative(projectId: string, projectName: string) {
  return {
    project_id: projectId,
    problem_statement:
      `${projectName} addresses a critical infrastructure gap that constrains economic growth and service delivery in the target region. Current facilities are inadequate, outdated, or non-existent, resulting in significant economic losses estimated at USD 50 M annually through inefficiency, lost productivity, and foregone investment. Without intervention, the gap will widen as population and economic activity continue to grow at 3–5% per annum. The project directly responds to government priority investment areas identified in the National Comprehensive Development Plan.`,
    target_beneficiaries:
      'Direct beneficiaries include an estimated 500,000 residents in the project influence area who will gain improved access to essential services and economic opportunities. Indirect beneficiaries extend to 2 million people in the broader region through multiplier effects on trade, employment, and service delivery. Special focus groups include women-headed households (28% of the area), youth seeking employment, and SMEs requiring improved infrastructure connectivity.',
    ndp_alignment_justification:
      'The project aligns with MSDP Goal 3 (Job Creation and Private Sector-Led Growth) and Strategy 3.4 (Improving transport, energy, and ICT connectivity). It also contributes to Goal 1 (Peace and Stability) by promoting economic opportunity in underserved areas, and Goal 5 (Natural Resources and Environment) through environmentally sound design. The project is listed in the National Sectoral Investment Plan 2025–2030 as a priority intervention.',
    expected_outcomes:
      'Primary outcomes: (1) 60% improvement in service access and quality metrics within 3 years of completion; (2) 15,000 direct jobs during construction and 5,000 permanent operational jobs; (3) 25% reduction in unit costs for end-users. Secondary outcomes: (4) increased private investment attracted to the corridor (target: USD 200 M in 5 years); (5) improved government revenue from user charges and economic activity (estimated USD 10 M/year); (6) demonstration effect for replication in other regions.',
    preliminary_cost_justification:
      'Cost estimates are based on a detailed quantity survey at preliminary design level, benchmarked against comparable projects in the region (Vietnam, Cambodia, Bangladesh) with Myanmar-specific adjustments for labour rates (+15%) and logistics costs (+20%) in target locations. A 15% physical contingency and 8% price contingency are included. Independent cost review by the World Bank project preparation facility confirmed estimates within ±10% tolerance. The cost-benefit ratio at preliminary stage is estimated at 1.8, indicating strong value for money. Lifecycle cost analysis over 30 years shows net present benefit of USD 120 M at a 10% discount rate.',
    submitted_by: null,
    version: 1,
  };
}

/** FS-1 desk + senior reviews for projects that passed FS-1 (projects 7–9) */
function buildFS1Reviews(projectId: string, narrativeId: string, daysAgoDesk: number, daysAgoSenior: number) {
  const ago = (d: number) => new Date(Date.now() - d * 86400000).toISOString();
  return [
    {
      project_id: projectId,
      narrative_id: narrativeId,
      reviewer_id: null,
      review_tier: 'desk',
      decision: 'screened',
      comments: 'FS-1 technical analysis is thorough. FIRR calculation verified against cost table. Environmental screening adequate. Forwarding to senior review panel.',
      reviewed_at: ago(daysAgoDesk),
    },
    {
      project_id: projectId,
      narrative_id: narrativeId,
      reviewer_id: null,
      review_tier: 'senior',
      decision: 'passed',
      comments: 'Senior panel approves passage to FS-2. The preliminary feasibility analysis demonstrates sufficient rigour. Recommend detailed study focus on risk allocation and financing structure.',
      reviewed_at: ago(daysAgoSenior),
    },
  ];
}

/** FS-2 assignment for projects at FS-2+ (projects 7–9) */
function buildFS2Assignment(projectId: string, consultantName: string, daysAgo: number) {
  const ago = (d: number) => new Date(Date.now() - d * 86400000).toISOString();
  return {
    project_id: projectId,
    assigned_to: consultantName,
    assigned_at: ago(daysAgo),
    deadline: new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0],
    status: 'assigned' as const,
    notes: `Detailed feasibility study assigned to ${consultantName}. Deliverables: full FS report, cost-benefit analysis, risk assessment, and financing recommendations within 90 days.`,
  };
}

/** FS-2 desk + senior reviews for projects past FS-2 (projects 8, 9) */
function buildFS2Reviews(projectId: string, daysAgoDesk: number, daysAgoSenior: number) {
  const ago = (d: number) => new Date(Date.now() - d * 86400000).toISOString();
  return [
    {
      project_id: projectId,
      reviewer_id: null,
      review_tier: 'desk',
      decision: 'screened',
      comments: 'Detailed feasibility study report is comprehensive. Financial model validated. Environmental and social impact assessments meet requirements. Ready for senior review.',
      reviewed_at: ago(daysAgoDesk),
    },
    {
      project_id: projectId,
      reviewer_id: null,
      review_tier: 'senior',
      decision: 'passed',
      comments: 'Senior review panel approves the detailed feasibility study. Category recommendation accepted. Project may proceed to categorisation and, if applicable, PPP structuring phase.',
      reviewed_at: ago(daysAgoSenior),
    },
  ];
}

// ─── main handler ───────────────────────────────────────────────────────────

export async function GET(request: Request) {
  const authError = verifyCronSecret(request);
  if (authError) return authError;

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const results: string[] = [];
  const projects = buildProjects();
  const insertedIds: string[] = [];

  // Insert all 10 projects
  for (let i = 0; i < projects.length; i++) {
    const project = projects[i];
    const { data, error } = await supabase
      .from('project_bank_projects')
      .insert(project)
      .select('id, name, project_stage')
      .single();

    if (error) {
      results.push(`❌ #${i + 1} ${(project as any).name}: ${error.message}`);
      insertedIds.push('');
      continue;
    }

    insertedIds.push(data.id);
    results.push(`✅ #${i + 1} ${data.name} → ${data.project_stage}`);
  }

  // ── Related records ─────────────────────────────────────────────────────
  // Projects 4–9 (indices 3–8) passed intake → insert intake_reviews
  const intakeReviewConfigs = [
    { idx: 3, deskDays: 44, seniorDays: 43 },   // Bago Water
    { idx: 4, deskDays: 74, seniorDays: 73 },   // Mandalay Industrial
    { idx: 5, deskDays: 64, seniorDays: 63 },   // Chin Health
    { idx: 6, deskDays: 158, seniorDays: 156 },  // Ayeyarwady Port
    { idx: 7, deskDays: 218, seniorDays: 216 },  // Shan Telecom
    { idx: 8, deskDays: 278, seniorDays: 276 },  // Rakhine Highway
  ];

  for (const cfg of intakeReviewConfigs) {
    const pid = insertedIds[cfg.idx];
    if (!pid) continue;
    const reviews = buildIntakeReviews(pid, cfg.deskDays, cfg.seniorDays);
    const { error } = await supabase.from('intake_reviews').insert(reviews);
    if (error) {
      results.push(`  ⚠️ intake_reviews for #${cfg.idx + 1}: ${error.message}`);
    } else {
      results.push(`  📋 intake_reviews for #${cfg.idx + 1}: 2 reviews inserted`);
    }
  }

  // Projects 7–9 (indices 6–8) passed FS-1 → insert fs1_narratives + fs1_reviews
  const fs1Configs = [
    { idx: 6, name: 'Ayeyarwady River Port Modernisation', deskDays: 140, seniorDays: 135 },
    { idx: 7, name: 'Shan State Telecom Backbone', deskDays: 200, seniorDays: 195 },
    { idx: 8, name: 'Rakhine Coastal Highway PPP', deskDays: 260, seniorDays: 255 },
  ];

  for (const cfg of fs1Configs) {
    const pid = insertedIds[cfg.idx];
    if (!pid) continue;

    // Insert narrative
    const narrative = buildFS1Narrative(pid, cfg.name);
    const { data: narr, error: narrErr } = await supabase
      .from('fs1_narratives')
      .insert(narrative)
      .select('id')
      .single();

    if (narrErr) {
      results.push(`  ⚠️ fs1_narrative for #${cfg.idx + 1}: ${narrErr.message}`);
      continue;
    }
    results.push(`  📝 fs1_narrative for #${cfg.idx + 1}: inserted`);

    // Insert FS-1 reviews
    const reviews = buildFS1Reviews(pid, narr.id, cfg.deskDays, cfg.seniorDays);
    const { error: revErr } = await supabase.from('fs1_reviews').insert(reviews);
    if (revErr) {
      results.push(`  ⚠️ fs1_reviews for #${cfg.idx + 1}: ${revErr.message}`);
    } else {
      results.push(`  📋 fs1_reviews for #${cfg.idx + 1}: 2 reviews inserted`);
    }
  }

  // Projects 7–9 (indices 6–8) → fs2_assignments
  const fs2AssignConfigs = [
    { idx: 6, consultant: 'KPMG Myanmar Advisory', daysAgo: 30 },
    { idx: 7, consultant: 'Deloitte Southeast Asia', daysAgo: 60 },
    { idx: 8, consultant: 'PwC Myanmar Infrastructure Advisory', daysAgo: 120 },
  ];

  for (const cfg of fs2AssignConfigs) {
    const pid = insertedIds[cfg.idx];
    if (!pid) continue;
    const assignment = buildFS2Assignment(pid, cfg.consultant, cfg.daysAgo);
    const { error } = await supabase.from('fs2_assignments').insert(assignment);
    if (error) {
      results.push(`  ⚠️ fs2_assignment for #${cfg.idx + 1}: ${error.message}`);
    } else {
      results.push(`  📋 fs2_assignment for #${cfg.idx + 1}: assigned to ${cfg.consultant}`);
    }
  }

  // Projects 8–9 (indices 7–8) passed FS-2 → fs2_reviews
  const fs2ReviewConfigs = [
    { idx: 7, deskDays: 45, seniorDays: 40 },
    { idx: 8, deskDays: 100, seniorDays: 95 },
  ];

  for (const cfg of fs2ReviewConfigs) {
    const pid = insertedIds[cfg.idx];
    if (!pid) continue;
    const reviews = buildFS2Reviews(pid, cfg.deskDays, cfg.seniorDays);
    const { error } = await supabase.from('fs2_reviews').insert(reviews);
    if (error) {
      results.push(`  ⚠️ fs2_reviews for #${cfg.idx + 1}: ${error.message}`);
    } else {
      results.push(`  📋 fs2_reviews for #${cfg.idx + 1}: 2 reviews inserted`);
    }
  }

  return NextResponse.json({
    message: `Seeded ${insertedIds.filter(Boolean).length} / ${projects.length} projects`,
    results,
  });
}
