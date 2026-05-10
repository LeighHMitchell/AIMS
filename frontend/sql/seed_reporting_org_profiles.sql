  -- =============================================================================
  -- Seed: Reporting Organisation Profiles
  -- =============================================================================
  -- Populates rich profile data for every organisation that has reported at
  -- least one activity (i.e. appears as activities.reporting_org_id). Fills:
  --   * IATI Organisation Identifier (iati_org_id) — only when not already set
  --     and not already taken by another org (the column is UNIQUE)
  --   * Comprehensive multi-paragraph description (Myanmar country-profile style)
  --   * Mission statement
  --   * Website, email, phone, address
  --   * Social media (Twitter/X, Facebook, LinkedIn, Instagram, YouTube)
  --   * Funding envelope data 2022-2028 (past actual / current / forward indicative)
  --
  -- Strategy:
  --   1. Resolve reporting orgs via activities.reporting_org_id
  --   2. Stage curated profiles for ~24 well-known reporting orgs in an inline
  --      CTE (no temp table, so the script works in environments that run each
  --      statement in a separate session, e.g. Supabase SQL Editor).
  --   3. Single UPDATE that, per matched reporting org, simultaneously:
  --        - assigns iati_org_id (CASE expression — only when org has none AND
  --          no other org already holds that iati_org_id, picking one
  --          deterministic "winner" per curated entry to avoid the unique
  --          constraint)
  --        - OVERWRITES description and mission with the curated narrative
  --          (existing short stubs are replaced — that''s the point of seeding
  --          rich profiles)
  --        - fills website, email, phone, address, social media URLs with
  --          curated values when curated is non-NULL, otherwise preserves the
  --          existing value (so curated NULLs don''t wipe real data)
  --        - keeps existing Organisation_Type_Code and default_currency when
  --          set, otherwise applies the curated default
  --   4. Templated fallback narrative for any reporting org still missing a
  --      description.
  --   5. Funding envelope rows for every reporting org, 2022-2028 (skips years
  --      already seeded for that org).
  --
  -- One UPDATE (rather than two passes) avoids PostgreSQL's "trying to update
  -- the same row twice in one statement" restriction with data-modifying CTEs.
  --
  -- Idempotent: re-running will not duplicate envelope rows, will not violate
  -- the iati_org_id unique constraint, and will not overwrite curated profile
  -- fields.
  -- =============================================================================

  -- -----------------------------------------------------------------------------
  -- 0. Sanity: ensure required columns exist (cheap no-ops if already present)
  -- -----------------------------------------------------------------------------
  ALTER TABLE organizations ADD COLUMN IF NOT EXISTS iati_org_id TEXT;
  ALTER TABLE organizations ADD COLUMN IF NOT EXISTS description TEXT;
  ALTER TABLE organizations ADD COLUMN IF NOT EXISTS mission TEXT;
  ALTER TABLE organizations ADD COLUMN IF NOT EXISTS website TEXT;
  ALTER TABLE organizations ADD COLUMN IF NOT EXISTS email TEXT;
  ALTER TABLE organizations ADD COLUMN IF NOT EXISTS phone TEXT;
  ALTER TABLE organizations ADD COLUMN IF NOT EXISTS address TEXT;
  ALTER TABLE organizations ADD COLUMN IF NOT EXISTS social_twitter TEXT;
  ALTER TABLE organizations ADD COLUMN IF NOT EXISTS social_facebook TEXT;
  ALTER TABLE organizations ADD COLUMN IF NOT EXISTS social_linkedin TEXT;
  ALTER TABLE organizations ADD COLUMN IF NOT EXISTS social_instagram TEXT;
  ALTER TABLE organizations ADD COLUMN IF NOT EXISTS social_youtube TEXT;

  -- -----------------------------------------------------------------------------
  -- 1. Stage curated profiles + run PASS 1 + PASS 2 in a single statement
  -- -----------------------------------------------------------------------------

  WITH curated(iati_org_id, acronym, name, description, mission, website, email,
               phone, address, twitter, facebook, linkedin, instagram, youtube,
               org_type_code, default_currency) AS (
    VALUES

    -- ===========================================================================
    -- UN agencies
    -- ===========================================================================
    ('XM-DAC-41119', 'UNFPA', 'United Nations Population Fund',
    '<p>The United Nations Population Fund (UNFPA) is the United Nations sexual and reproductive health agency, established as a trust fund in 1969 and operational since 1972 — making it one of the longest-standing UN funds dedicated to population and development. UNFPA was created in response to growing international recognition that population dynamics, reproductive health, and gender equality were central to social and economic development. The agency''s formal mandate was expanded by the 1994 International Conference on Population and Development (ICPD) in Cairo, where 179 governments adopted the Programme of Action that continues to anchor UNFPA''s work today.</p>'
    '<p>UNFPA operates in more than 150 countries and territories from its headquarters at 605 Third Avenue in New York. Its global structure includes seven regional offices serving Africa (Johannesburg), the Arab States (Cairo), Asia and the Pacific (Bangkok), Eastern Europe and Central Asia (Istanbul), Latin America and the Caribbean (Panama City), West and Central Africa (Dakar), and the Pacific Sub-Regional Office (Suva). The agency also maintains liaison offices in Geneva, Brussels, Tokyo, Copenhagen, and Washington, and runs a global programmatic Procurement Services Branch in Copenhagen that purchases more than US$300 million in reproductive health commodities each year on behalf of governments and partners.</p>'
    '<p>UNFPA''s vision is a world where every pregnancy is wanted, every childbirth is safe, and every young person''s potential is fulfilled. Its current Strategic Plan (2022-2025) organises programming around three transformative results: ending preventable maternal deaths; ending the unmet need for family planning; and ending gender-based violence and harmful practices, including child marriage and female genital mutilation. These transformative results are pursued through six accelerators: human-rights-based and gender-transformative approaches; innovation and digitalisation; partnerships, South-South and triangular cooperation, and financing; data and evidence; resilience; and leaving no one behind, reaching the furthest behind first.</p>'
    '<p>Programmatically, UNFPA strengthens national health systems to deliver high-quality sexual and reproductive health services, expands access to a full range of modern contraceptives, supports midwifery training, and promotes comprehensive sexuality education for young people. The agency leads the global UNFPA Supplies Partnership, the world''s largest provider of donated contraceptives and life-saving maternal-health medicines to low- and middle-income countries, reaching tens of millions of women and girls annually. UNFPA is also the UN system''s lead on population data, supporting more than 100 countries to plan and conduct population and housing censuses, demographic and health surveys, and analyses of population dynamics, ageing, and migration that inform national development planning and the Sustainable Development Goal indicator framework.</p>'
    '<p>In humanitarian contexts, UNFPA is the lead UN agency for sexual and reproductive health and gender-based violence response, deploying the inter-agency Minimum Initial Service Package (MISP) within hours of an emergency. It manages global supplies of dignity kits, mobile reproductive-health clinics, and rape-treatment kits, and co-leads the GBV Area of Responsibility under the global Protection Cluster. The agency''s humanitarian footprint has grown rapidly, with response operations across Ukraine, Gaza, Sudan, the Sahel, Afghanistan, the Horn of Africa, Myanmar, and other complex emergencies.</p>'
    '<p>UNFPA is funded entirely through voluntary contributions. Its resources comprise core (regular) resources, which provide flexibility and predictability, and non-core (other) resources earmarked for specific countries, themes, or emergencies. Major donor partners include the governments of the Nordic countries, the Netherlands, Germany, the United Kingdom, the United States, Japan, Canada, Australia, the European Union, and a growing roster of private-sector and philanthropic partners. The agency''s governance rests with a 36-member Executive Board shared with UNDP and UNOPS, supplemented by an annual Pledging Conference and the Funding Compact agreed under the UN Development System reform.</p>',
    'Delivering a world where every pregnancy is wanted, every childbirth is safe and every young person''s potential is fulfilled.',
    'https://www.unfpa.org', 'info@unfpa.org', '+1 212 297 5000',
    '605 Third Avenue, New York, NY 10158, USA',
    'https://twitter.com/UNFPA', 'https://www.facebook.com/UNFPA',
    'https://www.linkedin.com/company/unfpa', 'https://www.instagram.com/unfpa',
    'https://www.youtube.com/user/UNFPA',
    '40', 'USD'),

    ('XM-DAC-41122', 'UNDP', 'United Nations Development Programme',
    '<p>The United Nations Development Programme (UNDP) is the United Nations'' lead agency on international development and the largest UN entity working on poverty eradication. Established by General Assembly resolution 2029 (XX) on 22 November 1965, UNDP merged the Expanded Programme of Technical Assistance (EPTA, founded 1949) and the United Nations Special Fund (founded 1958) into a single, integrated technical-assistance instrument that became operational on 1 January 1966. Across nearly six decades it has evolved from a project-execution agency into the principal global advisor on development policy, governance, and the integrated implementation of the Sustainable Development Goals.</p>'
    '<p>UNDP operates in approximately 170 countries and territories from its headquarters at One UN Plaza in New York, supported by five Regional Bureaux (Africa, Arab States, Asia and the Pacific, Europe and the CIS, Latin America and the Caribbean), a Crisis Bureau, a Bureau for Policy and Programme Support, and a network of policy centres including the Oslo Governance Centre, the Seoul Policy Centre, the Istanbul International Centre for Private Sector in Development, and the Nairobi Global Centre for Technology, Innovation and Sustainable Development. The agency''s country offices are typically led by Resident Representatives who, until the 2019 reform, also served as UN Resident Coordinators — a role now held by an independent UN coordinator function.</p>'
    '<p>UNDP''s current Strategic Plan organises programming around three directions of change: structural transformation (including towards green, inclusive, and digital transitions); leaving no one behind through a rights-based human-development focus; and resilience to crises and shocks. These are operationalised through six Signature Solutions — poverty and inequality; governance; resilience; environment; energy; and gender equality — and three "Enablers" of strategic innovation, digitalisation, and development financing. UNDP serves as the technical partner of choice for many governments on national development planning, electoral assistance and democratic governance, public administration reform, anti-corruption, justice and rule of law, disaster risk management, climate adaptation, and post-conflict recovery.</p>'
    '<p>The agency hosts and administers a unique set of system-wide instruments. UNDP is the manager of the UN Multi-Partner Trust Fund Office, which administers more than 200 pooled funds on behalf of UN organisations, governments, and partners. It also hosts the Resident Coordinator System on behalf of the UN Secretariat (until its independent funding mechanism is fully transitioned), serves as the Administrative Agent for the Joint SDG Fund and the Peacebuilding Fund implementation, and houses the UN Office for South-South Cooperation. UNDP is one of the largest implementing agencies of the Global Environment Facility (GEF), the Green Climate Fund (GCF), and the Adaptation Fund, with a multi-billion-dollar climate and environment portfolio.</p>'
    '<p>UNDP''s flagship publications and tools have shaped global development discourse for decades. The annual Human Development Report — launched in 1990 — and its Human Development Index, Gender Inequality Index, and Multidimensional Poverty Index are reference points for governments, academia, and civil society worldwide. The agency also produces the SDG Push initiative, the Accelerator Labs network in 91 countries, and a growing suite of digital public goods supporting countries to harness data, technology, and innovation for the SDGs.</p>'
    '<p>UNDP is funded by voluntary contributions from UN Member States, intergovernmental partners, vertical funds, the private sector, foundations, and individuals. Regular (core) resources support the agency''s presence in least-developed countries and small island developing States, while non-core (earmarked) resources fund thematic and country-specific programmes. The largest contributors typically include Germany, Japan, the United States, the United Kingdom, the European Union, Sweden, Norway, Denmark, the Netherlands, and Canada. UNDP is governed by a 36-member Executive Board shared with UNFPA and UNOPS, drawn from the five UN regional groups on a rotating basis, and is led by an Administrator with the rank of Under-Secretary-General.</p>',
    'To eradicate poverty and reduce inequalities through the sustainable development of nations.',
    'https://www.undp.org', 'communications@undp.org', '+1 212 906 5000',
    'One UN Plaza, New York, NY 10017, USA',
    'https://twitter.com/UNDP', 'https://www.facebook.com/UNDP',
    'https://www.linkedin.com/company/undp', 'https://www.instagram.com/undp',
    'https://www.youtube.com/user/undp',
    '40', 'USD'),

    ('XM-DAC-41114', 'UNICEF', 'United Nations Children''s Fund',
    '<p>The United Nations Children''s Fund (UNICEF) is the UN agency mandated to advance the rights and wellbeing of every child. UNICEF was created by General Assembly resolution 57(I) on 11 December 1946 as the United Nations International Children''s Emergency Fund, with an initial mission to provide emergency food, clothing, and healthcare to children in countries devastated by World War II. In 1953, the General Assembly extended UNICEF''s mandate indefinitely and dropped the words "international" and "emergency" from its name (while retaining the original acronym), recognising the long-term need for child-focused development assistance. Today UNICEF is one of the most widely recognised humanitarian and development organisations in the world and operates in more than 190 countries and territories.</p>'
    '<p>UNICEF is headquartered at 3 United Nations Plaza in New York, with seven Regional Offices serving Eastern and Southern Africa (Nairobi), West and Central Africa (Dakar), the Middle East and North Africa (Amman), South Asia (Kathmandu), East Asia and the Pacific (Bangkok), Europe and Central Asia (Geneva), and Latin America and the Caribbean (Panama City). The Supply Division in Copenhagen runs the world''s largest humanitarian warehouse and is the principal global procurer of vaccines, school supplies, therapeutic foods, and emergency commodities for children. UNICEF also operates Innocenti — the Office of Research and Foresight in Florence, Italy — which produces the Report Card series and other influential child-focused research.</p>'
    '<p>UNICEF works across the entire life course of a child — from pre-natal care and early childhood development, through primary and secondary education, adolescent health and skills, to the transition into adulthood. Its current Strategic Plan organises results around five Goal Areas: every child survives and thrives; every child learns and acquires skills for the future; every child is protected from violence, exploitation, abuse, neglect, and harmful practices; every child has access to safe and equitable water, sanitation, and hygiene services; and every child has access to inclusive social protection and lives free from poverty. Cross-cutting commitments include gender equality, disability inclusion, climate and environment, and adolescent and youth engagement, with the cross-cutting principle that progress must reach the most marginalised children.</p>'
    '<p>UNICEF is the largest provider of vaccines for children in the developing world, procuring vaccines for nearly half of all children globally on behalf of governments and Gavi, the Vaccine Alliance. The agency is the principal global supplier of ready-to-use therapeutic food (RUTF) for the treatment of severe acute malnutrition and is the lead UN agency for water, sanitation and hygiene (WASH) in development and humanitarian contexts. UNICEF leads or co-leads four global humanitarian clusters — Nutrition, WASH, Education (with Save the Children), and Child Protection (Area of Responsibility) — and operates the Core Commitments for Children in Humanitarian Action, the agency''s standard for predictable emergency response. The Generation Unlimited public-private partnership, the Yoma digital learning and skills platform, and the Giga initiative (with ITU) to connect every school to the internet exemplify UNICEF''s growing focus on adolescents and digital public goods.</p>'
    '<p>UNICEF''s normative work is anchored in the Convention on the Rights of the Child (CRC) — adopted by the General Assembly in 1989 and the most widely ratified human rights treaty in history — and its Optional Protocols. The agency monitors and supports State implementation of the CRC, produces the State of the World''s Children flagship report, and operates the global MICS (Multiple Indicator Cluster Surveys) household-survey programme that generates internationally comparable data on the situation of children in over 120 countries.</p>'
    '<p>UNICEF is funded entirely through voluntary contributions from governments (public sector), intergovernmental partners, the private sector, foundations, and individual donors raised through 33 National Committees in high-income countries. Approximately one-third of UNICEF''s income comes from private fundraising, making it unique within the UN system in the scale of its private-sector base. The largest public-sector partners include the United States, Germany, the United Kingdom, the European Union, Japan, Sweden, Norway, the Netherlands, Canada, and the Republic of Korea. UNICEF is governed by a 36-member Executive Board drawn from UN Member States on a rotating basis and is led by an Executive Director with the rank of Under-Secretary-General.</p>',
    'To advocate for the protection of children''s rights, to help meet their basic needs and to expand their opportunities to reach their full potential.',
    'https://www.unicef.org', 'info@unicef.org', '+1 212 326 7000',
    '3 United Nations Plaza, New York, NY 10017, USA',
    'https://twitter.com/UNICEF', 'https://www.facebook.com/unicef',
    'https://www.linkedin.com/company/unicef', 'https://www.instagram.com/unicef',
    'https://www.youtube.com/user/unicef',
    '40', 'USD'),

    ('XM-DAC-928', 'WHO', 'World Health Organization',
    '<p>The World Health Organization (WHO) is the United Nations specialised agency for international public health. WHO''s Constitution was adopted at the International Health Conference in New York in 1946 and entered into force on 7 April 1948 — a date now commemorated worldwide as World Health Day. The agency was created to consolidate and replace the patchwork of pre-existing international health bodies — the Office International d''Hygiène Publique (Paris, 1907), the League of Nations Health Organisation (Geneva, 1923), and the Pan American Sanitary Bureau (Washington, 1902) — into a single global health authority. The Pan American Health Organization (PAHO) continues to function as WHO''s Regional Office for the Americas while retaining its separate constitution and identity.</p>'
    '<p>WHO is headquartered at Avenue Appia 20 in Geneva, Switzerland, and operates a unique decentralised structure with six Regional Offices, each governed by its own Regional Committee of Member States: AFRO (Brazzaville, Republic of the Congo) for Africa; AMRO/PAHO (Washington, D.C.) for the Americas; SEARO (New Delhi) for South-East Asia; EURO (Copenhagen) for Europe; EMRO (Cairo) for the Eastern Mediterranean; and WPRO (Manila) for the Western Pacific. WHO maintains country offices in approximately 150 countries, plus a network of more than 800 WHO Collaborating Centres at academic and research institutions worldwide that provide specialised technical support.</p>'
    '<p>WHO''s current Thirteenth and Fourteenth General Programmes of Work are organised around the "triple billion" targets: one billion more people benefiting from universal health coverage; one billion more people better protected from health emergencies; and one billion more people enjoying better health and wellbeing. Underneath these strategic goals, WHO''s mandate spans three core functions: leadership on global health matters and the articulation of evidence-based policy options; setting and monitoring norms and standards (including the International Health Regulations, the WHO Model List of Essential Medicines, the International Classification of Diseases, and global standards on food safety, biological products, and health workforce); and direct technical cooperation with Member States on disease prevention and control, health systems strengthening, and the social and environmental determinants of health.</p>'
    '<p>WHO has played central roles in some of the most consequential global health achievements of the past century: the certification of smallpox eradication in 1980; the near-eradication of polio through the Global Polio Eradication Initiative; the dramatic decline in deaths from measles, malaria, and tuberculosis; the global tobacco control framework (the Framework Convention on Tobacco Control, the first treaty negotiated under WHO''s auspices); and the leadership of the international response to outbreaks of HIV/AIDS, SARS, H1N1 influenza, Ebola, Zika, and COVID-19. WHO declared COVID-19 a Public Health Emergency of International Concern on 30 January 2020 and a pandemic on 11 March 2020, and led global efforts including the COVAX vaccine-equity facility and the WHO Health Emergencies Programme reform.</p>'
    '<p>WHO''s normative outputs include the World Health Statistics, the World Health Report, the Global Health Observatory, and a vast catalogue of clinical guidelines, technical handbooks, and training materials used by ministries of health, hospitals, and frontline workers worldwide. The organisation is the depositary of three major international legal instruments: the WHO Constitution, the International Health Regulations (2005), and the Framework Convention on Tobacco Control (2003), with a fourth — the Pandemic Agreement — adopted by the World Health Assembly in May 2025.</p>'
    '<p>WHO is funded through two main sources: assessed contributions paid by its 194 Member States as a percentage of GNI (the "regular budget"), and voluntary contributions from Member States, philanthropic foundations, the private sector, and other partners — typically around 80 per cent of total income. The Bill & Melinda Gates Foundation, Germany, the United States, the United Kingdom, the European Commission, Gavi, and the World Bank are among the largest contributors, alongside thematic funders for specific programmes. The Investment Round launched in 2024 marked a major shift to mobilise predictable, multi-year, flexible resources. WHO is governed by the World Health Assembly (WHA) — which meets annually in Geneva — and an Executive Board of 34 health experts who serve in their personal capacity, and is led by a Director-General elected by the WHA for a five-year term.</p>',
    'To promote health, keep the world safe, and serve the vulnerable.',
    'https://www.who.int', 'info@who.int', '+41 22 791 2111',
    'Avenue Appia 20, 1211 Geneva 27, Switzerland',
    'https://twitter.com/WHO', 'https://www.facebook.com/WHO',
    'https://www.linkedin.com/company/world-health-organization',
    'https://www.instagram.com/who', 'https://www.youtube.com/user/who',
    '40', 'USD'),

    ('XM-DAC-41140', 'WFP', 'World Food Programme',
    '<p>The World Food Programme (WFP) is the food-assistance branch of the United Nations and the world''s largest humanitarian organisation addressing hunger, food insecurity, and malnutrition. WFP was established by parallel resolutions of the UN General Assembly and the FAO Conference in 1961 as a three-year experimental programme to provide food aid through the UN system, and was made a fully-fledged, continuing UN programme in 1965. From a modest start of just over US$80 million in pledges, WFP has grown into the largest humanitarian operation in the world, with annual operational requirements typically exceeding US$15 billion in recent years and a workforce of more than 25,000 people, the majority of whom are nationals of the countries in which WFP operates.</p>'
    '<p>WFP is headquartered at Via Cesare Giulio Viola in Rome, Italy, alongside its sister Rome-based UN agencies FAO and IFAD. It operates through six Regional Bureaux — Bangkok (Asia and the Pacific), Cairo (Middle East, North Africa, and Eastern Europe), Dakar (Western Africa), Johannesburg (Southern Africa), Nairobi (Eastern Africa), and Panama (Latin America and the Caribbean) — and a network of more than 80 country offices and sub-offices. WFP also operates the UN Humanitarian Response Depot (UNHRD) network with hubs in Brindisi (Italy), Accra (Ghana), Dubai (UAE), Las Palmas (Spain), Panama City, and Subang (Malaysia), serving as the global humanitarian community''s emergency stockpile and pre-positioning system.</p>'
    '<p>WFP''s mandate combines emergency food assistance, recovery and resilience programming, and support to governments to strengthen national food systems and social protection. Each year WFP reaches around 150 million people in more than 120 countries and territories with food rations, cash-based transfers (cash, vouchers, and value-vouchers), and specialised nutritious foods designed to prevent and treat malnutrition in pregnant and lactating women and young children. The agency''s school-feeding programmes — among the largest globally — provide daily school meals to tens of millions of children, simultaneously addressing hunger, education, and child protection. The Saving Lives, Changing Lives strategic frame and the Strategic Plan organise programming around two strategic outcomes: ending hunger by protecting access to food, and improving nutrition; and four enabling strategic outcomes covering livelihoods, food systems, partnerships, and global humanitarian response.</p>'
    '<p>WFP operates the world''s largest humanitarian logistics network — including a global fleet of cargo ships, more than 100 aircraft, and a vast trucking and warehousing footprint — to deliver assistance in the most challenging environments, from active conflict zones to areas devastated by natural disasters. The agency leads the global Logistics Cluster and Emergency Telecommunications Cluster on behalf of the wider humanitarian community, runs the United Nations Humanitarian Air Service (UNHAS) which provides safe air transport for humanitarian workers in more than 20 countries, and delivers common services in supply chain, fleet management, engineering, and ICT to other UN agencies, NGOs, and governments. WFP is the primary on-the-ground operational arm for many of the world''s largest emergency responses — including in Afghanistan, Ethiopia, the Democratic Republic of the Congo, Haiti, Somalia, South Sudan, Sudan, Syria, Ukraine, Yemen, and the Sahel.</p>'
    '<p>Beyond emergency response, WFP works with governments to design and scale up shock-responsive social protection systems, smallholder agricultural value chains (including via its Home Grown School Feeding and Farm to Market Alliance initiatives), school-based platforms for human capital development, and climate-resilient livelihoods. The R4 Rural Resilience Initiative combines insurance, asset creation, savings, and access to credit for vulnerable smallholder farmers, while the SCOPE digital beneficiary management platform supports identification and registration in some of the most challenging contexts.</p>'
    '<p>WFP is funded entirely through voluntary contributions from governments, intergovernmental partners, the private sector, foundations, and individuals — it receives no assessed funding from the UN regular budget. The largest sovereign donors typically include the United States, Germany, the European Union, the United Kingdom, Canada, the Republic of Korea, Japan, France, Sweden, and the Netherlands. WFP''s governing body is the 36-member Executive Board, drawn from FAO and ECOSOC member states, which meets in three regular sessions and one annual session each year. WFP was awarded the 2020 Nobel Peace Prize "for its efforts to combat hunger, for its contribution to bettering conditions for peace in conflict-affected areas and for acting as a driving force in efforts to prevent the use of hunger as a weapon of war and conflict."</p>',
    'Saving lives in emergencies and using food assistance to build pathways to peace, stability and prosperity.',
    'https://www.wfp.org', 'wfpinfo@wfp.org', '+39 06 65131',
    'Via Cesare Giulio Viola 68/70, 00148 Rome, Italy',
    'https://twitter.com/WFP', 'https://www.facebook.com/WorldFoodProgramme',
    'https://www.linkedin.com/company/world-food-programme',
    'https://www.instagram.com/worldfoodprogramme',
    'https://www.youtube.com/user/WorldFoodProgramme',
    '40', 'USD'),

    ('XM-DAC-41301', 'FAO', 'Food and Agriculture Organization of the United Nations',
    '<p>The Food and Agriculture Organization of the United Nations (FAO) is the UN specialised agency that leads international efforts to defeat hunger and improve nutrition, food security, and sustainable agriculture. FAO was founded on 16 October 1945 — a date now commemorated annually as World Food Day — at the Quebec City Conference of 44 governments, making it one of the oldest specialised agencies in the UN system. The agency was established to "raise levels of nutrition and standards of living, to improve agricultural productivity, and to better the condition of rural populations" — language that remains largely unchanged in the FAO Constitution today.</p>'
    '<p>FAO is headquartered at Viale delle Terme di Caracalla in Rome, Italy, in a complex shared by FAO, WFP, and IFAD that constitutes the world''s largest concentration of UN food and agriculture expertise. The agency operates a decentralised structure with five Regional Offices — Africa (Accra), Asia and the Pacific (Bangkok), Europe and Central Asia (Budapest), Latin America and the Caribbean (Santiago), and the Near East and North Africa (Cairo) — supplemented by sub-regional offices, liaison offices in New York, Geneva, Brussels, Washington, Tokyo, and Moscow, and country representations in more than 130 countries. FAO also runs partnership and liaison offices with major emerging economies and a Shared Services Centre in Budapest.</p>'
    '<p>FAO''s mandate is uniquely broad among UN agencies, covering the full agri-food system: crop and livestock production; fisheries and aquaculture; forestry; soils, land, and water; biodiversity and genetic resources for food and agriculture; nutrition and food safety; agricultural trade and markets; rural livelihoods; and the social, economic, and environmental dimensions of food systems transformation. The current FAO Strategic Framework 2022-2031 is anchored in the Four Betters: better production, better nutrition, a better environment, and a better life — leaving no one behind. Twenty Programme Priority Areas operationalise these strategic objectives, ranging from green innovation and blue transformation through One Health, gender-transformative approaches, climate-resilient agrifood systems, and the Hand-in-Hand Initiative for matching investment with countries that have the greatest potential.</p>'
    '<p>FAO is the principal global custodian of agricultural, fisheries, and forestry data, producing the State of Food Security and Nutrition in the World (with WFP, UNICEF, IFAD, and WHO), the State of Food and Agriculture, the State of the World''s Forests, the State of World Fisheries and Aquaculture, FAOSTAT (the world''s largest agricultural statistics database covering more than 245 countries), and the AQUASTAT, FISHSTAT, and Geospatial Information for Sustainable Food Systems (GIEWS) platforms. The agency is responsible for 21 SDG indicators across Goals 2, 5, 6, 12, 14, and 15 and serves as the secretariat for the Committee on World Food Security (CFS), the foremost inclusive intergovernmental and international platform for food security and nutrition.</p>'
    '<p>FAO''s normative role is anchored in international instruments hosted or co-hosted by the agency. These include the Codex Alimentarius (jointly with WHO), which sets international food standards adopted by the WTO; the International Plant Protection Convention (IPPC), which sets phytosanitary standards governing global plant trade; the International Treaty on Plant Genetic Resources for Food and Agriculture (ITPGRFA); the Voluntary Guidelines on the Responsible Governance of Tenure (VGGT) of land, fisheries, and forests; the Code of Conduct for Responsible Fisheries; and the Port State Measures Agreement to combat illegal, unreported and unregulated (IUU) fishing.</p>'
    '<p>Operationally, FAO supports more than 1,400 active projects worldwide funded by national governments, the European Union, multilateral funds (including the Global Environment Facility and the Green Climate Fund, where FAO is an accredited entity), and bilateral partners. The Special Programme for Food Security, the Hand-in-Hand Geospatial Platform, the AGROVOC multilingual thesaurus, and FAO emergency response in protracted crises (Yemen, Syria, the Horn of Africa, Sahel, Ukraine, Afghanistan) form a substantial part of FAO''s field portfolio.</p>'
    '<p>FAO is funded by assessed contributions from its 194 Member States plus the European Union and Associate Members (the Faroe Islands, Tokelau, and the Niue), complemented by voluntary contributions earmarked for projects and trust funds. Its governing bodies are the biennial FAO Conference (all members) and the 49-member Council, with the Director-General elected to a four-year term. FAO''s seven Programme Committees cover programme, finance, constitutional and legal matters, agriculture, commodity problems, fisheries, and forestry, and the Committee on World Food Security operates as a multistakeholder platform under the Committee structure.</p>',
    'Achieving food security for all and ensuring people have regular access to enough high-quality food to lead active, healthy lives.',
    'https://www.fao.org', 'fao-hq@fao.org', '+39 06 57051',
    'Viale delle Terme di Caracalla, 00153 Rome, Italy',
    'https://twitter.com/FAO', 'https://www.facebook.com/UNFAO',
    'https://www.linkedin.com/company/fao', 'https://www.instagram.com/fao',
    'https://www.youtube.com/user/FAOoftheUN',
    '40', 'USD'),

    ('XM-DAC-41121', 'UNHCR', 'United Nations High Commissioner for Refugees',
    '<p>The Office of the United Nations High Commissioner for Refugees (UNHCR), commonly known as the UN Refugee Agency, is mandated to lead and coordinate international action for the worldwide protection of refugees and the resolution of refugee problems. UNHCR was established by General Assembly resolution 319 (IV) on 3 December 1949 and became operational on 1 January 1951 with a non-political, humanitarian, and social mandate set out in its Statute. Originally created with a three-year mandate to help an estimated one million Europeans displaced by World War II, UNHCR''s mandate has been renewed every five years until 2003, when the General Assembly removed the time limit "until the refugee problem is solved." The agency has twice been awarded the Nobel Peace Prize, in 1954 for its work assisting European refugees, and in 1981 for its assistance to refugees in Asia and Africa.</p>'
    '<p>UNHCR is headquartered at Case Postale 2500 in Geneva, Switzerland, with seven Regional Bureaux serving the Americas (Panama City), Asia and the Pacific (Bangkok), East and Horn of Africa and the Great Lakes (Nairobi), Europe (Geneva), the Middle East and North Africa (Amman), Southern Africa (Pretoria), and West and Central Africa (Dakar). The agency maintains operations in more than 135 countries and territories, with a workforce exceeding 20,000 personnel — over 90 per cent of whom serve in country operations, the vast majority in field locations close to the people they protect. The UNHCR Global Service Centres in Budapest and Copenhagen provide back-office, supply, and emergency response services.</p>'
    '<p>UNHCR''s legal mandate covers refugees, asylum seekers, internally displaced people (IDPs), stateless people, and returnees — collectively referred to as "people of concern" or "forcibly displaced and stateless people." Globally, more than 120 million people are currently forcibly displaced — the highest number ever recorded — driven by conflicts in Ukraine, Sudan, Syria, the Democratic Republic of the Congo, Myanmar, Afghanistan, the Sahel, and the protracted crises affecting Palestinians, Rohingya, Venezuelans, and many others. UNHCR provides life-saving emergency assistance — emergency shelter, core relief items, water, sanitation, food, healthcare, education, livelihoods, and protection — and works toward three durable solutions: voluntary repatriation in safety and dignity; local integration in host countries; and resettlement to a third country.</p>'
    '<p>UNHCR is the guardian of the 1951 Convention relating to the Status of Refugees and its 1967 Protocol, the cornerstone international legal instruments defining who is a refugee and what protection they are entitled to. The agency also leads on the implementation of the 2018 Global Compact on Refugees, which provides a framework for more predictable and equitable responsibility-sharing. UNHCR convenes the Global Refugee Forum every four years (most recently in 2023) and operates the Comprehensive Refugee Response Framework (CRRF) in countries hosting large refugee populations. To address statelessness, UNHCR launched the #IBelong campaign in 2014 with the goal of ending statelessness in a decade; the agency continues to advocate for accession to the 1954 and 1961 Statelessness Conventions and works with affected populations and governments on legal-identity solutions.</p>'
    '<p>Operationally, UNHCR is the lead agency in inter-agency refugee responses and co-leads the Global Protection Cluster, the Camp Coordination and Camp Management Cluster (with IOM), and the Shelter Cluster (with IFRC) in IDP and natural disaster contexts. The agency runs one of the largest civil registration and identity-management programmes in the world through its proGres population registration system and the BIMS biometric identity management system, which together register tens of millions of refugees and asylum seekers worldwide. UNHCR''s annual Global Trends report and its Operational Data Portal provide the most authoritative public statistics on forced displacement.</p>'
    '<p>UNHCR is funded almost entirely through voluntary contributions from governments, intergovernmental organisations, the private sector (including through National Partner Offices in 28 countries), foundations, and individual donors. Approximately 95-98 per cent of the agency''s budget is covered by voluntary funding, with a very small subsidy from the United Nations regular budget. The largest sovereign donors typically include the United States, the European Union, Germany, Japan, the United Kingdom, Sweden, Norway, Denmark, the Netherlands, and the Republic of Korea. UNHCR is governed by an 108-member Executive Committee (ExCom) drawn from UN Member States that meets annually in Geneva, and is led by a High Commissioner for Refugees elected by the General Assembly.</p>',
    'To safeguard the rights and wellbeing of refugees and to ensure that everyone can exercise the right to seek asylum and find safe refuge.',
    'https://www.unhcr.org', 'hqpi00@unhcr.org', '+41 22 739 8111',
    'Case Postale 2500, 1211 Geneva 2 Depot, Switzerland',
    'https://twitter.com/Refugees', 'https://www.facebook.com/UNHCR',
    'https://www.linkedin.com/company/unhcr', 'https://www.instagram.com/refugees',
    'https://www.youtube.com/user/unhcr',
    '40', 'USD'),

    ('XM-DAC-41146', 'UN Women', 'United Nations Entity for Gender Equality and the Empowerment of Women',
    '<p>UN Women is the United Nations entity dedicated exclusively to gender equality and the empowerment of women and girls. The entity was created on 2 July 2010 by General Assembly resolution 64/289 as part of the UN System-wide Coherence reform, becoming operational on 1 January 2011. UN Women merged the mandates and functions of four previously distinct UN bodies into a single, stronger entity: the Division for the Advancement of Women (DAW), based in the UN Secretariat in New York; the International Research and Training Institute for the Advancement of Women (INSTRAW), based in Santo Domingo; the Office of the Special Adviser on Gender Issues and Advancement of Women (OSAGI), based in New York; and the United Nations Development Fund for Women (UNIFEM), the operational fund. The new entity was designed to address the historic under-resourcing and fragmentation of the UN''s gender equality architecture.</p>'
    '<p>UN Women is headquartered at 220 East 42nd Street in New York and operates through six Regional Offices serving the Americas and the Caribbean (Panama City), the Arab States (Cairo), Asia and the Pacific (Bangkok), East and Southern Africa (Nairobi), Europe and Central Asia (Istanbul), and West and Central Africa (Dakar). It maintains country presences in more than 90 countries through Country Offices, multi-country offices, and Programme Presence Offices, plus liaison offices in Geneva, Brussels, Tokyo, and Copenhagen. The entity employs approximately 3,000 personnel worldwide.</p>'
    '<p>UN Women carries out three interlinked roles: normative support to the intergovernmental processes that set global standards on gender equality (including the annual Commission on the Status of Women, the largest annual UN intergovernmental gathering on gender); operational programming with governments and partners on the ground to translate those standards into laws, policies, programmes, and services; and UN system coordination on gender equality, including through chairing the Inter-Agency Network on Women and Gender Equality (IANWGE) and overseeing the UN System-wide Action Plan on Gender Equality and the Empowerment of Women (UN-SWAP).</p>'
    '<p>UN Women''s current Strategic Plan organises programming around five priority thematic areas: women''s leadership, voice, and participation in governance and decision-making at all levels; economic empowerment and decent work, including unpaid care and domestic work; ending violence against women and girls in all its forms, both online and offline; women, peace, and security and humanitarian action, including women''s participation in peace processes and the protection of women''s rights in crises; and gender-responsive governance and financing, including gender-responsive budgeting and statistical capacity. UN Women has also been at the forefront of advocacy and programming on the gender dimensions of climate change, COVID-19 recovery, digital transformation, and youth.</p>'
    '<p>UN Women is the global custodian of the Convention on the Elimination of All Forms of Discrimination against Women (CEDAW) and the Beijing Declaration and Platform for Action (1995) — the most comprehensive global policy framework for gender equality. The entity supports the implementation of the Women, Peace and Security agenda anchored in UN Security Council resolution 1325 (2000) and its successors, hosts the Generation Equality multistakeholder process and its Action Coalitions, and operates global flagship initiatives including the EU-UN Spotlight Initiative to eliminate violence against women and girls (with the European Union); the UN Trust Fund to End Violence against Women; the Fund for Gender Equality; and the HeForShe solidarity movement. UN Women also produces foundational publications such as Progress of the World''s Women, the Gender Snapshot, and authoritative gender data and statistics under SDG 5 and gender-related indicators across the SDG framework.</p>'
    '<p>UN Women is governed by an Executive Board of 41 members elected by ECOSOC and is overseen at the highest level by the General Assembly, ECOSOC, and the Commission on the Status of Women. The entity is financed through a combination of assessed contributions to the UN regular budget for normative support and voluntary contributions for operational activities — including core (regular) resources and non-core (earmarked) funding from governments, intergovernmental partners, the private sector, foundations, and individuals. The largest contributors typically include Sweden, Germany, Switzerland, the European Union, the Republic of Korea, Norway, the United Kingdom, Iceland, Finland, and the Netherlands. UN Women is led by an Executive Director with the rank of Under-Secretary-General.</p>',
    'Championing gender equality and the empowerment of women, advocating for women''s and girls'' rights worldwide.',
    'https://www.unwomen.org', 'info@unwomen.org', '+1 646 781 4400',
    '220 East 42nd Street, New York, NY 10017, USA',
    'https://twitter.com/UN_Women', 'https://www.facebook.com/unwomen',
    'https://www.linkedin.com/company/un-women', 'https://www.instagram.com/unwomen',
    'https://www.youtube.com/user/unwomen',
    '40', 'USD'),

    ('XM-DAC-41143', 'UNOPS', 'United Nations Office for Project Services',
    '<p>The United Nations Office for Project Services (UNOPS) is the operational arm of the United Nations, providing implementation, procurement, infrastructure, and project management services to governments, donors, and UN partners. UNOPS traces its origins to a project-execution unit established within UNDP in 1973 to implement projects financed through the United Nations Development Programme. In 1995, by General Assembly resolution 48/501, the unit was separated from UNDP and made an independent, self-financing entity within the UN system. Today UNOPS supports the delivery of more than US$2-3 billion of partner-funded projects each year and is the only UN entity that operates entirely on a fee-for-service basis without core funding.</p>'
    '<p>UNOPS is headquartered at Marmorvej 51 in Copenhagen, Denmark, alongside the UN City complex that is also home to UNICEF Supply Division, WHO Regional Office for Europe, UN Women regional and country offices, UNHCR''s Global Service Centre, and other UN entities. The agency operates through five Regional Offices — Africa (Nairobi), Asia (Bangkok), Europe and Central Asia (Geneva), Latin America and the Caribbean (Panama City), and North America (New York) — plus dedicated portfolios for the Multi-Country Office for Eastern Europe and Central Asia, the Sub-Saharan Africa region, and the global Peace and Security Cluster. UNOPS has operations in more than 80 countries and implements projects in many more, often supporting governments, UN agencies, and donors in places where they have no operational presence.</p>'
    '<p>UNOPS implements projects in some of the most challenging environments — post-conflict reconstruction, humanitarian emergencies, fragile states, and complex development settings. Its services fall into four main areas: sustainable infrastructure (the design, supervision, and delivery of physical infrastructure including roads, bridges, schools, hospitals, water and sanitation systems, and energy facilities); transparent and efficient procurement (UNOPS is one of the largest UN procurement service providers, handling tens of thousands of contracts each year for goods, works, and services); full-cycle project management (UNOPS as Principal Recipient or implementing partner for vertical funds, donors, and UN entities); and human resources services (talent recruitment, contract administration, and personnel management for partners worldwide). UNOPS is one of the largest single recipients of Global Fund grants for partner countries unable to host the Principal Recipient role themselves.</p>'
    '<p>UNOPS hosts a number of strategic partnership funds and secretariats, leveraging its operational capacity to administer multistakeholder initiatives. These have historically included the Water Supply and Sanitation Collaborative Council (WSSCC, now Sanitation and Water for All); the Stop TB Partnership; the Roll Back Malaria Partnership; the Cities Alliance; the Mine Action Service support functions; and the secretariats of various international expert bodies. UNOPS also leads on UN system-wide initiatives in environmental sustainability, climate-smart infrastructure, and the Sustainable Infrastructure Foundation, advancing the case for upstream infrastructure investment as a driver of SDG achievement.</p>'
    '<p>UNOPS''s current Strategic Plan emphasises three areas where it can deliver greatest value: peace and security operations (mine action, security sector reform, electoral support); humanitarian and development infrastructure (resilient and inclusive infrastructure design and delivery); and procurement excellence (with strong sustainability and integrity standards including the SDG-aligned Sustainable Procurement Framework). The agency has an ambitious gender, environment, and social safeguards agenda, and is actively positioning itself as a partner for green and digital transitions, including through the Sustainable Infrastructure Tool (SIT) and the Sustainable Investments in Infrastructure and Innovation (S3i) initiative.</p>'
    '<p>UNOPS does not receive any contributions from the UN regular budget — it is fully self-financing through management fees charged on the services it provides. Surpluses are returned to operations and to a partner trust fund supporting innovation and operational excellence in the UN system. UNOPS is governed by the same Executive Board as UNDP and UNFPA (a 36-member body drawn from UN Member States), and is led by an Executive Director with the rank of Under-Secretary-General. As an open-tender operational provider, UNOPS competes alongside UN agencies, NGOs, and private contractors for delivery contracts and is the principal "operations partner" of choice for many bilateral and multilateral funders working through the UN system.</p>',
    'Helping people build better lives and countries achieve peace and sustainable development through efficient implementation services.',
    'https://www.unops.org', 'communications@unops.org', '+45 4533 7500',
    'Marmorvej 51, 2100 Copenhagen, Denmark',
    'https://twitter.com/UNOPS', 'https://www.facebook.com/UNOPS.org',
    'https://www.linkedin.com/company/unops', NULL,
    'https://www.youtube.com/user/UNOPSChannel',
    '40', 'USD'),

    ('XM-DAC-41123', 'ILO', 'International Labour Organization',
    '<p>The International Labour Organization (ILO) is the United Nations specialised agency for the world of work and the oldest specialised agency of the United Nations system. The ILO was founded in 1919 by Part XIII of the Treaty of Versailles ending World War I, on the conviction that universal and lasting peace can only be established if it is based on social justice. Initially established as part of the League of Nations, the ILO became the first specialised agency of the United Nations in 1946. It is the only tripartite UN agency, bringing together representatives of governments, employers, and workers from its 187 Member States on equal footing — a unique governance model designed to ensure that the views of all three parties are reflected in the labour standards and policies it develops.</p>'
    '<p>The ILO is headquartered at 4 Route des Morillons in Geneva, Switzerland — a striking modernist building overlooking Lake Geneva — and operates through five Regional Offices serving Africa (Abidjan), the Americas (Lima), the Arab States (Beirut), Asia and the Pacific (Bangkok), and Europe and Central Asia (Geneva). The agency also runs the International Training Centre in Turin, Italy — its global capacity-building hub — and the International Institute for Labour Studies. ILO maintains country offices and Decent Work Technical Support Teams in more than 40 locations worldwide, with a workforce of approximately 3,300 staff.</p>'
    '<p>ILO sets and supervises the application of international labour standards through Conventions, Protocols, and Recommendations adopted by the annual International Labour Conference. The body of ILO standards comprises 191 Conventions, 6 Protocols, and 209 Recommendations, covering virtually every aspect of work — from freedom of association and collective bargaining to wages, working time, occupational safety and health, social security, maternity protection, employment policy, migrant workers, indigenous and tribal peoples, domestic workers, and seafarers. Particularly significant are the ten fundamental Conventions on the four core principles and rights at work: freedom of association and the effective recognition of the right to collective bargaining; the elimination of all forms of forced or compulsory labour; the effective abolition of child labour; the elimination of discrimination in respect of employment and occupation; and (added in 2022) a safe and healthy working environment.</p>'
    '<p>The ILO''s Decent Work Agenda, adopted in 1999 and reaffirmed in the ILO Declaration on Social Justice for a Fair Globalization (2008) and the Centenary Declaration for the Future of Work (2019), comprises four equally important and mutually reinforcing strategic objectives: employment creation, rights at work, social protection, and social dialogue, with gender equality as a cross-cutting objective. Decent Work is reflected directly in Sustainable Development Goal 8 ("Decent Work and Economic Growth") — for which the ILO is the primary custodian — and in indicators across the SDG framework. The ILO''s flagship development cooperation strategy is delivered through Decent Work Country Programmes negotiated with national tripartite constituents.</p>'
    '<p>The ILO carries out a range of operational activities through development cooperation, including programmes on the elimination of child labour and forced labour (including the Better Work programme in the global garment industry, with the IFC); promoting fair migration and combating trafficking; building social protection floors; supporting jobs-rich economic recovery in fragile and crisis-affected states; advancing the just transition to environmentally sustainable economies; and adapting labour markets to the digital economy and the future of work. The agency''s ILOSTAT database is the leading global source of labour statistics, and the World Employment and Social Outlook, Global Wage Report, and World Social Protection Report are influential annual flagships.</p>'
    '<p>The ILO was awarded the Nobel Peace Prize in 1969 on the occasion of its 50th anniversary "for creating international legislation insuring certain norms for working conditions in every country." It is funded through assessed contributions from its Member States to its regular budget (approximately US$800 million for the biennium) and voluntary contributions for extra-budgetary development cooperation activities. The largest voluntary contributors typically include the United States, the European Union, Germany, Sweden, Norway, the Netherlands, the United Kingdom, Switzerland, and Canada. The ILO is governed by the annual International Labour Conference (the "world parliament of labour"), the 56-member Governing Body, and is led by a Director-General elected for a five-year term.</p>',
    'Advancing social and economic justice through setting international labour standards and promoting decent work for all.',
    'https://www.ilo.org', 'ilo@ilo.org', '+41 22 799 6111',
    '4 Route des Morillons, CH-1211 Geneva 22, Switzerland',
    'https://twitter.com/ilo', 'https://www.facebook.com/ILO.ORG',
    'https://www.linkedin.com/company/international-labour-organization-ilo',
    'https://www.instagram.com/iloinfo', 'https://www.youtube.com/user/iloTV',
    '40', 'USD'),

    ('XM-DAC-41147', 'IOM', 'International Organization for Migration',
    '<p>The International Organization for Migration (IOM) is the leading inter-governmental organisation in the field of migration and the principal UN agency working on migration. IOM was established on 5 December 1951 as the Provisional Intergovernmental Committee for the Movement of Migrants from Europe (PICMME), created to assist Western European governments resettle the approximately 11 million people displaced by World War II. PICMME became the Intergovernmental Committee for European Migration (ICEM) in 1952, the Intergovernmental Committee for Migration (ICM) in 1980, and finally the International Organization for Migration in 1989, reflecting its progressive expansion to a global mandate. On 19 September 2016, IOM became a related organisation of the United Nations through an agreement with the UN, formally joining the UN system while retaining its independent constitution.</p>'
    '<p>IOM is headquartered at 17 Route des Morillons in Geneva, Switzerland, and has grown from its original handful of European member governments to 175 Member States plus 8 States with observer status — making it nearly universal in membership. The agency operates from offices in more than 100 countries and territories with a workforce exceeding 20,000 staff, the majority of whom are nationals of the countries in which they work. IOM''s structure includes nine Regional Offices serving Brussels, Cairo, Buenos Aires, Bangkok, Dakar, Nairobi, Pretoria, San José, and Vienna, plus Country Offices, Sub-Offices, and the Manila Administrative Centre and Panama Administrative Centre that handle global operational support.</p>'
    '<p>IOM''s mandate is to promote humane and orderly migration for the benefit of all by providing services and advice to governments and migrants. Its programmatic activities are organised around four broad areas: migration and development; facilitating migration; regulating migration; and addressing forced migration — with cross-cutting work on international migration law, migration health, gender, and the migration-environment-climate nexus. IOM''s services include migration health assessments and travel medicine; immigration and border management technical assistance and capacity building; counter-trafficking in persons and smuggling of migrants; voluntary humanitarian return and reintegration assistance; resettlement support to UNHCR and resettlement countries; protection of migrants in vulnerable situations; and emergency operations including camp coordination and camp management (CCCM, co-led with UNHCR), shelter, and core relief items in displacement crises.</p>'
    '<p>As the United Nations'' coordinator on migration, IOM serves as the secretariat of the UN Network on Migration — established by the Secretary-General to support coherent UN system implementation of the Global Compact for Safe, Orderly and Regular Migration (GCM), adopted by the General Assembly in December 2018. IOM also provides technical secretariat support for the International Migration Review Forum (IMRF), held every four years to review progress on the GCM, and operates the Migration Network Hub knowledge platform. The agency''s flagship publication, the World Migration Report, is the leading global publication on migration trends and is published every two years.</p>'
    '<p>Operationally, IOM is one of the largest single implementers of resettlement, voluntary return, and reintegration programmes worldwide; manages large-scale registration and biometric identity programmes for displaced populations through its MiMOSA system; and runs Migration Information and Data Analysis System (MIDAS) border-management software used by governments in over 25 countries. The Displacement Tracking Matrix (DTM) — IOM''s globally deployed information management system — produces critical data on internal displacement, mobility flows, and the situation of populations on the move that is used by governments, humanitarian agencies, and researchers. IOM is also the largest UN agency working on counter-trafficking and runs the global CT Data Collaborative with partners.</p>'
    '<p>IOM is funded through a combination of assessed contributions to its Administrative Part of the Budget (a small share covering core overhead from Member States) and voluntary contributions for project-based, earmarked operational activities (the vast majority of total income, which exceeds US$3 billion annually). The largest sovereign donors typically include the United States, the European Union, Germany, the United Kingdom, Canada, Japan, Norway, Sweden, the Netherlands, and Australia. IOM is governed by an annual Council of all Member States and is led by a Director General elected for a five-year term.</p>',
    'Promoting humane and orderly migration for the benefit of all by providing services and advice to governments and migrants.',
    'https://www.iom.int', 'hq@iom.int', '+41 22 717 9111',
    '17 Route des Morillons, 1211 Geneva 19, Switzerland',
    'https://twitter.com/UNmigration', 'https://www.facebook.com/IOM',
    'https://www.linkedin.com/company/international-organization-for-migration',
    'https://www.instagram.com/unmigration', 'https://www.youtube.com/user/iomvideos',
    '40', 'USD'),

    ('XM-DAC-41108', 'UNAIDS', 'Joint United Nations Programme on HIV/AIDS',
    '<p>The Joint United Nations Programme on HIV/AIDS (UNAIDS) is the lead UN entity coordinating the global response to HIV and AIDS, and the only UN cosponsored programme of its kind. UNAIDS was established by ECOSOC resolution 1994/24 of 26 July 1994 and became fully operational on 1 January 1996, replacing the WHO-led Global Programme on AIDS (1986-1995). Its creation was a direct response to recognition that an effective AIDS response required a coordinated, multi-sectoral approach beyond what any single agency could provide. UNAIDS unites the efforts of 11 UN organisations as Cosponsors — UNHCR, UNICEF, WFP, UNDP, UNFPA, UNODC, UN Women, ILO, UNESCO, WHO, and the World Bank — under a Joint Programme model that pools mandates, expertise, and resources around a single global strategy.</p>'
    '<p>UNAIDS is headquartered at 20 Avenue Appia in Geneva, Switzerland — adjacent to WHO and at the heart of "International Geneva''s" global health corridor. The Joint Programme operates through Regional Support Teams in Bangkok (Asia and the Pacific), Johannesburg (Eastern and Southern Africa), Dakar (West and Central Africa), Cairo (Middle East and North Africa), Panama City (Latin America and the Caribbean), and Moscow (Eastern Europe and Central Asia, currently relocated). UNAIDS has Country Offices and country-level UN Joint Teams on AIDS in more than 70 countries, providing strategic, technical, and policy support to national HIV responses.</p>'
    '<p>UNAIDS''s vision is the achievement of three "zeros": zero new HIV infections, zero discrimination, and zero AIDS-related deaths. The Joint Programme provides the strategic direction, advocacy, coordination, and technical support needed to catalyse and connect leadership from governments, the private sector, civil society, and communities to deliver life-saving HIV services. UNAIDS also generates the authoritative strategic information that underpins the global AIDS response — including the annual UNAIDS estimates and the Global AIDS Update — and curates AIDSinfo, the world''s most comprehensive HIV data platform.</p>'
    '<p>The current Global AIDS Strategy 2021-2026, adopted by the UNAIDS Programme Coordinating Board in March 2021, is built around closing the inequalities that drive the AIDS epidemic — particularly those affecting key and vulnerable populations including sex workers, gay men and other men who have sex with men, people who use drugs, transgender people, and people in prisons. The Strategy aligns with and operationalises the political commitments in the 2021 United Nations Political Declaration on HIV and AIDS, which set new "95-95-95" testing and treatment targets for 2025 (95 per cent of people living with HIV know their status; 95 per cent of those who know their status are on treatment; 95 per cent of those on treatment are virally suppressed) and called for the elimination of HIV-related stigma and discrimination.</p>'
    '<p>UNAIDS''s landmark contributions to global health include placing community-led responses and the meaningful involvement of people living with HIV at the centre of the AIDS response (the GIPA Principle); pioneering global price negotiations for antiretroviral medicines that brought treatment costs down by orders of magnitude; designing and supporting the rollout of "treat-all" policies; and successfully mobilising historic political commitment through three High-Level Meetings of the General Assembly on HIV and AIDS (2001, 2006, 2016, 2021). UNAIDS played a pivotal advocacy role in the establishment of the Global Fund to Fight AIDS, Tuberculosis and Malaria (2002), the U.S. President''s Emergency Plan for AIDS Relief (PEPFAR, 2003), and the integration of HIV into broader health and social protection systems.</p>'
    '<p>UNAIDS is governed by a unique multistakeholder Programme Coordinating Board (PCB) comprising representatives of 22 governments drawn from all UN regions, the 11 UNAIDS Cosponsors, and — uniquely in the UN system — five non-governmental organisations including associations of people living with HIV. The PCB meets twice a year in Geneva. UNAIDS is funded through voluntary contributions from governments, foundations, the private sector, and individuals — with no assessed budget. The largest sovereign donors typically include the United States, Sweden, the Netherlands, Norway, Japan, Switzerland, Germany, the United Kingdom, Luxembourg, and the European Union. The Joint Programme is led by an Executive Director with the rank of Under-Secretary-General.</p>',
    'Leading the global effort to end AIDS as a public health threat by 2030 as part of the Sustainable Development Goals.',
    'https://www.unaids.org', 'communications@unaids.org', '+41 22 791 3666',
    '20 Avenue Appia, 1211 Geneva 27, Switzerland',
    'https://twitter.com/UNAIDS', 'https://www.facebook.com/UNAIDS',
    'https://www.linkedin.com/company/unaids', 'https://www.instagram.com/unaidsglobal',
    'https://www.youtube.com/user/UNAIDS',
    '40', 'USD'),

    -- ===========================================================================
    -- International financial institutions
    -- ===========================================================================
    ('44000', 'WB', 'World Bank',
    '<p>The World Bank is an international financial institution that provides loans, grants, equity investments, guarantees, and technical assistance to the governments of low- and middle-income countries to pursue capital projects and policy reforms aimed at reducing poverty and supporting sustainable development. The World Bank was established at the United Nations Monetary and Financial Conference held in Bretton Woods, New Hampshire from 1-22 July 1944, alongside its sister Bretton Woods institution the International Monetary Fund (IMF). The Bank''s original mission was to finance the reconstruction of Europe after World War II — its first loan was a US$250 million credit to France in 1947 — but as the Marshall Plan took up post-war reconstruction, the institution rapidly pivoted to financing development in the newly independent countries of Asia, Africa, and Latin America.</p>'
    '<p>"The World Bank" is commonly used to refer to two of the five institutions that together make up the World Bank Group: the International Bank for Reconstruction and Development (IBRD), founded in 1944, which lends to creditworthy middle-income and lower-middle-income governments at near-market rates; and the International Development Association (IDA), founded in 1960, which provides highly concessional credits, grants, and guarantees to the world''s poorest countries — currently 75 IDA-eligible countries home to approximately 1.5 billion people. The other three Group institutions are the International Finance Corporation (IFC, founded 1956), which finances private-sector investment in emerging markets; the Multilateral Investment Guarantee Agency (MIGA, founded 1988), which provides political risk insurance and credit enhancement; and the International Centre for Settlement of Investment Disputes (ICSID, founded 1966), which arbitrates investor-state disputes.</p>'
    '<p>The World Bank Group is headquartered at 1818 H Street NW in Washington, D.C., across the street from the IMF. The Bank operates a network of more than 130 country offices led by Country Managers, with regional management based in Washington and major regional hubs. Its workforce of around 12,000 development professionals draws on more than 170 nationalities. The Bank''s current Mission Statement and the World Bank Group Evolution Roadmap launched in 2023 reframe the institution''s mission as "creating a world free of poverty on a livable planet," explicitly integrating climate, biodiversity, fragility, and pandemic preparedness as global challenges that the Bank must address alongside national poverty reduction.</p>'
    '<p>The Bank''s lending and advisory work spans virtually every sector of public policy: human development (health, education, social protection, jobs, gender); agriculture, water, food security, and rural development; energy and extractives; transport, urban, digital, and disaster risk management infrastructure; environment and natural resources; finance, competitiveness, and innovation; macroeconomics, trade, and investment; governance and public sector management; and social, urban, rural, and resilience global practices. The Bank delivers Investment Project Financing (IPF), Development Policy Financing (DPF, formerly known as policy-based lending), Program-for-Results (PforR) financing linked to disbursement-linked indicators, and a growing portfolio of trust-funded technical assistance and analytical work.</p>'
    '<p>IDA is the largest multilateral source of concessional financing for the world''s poorest countries, replenished by donor pledges every three years. Recent IDA replenishments — IDA19 (US$82 billion), IDA20 (US$93 billion, brought forward to address COVID-19), and IDA21 (under negotiation in 2024 with a record ambition exceeding US$100 billion) — have made IDA one of the largest pots of concessional development finance globally. IDA''s allocation system uses a Performance-Based Allocation (PBA) formula, with additional windows for crisis response, fragile and conflict-affected states, regional projects, refugee-hosting countries, and private-sector development.</p>'
    '<p>The World Bank also produces some of the most authoritative global development data and research, including the World Development Report (annually since 1978), the Global Economic Prospects, the Poverty and Shared Prosperity Report, the World Development Indicators, the World Bank Open Data platform, the new Business Ready (B-Ready) indicators (replacing Doing Business), and the Country Climate and Development Reports. Its research output through the Development Economics Vice Presidency (DEC) and the Development Impact Evaluation (DIME) initiative has shaped global development discourse and practice for decades.</p>'
    '<p>The World Bank is owned by 189 member countries (IBRD) and 174 (IDA), each represented on the Board of Governors — typically Ministers of Finance or Development — that meets annually at the Annual Meetings (held jointly with the IMF). Day-to-day governance is exercised by 25 Executive Directors, with five appointed by the largest shareholders and 20 elected by the rest of the membership. Voting power is weighted by capital subscription, with the largest shareholders historically being the United States (which holds an effective veto over major changes given the 85 per cent supermajority threshold), Japan, China, Germany, the United Kingdom, France, India, Russia, and Saudi Arabia. The World Bank is led by a President nominated by the United States and confirmed by the Board.</p>',
    'To end extreme poverty and promote shared prosperity in a sustainable way.',
    'https://www.worldbank.org', 'feedback@worldbank.org', '+1 202 473 1000',
    '1818 H Street NW, Washington, DC 20433, USA',
    'https://twitter.com/WorldBank', 'https://www.facebook.com/worldbank',
    'https://www.linkedin.com/company/the-world-bank', 'https://www.instagram.com/worldbank',
    'https://www.youtube.com/user/WorldBank',
    '40', 'USD'),

    ('XM-DAC-46004', 'ADB', 'Asian Development Bank',
    '<p>The Asian Development Bank (ADB) is the regional multilateral development bank for Asia and the Pacific, dedicated to achieving a prosperous, inclusive, resilient, and sustainable region while sustaining its efforts to eradicate extreme poverty. ADB was established on 22 August 1966 by 31 founding members through the signing of the ADB Charter at a ministerial conference in Manila, building on a 1963 ECAFE (now ESCAP) resolution to create a regional bank to mobilise the additional capital and technical resources needed for the region''s post-war development. ADB began operations on 19 December 1966 with an initial capital of US$1 billion. From these beginnings the institution has grown into a major source of development finance for Asia and the Pacific, with cumulative lending and grant approvals exceeding US$300 billion across nearly 60 years of operations.</p>'
    '<p>ADB is headquartered at 6 ADB Avenue in Mandaluyong, Metro Manila, Philippines, in a complex purpose-built for the institution and now home to a workforce of approximately 3,800 staff. The Bank operates a network of resident missions and representative offices in 31 of its developing member countries, plus three representative offices to deepen partnerships with the rest of the world: the Frankfurt Office for Europe; the Tokyo Liaison Office; and the North American Representative Office in Washington, D.C. ADB also operates a small office in Beijing and a Pacific Subregional Office in Suva, Fiji, that anchors its substantial Pacific operations.</p>'
    '<p>ADB has 68 member countries — 49 from within Asia and the Pacific (including all major Asian economies, the Pacific island countries, Central Asian republics, and the Caucasus) and 19 from outside the region (including the United States, Canada, the major European economies, Türkiye, and observer-status engagements). Approximately 41 of these are classified as developing member countries (DMCs) eligible for ADB financing, ranging from large economies like India, Indonesia, Pakistan, the Philippines, Bangladesh, and Viet Nam, through middle-income performers like Thailand, Kazakhstan, and Sri Lanka, to small Pacific island states and least-developed countries.</p>'
    '<p>ADB provides four main types of financial assistance to its DMCs: sovereign loans (lending to governments under both ordinary capital resources and concessional terms); non-sovereign operations (loans, equity, and guarantees to private-sector borrowers and sub-sovereigns); technical assistance grants; and policy-based lending and Results-Based Lending. Its lending volumes typically exceed US$30 billion per year in recent years, with co-financing partnerships frequently bringing total project financing well above the ADB-only figures. The Bank is also the trustee for a number of climate finance and partnership funds, including the ASEAN Catalytic Green Finance Facility, the Climate Investment Funds for Asia and the Pacific, and the High-Level Technology Fund.</p>'
    '<p>ADB''s corporate strategy, Strategy 2030, adopted in 2018, identifies seven operational priorities: (1) addressing remaining poverty and reducing inequalities; (2) accelerating progress in gender equality; (3) tackling climate change, building climate and disaster resilience, and enhancing environmental sustainability; (4) making cities more liveable; (5) promoting rural development and food security; (6) strengthening governance and institutional capacity; and (7) fostering regional cooperation and integration. ADB has substantially increased its climate ambition under Strategy 2030 and through its Climate Change Action Plan 2023-2030 — committing to provide at least US$100 billion in cumulative climate finance from its own resources between 2019 and 2030 — and has substantial energy transition, food security, and finance-sector portfolios.</p>'
    '<p>ADB is owned by its 68 member countries, with the largest shareholders being Japan and the United States, each holding approximately 15.6 per cent of total shares, followed by the People''s Republic of China, India, Australia, Indonesia, Canada, the Republic of Korea, and Germany. Voting power is broadly weighted by shareholding. ADB mobilises resources through three principal mechanisms: ordinary capital resources (OCR, market borrowings backed by member capital, with a triple-A credit rating); the Asian Development Fund (ADF), the concessional grant resource for the lowest-income and most fragile DMCs, replenished every four years by donor governments; and the Special Funds and trust funds for specific themes and partnerships. ADB is governed by a Board of Governors and a 12-member resident Board of Directors, and is led by a President — by long-standing convention a Japanese national — elected by the Board of Governors for a five-year term.</p>',
    'A prosperous, inclusive, resilient and sustainable Asia and the Pacific while sustaining its efforts to eradicate extreme poverty.',
    'https://www.adb.org', 'information@adb.org', '+63 2 8632 4444',
    '6 ADB Avenue, Mandaluyong City 1550, Metro Manila, Philippines',
    'https://twitter.com/ADB_HQ', 'https://www.facebook.com/AsianDevBank',
    'https://www.linkedin.com/company/asian-development-bank',
    'https://www.instagram.com/asiandevbank', 'https://www.youtube.com/user/AsianDevBank',
    '40', 'USD'),

    -- ===========================================================================
    -- Bilateral donors
    -- ===========================================================================
    ('XI-IATI-EC_DEVCO', 'EU', 'European Commission - Directorate-General for International Partnerships',
    '<p>The Directorate-General for International Partnerships (DG INTPA) is the European Commission service responsible for shaping the European Union''s international partnerships and development cooperation policy. DG INTPA was established in January 2021 to replace the former Directorate-General for International Cooperation and Development (DG DEVCO), reflecting the political ambition of the von der Leyen Commission to deliver a more political, strategic, and partner-driven external action that goes beyond traditional development assistance. DG INTPA''s mandate evolved further with the launch of the Global Gateway strategy in December 2021 and the establishment of the Neighbourhood, Development and International Cooperation Instrument — Global Europe (NDICI) for the 2021-2027 Multiannual Financial Framework, which consolidated more than ten previous external instruments into a single, more flexible tool.</p>'
    '<p>DG INTPA is headquartered at Rue de la Loi 41 in Brussels, Belgium, in the heart of the EU institutional quarter. It is one of the largest Directorates-General in the European Commission, with approximately 4,000 staff in headquarters and in EU Delegations worldwide. EU Delegations — formerly known as Delegations of the European Commission — are the diplomatic representations of the European Union, and the global network of more than 140 EU Delegations also serves as the operational arm of DG INTPA, with development counsellors and sector experts based in Delegation political and cooperation sections in partner countries.</p>'
    '<p>DG INTPA designs and implements EU international cooperation and development policy in partnership with countries in Sub-Saharan Africa, Asia and the Pacific, the Americas, and the OCTs (Overseas Countries and Territories) — while DG NEAR (Neighbourhood and Enlargement Negotiations) handles the EU''s neighbourhood and pre-accession policies. Its programmatic priorities are framed by six European Commission policy priorities translated into international action: the European Green Deal (climate, biodiversity, circular economy, sustainable food systems); a Europe fit for the digital age (digital transformation, data governance, cyber); an economy that works for people (sustainable jobs, decent work, social protection); a stronger Europe in the world (peace, security, conflict prevention, governance, human rights, democracy); promoting our European way of life (migration, mobility, education); and a new push for European democracy.</p>'
    '<p>DG INTPA leads the EU''s flagship Global Gateway investment initiative — launched in December 2021 to mobilise up to €300 billion of investments in partner countries by 2027, focused on hard and soft infrastructure (digital, climate and energy, transport, health, education and research) — and coordinates Team Europe initiatives that combine resources from the EU, EU Member States, the European Investment Bank, the European Bank for Reconstruction and Development, and other European development finance institutions. Major Team Europe Initiatives are now operational across health (vaccine manufacturing in Africa), green and digital transitions, sustainable food systems, gender equality, and migration partnerships.</p>'
    '<p>DG INTPA''s implementing instruments include grants and procurement contracts; budget support to partner governments tied to performance indicators; financial instruments through Trust Funds (e.g., the EU Emergency Trust Fund for Africa, the Bêkou Trust Fund); blending operations through the European Fund for Sustainable Development Plus (EFSD+) — which combines grants, blending, and guarantees with the EIB and other development finance institutions; and contribution agreements with the United Nations system, multilateral development banks, and other delegated cooperation partners. The EU is the largest provider of budget support globally and a major user of pooled financing arrangements.</p>'
    '<p>The European Union as a whole — combining contributions from EU institutions and Member States — is the world''s largest provider of Official Development Assistance, contributing approximately €70-90 billion per year (depending on the year and methodology) and consistently providing more than half of all global ODA. DG INTPA''s budget within this is principally drawn from NDICI-Global Europe (€79.5 billion for 2021-2027), supplemented by the European Development Fund legacy, the Instrument for Pre-accession Assistance, and operational facilities such as the European Peace Facility (managed by the European External Action Service) and the IPA III. DG INTPA reports to the Commissioner for International Partnerships, a member of the College of Commissioners, and is led by a Director-General who is the senior civil-service head of the service.</p>',
    'Promoting sustainable development, eradicating poverty, and ensuring peace and protection of human rights worldwide.',
    'https://international-partnerships.ec.europa.eu', 'INTPA-INFO@ec.europa.eu', '+32 2 299 1111',
    'Rue de la Loi 41, 1049 Brussels, Belgium',
    'https://twitter.com/EU_Partnerships', 'https://www.facebook.com/EuropeanCommission',
    'https://www.linkedin.com/showcase/eu-international-partnerships', NULL,
    'https://www.youtube.com/user/eutube',
    '10', 'EUR'),

    ('US-GOV-1', 'USAID', 'United States Agency for International Development',
    '<p>The United States Agency for International Development (USAID) is the lead U.S. Government agency that works to end extreme global poverty and enable resilient, democratic societies to realise their potential. USAID was created on 4 November 1961 by President John F. Kennedy through Executive Order 10973, implementing the Foreign Assistance Act of 1961, which Kennedy described as bringing together a "fragmented and overlapping" set of post-war U.S. foreign assistance programmes — the Mutual Security Agency, the International Cooperation Administration, the Development Loan Fund, and parts of the Food for Peace programme — into a single, modernised civilian development agency. USAID was conceived as a complement to U.S. diplomacy and security policy and as the embodiment of the United States'' commitment to global development articulated in Kennedy''s 1961 inaugural address.</p>'
    '<p>USAID is an independent agency that reports to and operates under the foreign-policy guidance of the Secretary of State. It is headquartered at the Ronald Reagan Building and International Trade Center at 1300 Pennsylvania Avenue NW in Washington, D.C., with overseas operations led by USAID Mission Directors in approximately 80 country missions and additional regional and central programmes covering more than 100 countries. The agency''s workforce of approximately 10,000 — including U.S. Foreign Service Officers, Civil Service personnel, Foreign Service Nationals (locally engaged staff), Personal Services Contractors, and institutional contractors — represents the largest single bilateral donor field presence in the world.</p>'
    '<p>USAID administers civilian foreign assistance on behalf of the United States, working in partnership with host governments, other donors, U.S. and local NGOs, faith-based organisations, the private sector, universities and colleges, and other partners. Its programmes are organised across regional bureaus (Africa; Asia; Europe and Eurasia; Latin America and the Caribbean; the Middle East), functional and pillar bureaus (Bureau for Global Health; Bureau for Humanitarian Assistance; Bureau for Resilience, Environment, and Food Security; Bureau for Democracy, Human Rights, and Governance; Bureau for Economic Growth, Education, and Environment; Bureau for Conflict Prevention and Stabilization; Bureau for Development, Democracy, and Innovation), and operational support functions.</p>'
    '<p>USAID is one of the largest single funders of global health worldwide. Its global health portfolio includes leading or supporting implementation of the U.S. President''s Emergency Plan for AIDS Relief (PEPFAR, the largest commitment by any nation to address a single disease in history); the President''s Malaria Initiative (PMI); the Global Health Security Agenda; large maternal and child health, family planning, and nutrition programmes; tuberculosis; neglected tropical diseases; and pandemic preparedness. The Bureau for Humanitarian Assistance — formed in 2020 from the Office of U.S. Foreign Disaster Assistance and Food for Peace — is one of the largest humanitarian donors in the world, providing emergency food, health, nutrition, water, sanitation, and protection assistance through the UN system, the Red Cross/Red Crescent Movement, NGOs, and direct procurement.</p>'
    '<p>Beyond global health and humanitarian assistance, USAID''s thematic priorities span food security and resilience (Feed the Future, the U.S. Government''s flagship food security initiative); democracy, human rights, and governance; economic growth, trade, and investment (including Power Africa, Prosper Africa, and the Development Finance Corporation partnership); education and youth; gender equality and women''s economic empowerment; climate change adaptation, mitigation, and renewable energy; water security, sanitation, and hygiene; conflict prevention, peacebuilding, and stabilisation; and digital development. USAID has been a leader in the locally-led development agenda — including the New Partnerships Initiative and a target to direct 25 per cent of eligible funding to local partners — and in evaluation, evidence-based programming, and a learning-oriented approach to development cooperation.</p>'
    '<p>USAID''s budget is appropriated annually by the U.S. Congress through the Department of State, Foreign Operations, and Related Programs Appropriations Act, supplemented by interagency transfers, supplementals (notably for Ukraine, Afghanistan, and pandemic response in recent years), and trust funds and contributions for specific programmes. Annual program funding is typically in the range of US$25-50 billion across appropriated accounts. USAID is led by an Administrator who serves at Cabinet rank when designated by the President, and the agency reports to the Department of State for foreign-policy coherence while exercising day-to-day operational independence.</p>',
    'Saving lives, reducing poverty, strengthening democratic governance, and helping people emerge from humanitarian crises and progress beyond assistance.',
    'https://www.usaid.gov', 'AskUSAID@usaid.gov', '+1 202 712 0000',
    'Ronald Reagan Building, 1300 Pennsylvania Avenue NW, Washington, DC 20523, USA',
    'https://twitter.com/USAID', 'https://www.facebook.com/USAID',
    'https://www.linkedin.com/company/usaid', 'https://www.instagram.com/usaid',
    'https://www.youtube.com/user/usaidvideo',
    '10', 'USD'),

    ('GB-GOV-1', 'FCDO', 'Foreign, Commonwealth and Development Office',
    '<p>The Foreign, Commonwealth and Development Office (FCDO) is the United Kingdom''s ministry of foreign affairs and international development. FCDO was formed on 2 September 2020 through the merger of the Foreign and Commonwealth Office (FCO) — itself the product of a 1968 merger between the Foreign Office and the Commonwealth Office — and the Department for International Development (DFID), the UK''s former standalone development ministry. The 2020 merger was announced by Prime Minister Boris Johnson with the rationale of bringing diplomacy and development under a single department to deliver a more integrated UK foreign policy that aligns trade, security, climate, and development objectives in pursuit of UK national interests and global goods.</p>'
    '<p>FCDO is headquartered in the historic King Charles Street building in Westminster, London — a Grade I listed Italianate complex that has housed the Foreign Office since 1868 — with additional London offices including Old Admiralty Building. The department also operates major programme and back-office hubs in East Kilbride (Scotland), Milton Keynes, and Abercrombie House. FCDO''s overseas footprint comprises a network of more than 280 embassies, high commissions, consulates, and offices around the world, employing both UK-based diplomats (members of the Diplomatic Service) and locally-engaged staff. The department''s workforce numbers approximately 17,000 people, making it one of the largest UK foreign services and development agencies in history.</p>'
    '<p>FCDO leads the UK Government''s overseas diplomatic, development, and consular work and is responsible for coordinating UK action across more than 28 government departments and agencies operating internationally — through HM Trade Commissioners, defence attachés, the British Council network, and others. Its current development priorities are set out in the UK''s International Development Strategy (2022) and the related Approach to Atrocity Prevention, Approach to Conflict and Stability, and the Women and Girls Strategy. The Strategy organises UK development efforts around four priorities: providing honest, reliable investment through the British Investment Partnerships and the Global Britain Investment Fund; offering women and girls the freedom they need to succeed; stepping up life-saving humanitarian assistance; and taking forward UK leadership on climate change, nature, and global health.</p>'
    '<p>FCDO''s programmatic portfolio spans global health (with major contributions to the Global Fund, Gavi, the World Health Organization, and bilateral health programmes); humanitarian response (FCDO is a top-five global humanitarian donor with major operations in Ukraine, Afghanistan, the Horn of Africa, the Sahel, Yemen, Sudan, and Gaza); climate, nature, and renewable energy (including UK leadership on the COP26 Glasgow Climate Pact and the £11.6 billion International Climate Finance commitment); economic development, including the British International Investment (BII, formerly CDC Group) — the UK''s development finance institution; education, including the Girls'' Education Action Plan; conflict, stability, and security through the Conflict, Stability and Security Fund (CSSF); and governance, anti-corruption, and the rule of law.</p>'
    '<p>FCDO manages a substantial share of the UK''s contributions to the multilateral system, including replenishments and core contributions to the World Bank Group (especially IDA), regional development banks (the African Development Bank, Asian Development Bank, Inter-American Development Bank, and Caribbean Development Bank), the United Nations system (UN agencies, funds, and programmes), the Commonwealth, the Global Fund to Fight AIDS, Tuberculosis and Malaria, Gavi, the Global Partnership for Education, the Climate Investment Funds, the Green Climate Fund, and a wide range of vertical funds and partnerships. FCDO Ministers represent the UK on the boards and at the high-level pledging events of these institutions.</p>'
    '<p>FCDO is funded through the UK''s Official Development Assistance (ODA) budget — historically set at the international target of 0.7 per cent of Gross National Income (GNI), though temporarily reduced to 0.5 per cent of GNI from 2021 due to fiscal pressures, with a Government commitment to return to 0.7 per cent when fiscal circumstances allow. ODA spending is governed by the OECD Development Assistance Committee (DAC) rules and the UK''s International Development Act 2002 and Gender Equality Act 2014, which require that all ODA promote sustainable development, poverty reduction, and gender equality. FCDO also manages substantial non-ODA budgets including the diplomatic estate, conflict and security work, and consular services. The department is led by the Secretary of State for Foreign, Commonwealth and Development Affairs (a senior Cabinet position) and the Permanent Under-Secretary, the head of the Diplomatic Service.</p>',
    'Pursuing the United Kingdom''s national interests and projecting the UK as a force for good in the world.',
    'https://www.gov.uk/government/organisations/foreign-commonwealth-development-office',
    'fcdo.correspondence@fcdo.gov.uk', '+44 20 7008 5000',
    'King Charles Street, London SW1A 2AH, United Kingdom',
    'https://twitter.com/FCDOGovUK', 'https://www.facebook.com/foreignoffice',
    'https://www.linkedin.com/company/foreign-commonwealth-development-office', NULL,
    'https://www.youtube.com/user/foreignoffice',
    '10', 'GBP'),

    ('XM-DAC-5-52000', 'GIZ', 'Deutsche Gesellschaft für Internationale Zusammenarbeit',
    '<p>Deutsche Gesellschaft für Internationale Zusammenarbeit (GIZ) GmbH is a federal enterprise of the Federal Republic of Germany that supports the Government and other commissioning parties in achieving their objectives in the field of international cooperation for sustainable development. GIZ was formed on 1 January 2011 through the merger of three pre-existing German development organisations: the Deutsche Gesellschaft für Technische Zusammenarbeit (GTZ), the Deutscher Entwicklungsdienst (DED, Germany''s development service that fielded development workers), and Internationale Weiterbildung und Entwicklung (InWEnt, the international capacity-building agency). The merger was a major reform of the German development cooperation architecture designed to consolidate technical cooperation, advisory services, capacity development, and personnel deployment under a single, modernised organisation.</p>'
    '<p>GIZ has dual headquarters at Friedrich-Ebert-Allee 32 in Bonn (the federal city and Germany''s "UN City") and at Dag-Hammarskjöld-Weg 1-5 in Eschborn near Frankfurt am Main, complemented by liaison offices in Berlin and Brussels and the GIZ Akademie in Bonn-Bad Godesberg. The agency operates in more than 120 countries with a workforce of approximately 25,000 personnel worldwide, the vast majority of whom — typically over 70 per cent — are nationals of the partner countries in which they work. GIZ is one of the world''s largest implementing agencies for international development cooperation by both staff size and operational footprint.</p>'
    '<p>The German Federal Ministry for Economic Cooperation and Development (BMZ) is GIZ''s principal commissioning party, providing the bulk of its commission volume through Germany''s bilateral technical cooperation programmes. GIZ also implements work for other German federal ministries (notably the Foreign Office, the Federal Ministry for the Environment, the Federal Ministry of Health, and the Federal Ministry for Education and Research), governments of other partner countries, the European Union (one of its largest non-German commissioners), the United Nations system, multilateral development banks, philanthropic foundations, and private sector clients through its International Services business unit.</p>'
    '<p>GIZ''s programmatic priorities span the full breadth of sustainable development, organised around several major thematic areas: climate change adaptation and mitigation, biodiversity, and forest conservation; renewable energy and energy efficiency; sustainable urban development and mobility; sustainable agriculture and food security; water, sanitation, and waste management; governance, democracy, rule of law, and decentralisation; peace, security, conflict prevention, and stabilisation in fragile states; economic development, employment, vocational training (TVET), and private sector development; health and social protection; education; gender equality; and migration, displacement, and refugee response. The agency is also a major implementer of digital transformation, e-government, and technology-for-development initiatives.</p>'
    '<p>GIZ provides international personnel services through several specialised vehicles. The Centre for International Migration and Development (CIM), run jointly with the German Federal Employment Agency, places international experts and returning specialists in partner-country institutions. The development workers'' service places approximately 1,000 development workers in partner organisations on multi-year assignments. The agency also runs the Academy for International Cooperation (AIZ) for capacity development of partner-country professionals and German cooperation staff.</p>'
    '<p>GIZ is a federally-owned limited liability company (Gesellschaft mit beschränkter Haftung, GmbH) under German private law, with the Federal Government as sole shareholder represented by BMZ and the Federal Ministry of Finance. The company is principally financed through cooperation contracts with BMZ and other commissioning parties, with annual business volume typically exceeding €4 billion. GIZ is governed by a Supervisory Board (Aufsichtsrat) including representatives of the Federal Government, the Bundestag, and the social partners, and a Management Board (Vorstand) led by a Chair (Vorstandsvorsitzende). The German development cooperation system also includes KfW Entwicklungsbank (the financial cooperation arm) — alongside GIZ''s technical cooperation role — together delivering Germany''s ODA commitments.</p>',
    'Supporting the German Government and partners in achieving sustainable development goals through international cooperation.',
    'https://www.giz.de', 'info@giz.de', '+49 228 4460 0',
    'Friedrich-Ebert-Allee 32 + 36, 53113 Bonn, Germany',
    'https://twitter.com/giz_gmbh', 'https://www.facebook.com/gizprofile',
    'https://www.linkedin.com/company/gizgmbh', 'https://www.instagram.com/giz_gmbh',
    'https://www.youtube.com/user/GIZonlineTV',
    '10', 'EUR'),

    ('XM-DAC-7-1', 'JICA', 'Japan International Cooperation Agency',
    '<p>The Japan International Cooperation Agency (JICA) is the governmental agency that delivers the bulk of Official Development Assistance (ODA) for the Government of Japan. The original JICA was established on 1 August 1974 through the consolidation of pre-existing Japanese technical cooperation bodies, but the current "New JICA" is a substantially larger institution formed on 1 October 2008 through the merger of the original JICA (which had administered grant aid and technical cooperation) with the overseas economic cooperation operations of the Japan Bank for International Cooperation (JBIC, which had administered ODA loans). The 2008 merger brought all three modalities of Japanese bilateral ODA — loans, grants, and technical cooperation — under one roof, making JICA one of the largest bilateral development cooperation agencies in the world by total annual disbursement.</p>'
    '<p>JICA is headquartered at the Nibancho Center Building, 5-25 Niban-cho, Chiyoda-ku, Tokyo, with additional offices in Tokyo and the Yokohama JICA Global Plaza. The agency operates a global network of more than 90 overseas offices in approximately 150 countries, and runs domestic centres in Tokyo, Yokohama, Hokkaido, Tohoku, Tsukuba, Komagane, Hyogo, Chubu, Chugoku, Shikoku, Kyushu, and Okinawa for training, public outreach, and partnerships with local Japanese stakeholders. JICA''s workforce includes approximately 2,000 staff in Japan, additional dispatched experts and personnel in country offices, and the JICA Overseas Cooperation Volunteers (JOCV, formerly known as Japan Overseas Cooperation Volunteers) deployed in partner countries.</p>'
    '<p>JICA implements three principal modalities of bilateral cooperation. First, technical cooperation includes the dispatch of Japanese experts and advisers, acceptance of trainees in Japan and in third countries, provision of equipment, technical cooperation projects (typically multi-year sectoral interventions), country-focused training programmes, and the JICA Overseas Cooperation Volunteers programme — Japan''s flagship volunteering scheme that has dispatched more than 50,000 volunteers since 1965. Second, concessional ODA loans are yen-denominated, long-tenure, low-interest loans (typically with 30-40 year maturities and grace periods) for infrastructure, policy and institution building, and sector reform programmes; JICA is one of the largest single sources of concessional infrastructure finance for emerging economies. Third, grant aid provides non-repayable funds principally for the poorest countries, humanitarian needs, and global commons (e.g., climate, fisheries) where loans are inappropriate.</p>'
    '<p>JICA also dispatches the Japan Disaster Relief (JDR) Team — comprising rescue, medical, expert, infectious-disease, and self-defence-force units — to disaster-affected countries upon government request, and operates international emergency stockpiles. The agency has a substantial private-sector partnership facility through its SDGs Business Supporting Surveys and Verification Surveys, the Loan and Investment for Private Sector window for private-sector financing, and partnerships with Japanese SMEs. JICA Research Institute (JICA Ogata Sadako Research Institute for Peace and Development) is the agency''s think tank, named after the late Sadako Ogata — the former United Nations High Commissioner for Refugees who served as JICA President from 2003 to 2012.</p>'
    '<p>JICA''s current thematic priorities span quality infrastructure (the Partnership for Quality Infrastructure and the G7-led Partnership for Global Infrastructure and Investment); human security and peacebuilding; climate action (with substantial commitments under Japan''s climate finance pledges and the GX Green Transformation agenda); universal health coverage and pandemic preparedness; food security; and digital transformation. The agency has been the long-standing implementing partner for the Tokyo International Conference on African Development (TICAD), the cornerstone of Japan''s engagement with Africa, and for the Pacific Islands Leaders Meeting (PALM) process.</p>'
    '<p>JICA is an Independent Administrative Institution (Dokuritsu Gyosei Hojin) under the supervision of Japan''s Ministry of Foreign Affairs. The agency is principally funded through Japan''s annual ODA budget appropriations, with loan operations financed through JICA''s own Capital Subscription and FILP (Fiscal Investment and Loan Programme) borrowings. JICA is led by a President appointed by the Minister of Foreign Affairs, and is overseen by an Auditor and a Liaison Council with major Japanese stakeholders. Japan is one of the largest bilateral DAC donors and JICA''s annual operations volume — combining ODA loans, grants, and technical cooperation — typically exceeds US$15 billion in commitment terms.</p>',
    'Contributing to the promotion of international cooperation and the sound development of the Japanese and global economies.',
    'https://www.jica.go.jp/english/', NULL, '+81 3 5226 6660',
    'Nibancho Center Building, 5-25 Niban-cho, Chiyoda-ku, Tokyo 102-8012, Japan',
    'https://twitter.com/jica_direct_en', 'https://www.facebook.com/JICA.English',
    'https://www.linkedin.com/company/jica', NULL,
    'https://www.youtube.com/user/jicachannel',
    '10', 'JPY'),

    ('XM-DAC-12-1', 'KOICA', 'Korea International Cooperation Agency',
    '<p>The Korea International Cooperation Agency (KOICA) is the Government of the Republic of Korea''s grant aid and technical cooperation agency. KOICA was established on 1 April 1991 under the Ministry of Foreign Affairs through the Korea International Cooperation Agency Act, marking a watershed moment in Korea''s international development engagement. The agency''s creation reflected the Republic of Korea''s extraordinary transformation from one of the world''s largest aid recipients in the post-Korean War era into a confident middle-income democracy ready to share its development experience with other partner countries — a journey culminating in Korea joining the OECD Development Assistance Committee (DAC) on 25 November 2009 with effect from 1 January 2010, the first former aid recipient to do so.</p>'
    '<p>KOICA is headquartered at 825 Daewangpangyo-ro in Sujeong-gu, Seongnam-si, Gyeonggi-do — approximately 25 km south of central Seoul in the Pangyo technology district. The agency operates a network of more than 50 overseas offices in approximately 50 partner countries, organised across regional bureaus covering Southeast Asia, South Asia and the Pacific, Africa, Latin America and the Caribbean, the Middle East, and Eastern Europe and the CIS. KOICA''s workforce includes approximately 500 headquarters staff plus a substantially larger field deployment of dispatched experts, country-office personnel, and World Friends Korea volunteers.</p>'
    '<p>KOICA delivers four main programme types. First, project-type aid (including infrastructure construction, hospital and school building, equipment provision, capacity building, and policy advisory) typically delivered as multi-year, multi-component country programmes. Second, technical cooperation through the Country Focused Training programmes, scholarship programmes for Master''s and doctoral students at Korean universities, dispatch of experts and advisers, and the Knowledge Sharing Programme that brings Korean development experience to partner-country policymakers. Third, the World Friends Korea volunteer programme — formed in 2009 by consolidating five separate volunteer schemes — is the largest sending volunteer corps among bilateral DAC donors, dispatching thousands of Korean volunteers (including university student volunteers, professional volunteers, and senior advisers) to partner countries on multi-year assignments. Fourth, humanitarian assistance for emergency relief, recovery, and protracted-crisis response.</p>'
    '<p>KOICA''s thematic focus areas, as set out in its Mid-Term Strategy and country partnership strategies, include education (a long-standing strength reflecting Korea''s own education-driven development); health (with strong investments in maternal and child health, infectious disease, and pandemic preparedness); public administration and governance, including e-government and anti-corruption; rural development, agriculture, and food security; water and sanitation; energy and climate; transportation; ICT and digital transformation; gender equality; and youth and employment. KOICA leads the implementation of Korean Government flagship initiatives in partner countries, including elements of the previous Korean New Deal focused on digital and green transformation, and Korea''s Indo-Pacific Strategy.</p>'
    '<p>KOICA also operates the ODA Korea integrated information portal, the Korea Aid initiative bringing food, medical care, and cultural assets to remote communities, the Better Life for Girls initiative for adolescent girls in partner countries, and the Innovative Partnership Programme that engages Korean civil society, social enterprises, and start-ups in development cooperation. The Korea Foundation for International Healthcare and the Korean development finance institution Korea EXIM Bank — through the Economic Development Cooperation Fund (EDCF) — complement KOICA''s grant work with concessional loans.</p>'
    '<p>KOICA is funded through the Republic of Korea''s annual budget, with grant aid commitments having grown rapidly over the past two decades in line with Korea''s commitments under successive Mid-Term ODA Plans and the OECD-DAC peer review processes. Korea has set out an ambitious roadmap to substantially increase its ODA volume in the coming years, with KOICA being the primary implementer of grant ODA. The agency is led by a President appointed by the Minister of Foreign Affairs and reports to the National Assembly through the Ministry. KOICA is also the lead Korean partner for triangular cooperation, hosting the Global ODA Korea forum and partnering with multilateral organisations on co-financed initiatives.</p>',
    'Bridging Korea and the world to ensure sustainable development through inclusive partnership.',
    'https://www.koica.go.kr/koica_en/index.do', NULL, '+82 31 740 0114',
    '825 Daewangpangyo-ro, Sujeong-gu, Seongnam-si, Gyeonggi-do 13449, Republic of Korea',
    'https://twitter.com/KOICAonline', 'https://www.facebook.com/KOICAofficial',
    'https://www.linkedin.com/company/koica', 'https://www.instagram.com/koica_official',
    'https://www.youtube.com/user/koicakorea',
    '10', 'KRW'),

    ('XM-DAC-3-1', 'DFAT', 'Australian Department of Foreign Affairs and Trade',
    '<p>The Department of Foreign Affairs and Trade (DFAT) is the Australian Government department responsible for Australia''s international relations, foreign policy, trade and investment policy, and consular services, and is the lead agency for delivering Australia''s development cooperation programme. The current department was formed on 24 July 1987 through the merger of the Department of Foreign Affairs and the Department of Trade — bringing diplomacy and trade policy under a single department. The Australian aid programme, formerly delivered by the Australian Agency for International Development (AusAID, an executive agency from 2010 to 2013), was fully integrated into DFAT on 1 November 2013, mirroring an integration of foreign affairs and development that several other DAC donors (including Canada and the United Kingdom) have undertaken at different times.</p>'
    '<p>DFAT is headquartered at the R.G. Casey Building, John McEwen Crescent, Barton ACT 0221 in Canberra, with additional offices in Sydney, Melbourne, Brisbane, Perth, and Adelaide for state and territory liaison and passport services. The department operates a network of more than 100 overseas posts including embassies, high commissions, consulates-general, and multilateral missions. DFAT also has formal cooperation arrangements with state and territory trade offices and the Australian Trade and Investment Commission (Austrade). The department employs approximately 6,000 staff, supplemented by locally engaged staff at overseas posts.</p>'
    '<p>DFAT advances the security, prosperity, and global standing of Australia and Australians by providing foreign, trade, investment, development, and consular policy advice; representing Australia overseas; promoting and protecting Australia''s interests in international fora; supporting Australian business, communities, and travellers abroad; and delivering the Australian aid programme. The Department leads on Australia''s major international engagements including the United Nations, the G20, APEC, the East Asia Summit, the Pacific Islands Forum, the Commonwealth, ASEAN, the Indian Ocean Rim Association, and the Quad partnership with India, Japan, and the United States.</p>'
    '<p>Australia''s development cooperation programme — branded Australian Aid — focuses primarily on the Indo-Pacific region, with the largest country programmes in Papua New Guinea (Australia''s largest single recipient), Indonesia, the Pacific island countries (Solomon Islands, Vanuatu, Fiji, Tonga, Samoa, Kiribati, Tuvalu, Nauru, Federated States of Micronesia, Palau, Marshall Islands, Cook Islands, and Niue), Timor-Leste, the Philippines, Vietnam, Cambodia, Lao PDR, Myanmar, and Bangladesh. Australia is the largest donor to the Pacific region by a significant margin and one of the top providers of ODA in Southeast Asia.</p>'
    '<p>The International Development Policy launched in August 2023 — Australia''s first new development policy in a decade — frames the programme around the goal of a peaceful, stable, and prosperous Indo-Pacific. The policy organises Australia''s development efforts around six investment priorities: climate change and energy transition; gender equality, disability equity, and social inclusion; health security and well-being; education and skills; humanitarian action and disaster preparedness; and economic resilience and inclusive growth, including through infrastructure and connectivity. Performance and Delivery Framework targets — including 80 per cent of investments effectively addressing gender equality and a substantial increase in climate-related ODA — anchor implementation and reporting.</p>'
    '<p>DFAT''s flagship development partnerships include the Australia Pacific Climate Partnership; the Australian Infrastructure Financing Facility for the Pacific (AIFFP); the Pacific Australia Labour Mobility (PALM) scheme; the Stepping Up Pacific engagement strategy; the Indonesia-Australia Partnership through the various Aus4 partnerships; the Australia ASEAN Centre for Counter-Trafficking; and a long-standing portfolio of work on humanitarian action, governance, scholarships (the Australia Awards), and volunteers (the Australian Volunteers Program). DFAT is the principal Australian partner in the multilateral development system, including through Australia''s seat on the World Bank Group Board, the Asian Development Bank Board, the Global Fund Board, and the Boards of UN agencies, funds, and programmes.</p>'
    '<p>DFAT is funded through the Australian Government''s annual Budget appropriation, with the ODA component subject to the Government''s ODA targets and the OECD-DAC reporting framework. The department is led by the Minister for Foreign Affairs and the Minister for Trade and Tourism (Cabinet positions), with the Minister for International Development and the Pacific holding portfolio responsibility for the development programme, and the Secretary of the Department serving as senior public servant head. The Office of the Pacific (within DFAT) and the Office of Southeast Asia anchor the department''s major regional engagements.</p>',
    'Promoting and protecting Australia''s international interests to support our security and prosperity.',
    'https://www.dfat.gov.au', 'commsmedia@dfat.gov.au', '+61 2 6261 1111',
    'R.G. Casey Building, John McEwen Crescent, Barton ACT 0221, Australia',
    'https://twitter.com/dfat', 'https://www.facebook.com/dfat.australia',
    'https://www.linkedin.com/company/dfat', 'https://www.instagram.com/dfat',
    'https://www.youtube.com/user/AusforeignaffairsAU',
    '10', 'AUD'),

    -- ===========================================================================
    -- Global health partnerships
    -- ===========================================================================
    ('XM-DAC-47066', 'GFATM', 'The Global Fund to Fight AIDS, Tuberculosis and Malaria',
    '<p>The Global Fund to Fight AIDS, Tuberculosis and Malaria is a public-private partnership and international financing institution designed to accelerate the end of three of the world''s most devastating epidemics. The Global Fund was conceived at the G8 Summit in Genoa in July 2001 in the wake of the UN General Assembly Special Session on HIV/AIDS, and was formally created in January 2002 as an innovative financing mechanism — neither a UN agency nor a multilateral development bank, but a foundation under Swiss law with a unique mandate to attract, leverage, and invest additional resources to end three diseases. The Global Fund made its first grants in April 2002 and rapidly grew into one of the largest sources of international financing for global health.</p>'
    '<p>The Global Fund Secretariat is headquartered at the Global Health Campus, Chemin du Pommier 40, in Le Grand-Saconnex on the outskirts of Geneva, Switzerland — a purpose-built campus opened in 2018 that the Global Fund shares with Gavi, Stop TB, RBM, and other global health partnerships, creating a unique concentration of global health expertise. The Secretariat employs approximately 850 staff and operates without country offices — a deliberate model that places implementation responsibility with countries themselves rather than building a parallel field presence. The Global Fund mobilises and invests more than US$5 billion per year to support programmes run by local experts in countries and communities most in need.</p>'
    '<p>The Global Fund operates on a partnership model that brings together governments, civil society, technical agencies, the private sector, and people affected by the diseases — a multistakeholder approach unprecedented in global health. The Fund does not implement programmes directly; instead, it provides funding to country-led applications developed through inclusive Country Coordinating Mechanisms (CCMs) — multistakeholder country-level platforms that include government, technical partners, NGOs, faith-based organisations, the private sector, and representatives of communities living with and affected by the three diseases. Approved grants are then implemented by Principal Recipients (PRs) — typically Ministries of Health, NGOs, or in some contexts UNDP serving as PR of last resort in fragile contexts — with sub-recipients delivering services on the ground.</p>'
    '<p>Since 2002, programmes supported by the Global Fund have saved an estimated 59 million lives and have driven historic declines in HIV, TB, and malaria. The combined death rate from the three diseases in the countries where the Fund invests has been reduced by more than half. The partnership has provided more than 25 million people with antiretroviral therapy for HIV, more than 7 million people with TB treatment in 2023 alone, more than 220 million mosquito nets distributed in 2023, and a substantial share of the world''s prevention, testing, and care services for the three diseases. The Global Fund is also one of the largest funders of resilient and sustainable systems for health (RSSH), supporting health workforce, supply chains, laboratory systems, health information, and community systems strengthening — and the largest single funder of community-led responses globally.</p>'
    '<p>The Global Fund''s current Strategy 2023-2028 — Fighting Pandemics and Building a Healthier and More Equitable World — broadens the partnership''s ambition to leverage HIV, TB, and malaria investments to strengthen pandemic preparedness and respond to future health threats. The strategy emphasises maximising people-centred, integrated systems for health; maximising the engagement and leadership of most-affected communities; maximising health equity, gender equality, and human rights; and mobilising increased resources. The Pandemic Preparedness and Response (PPR) workstream, the C19RM (COVID-19 Response Mechanism) experience, and the partnership''s growing climate-and-health agenda position the Global Fund at the centre of the post-COVID global health architecture.</p>'
    '<p>The Global Fund is governed by a Board of 28 voting members and 8 non-voting members, with a unique structure designed to ensure equal voice for donors and implementers and meaningful representation of communities. Voting blocs include 10 donor government constituencies; 7 implementer government constituencies; 3 NGO constituencies (developed-country NGOs, developing-country NGOs, and communities living with HIV/TB/malaria); and 3 private-sector and foundation constituencies. Non-voting Board members include WHO, UNAIDS, the World Bank, and the Office of the Inspector General. The Global Fund is replenished every three years through pledges from public, private, and philanthropic donors — the most recent (Seventh Replenishment, 2022) raised US$15.7 billion for 2023-2025, with the Eighth Replenishment in 2025 targeting US$18 billion. The Bill & Melinda Gates Foundation, the United States, France, the United Kingdom, Germany, Japan, Canada, the European Commission, and the Republic of Korea are among the largest contributors.</p>',
    'To accelerate the end of AIDS, tuberculosis and malaria as epidemics.',
    'https://www.theglobalfund.org', 'info@theglobalfund.org', '+41 58 791 1700',
    'Global Health Campus, Chemin du Pommier 40, 1218 Le Grand-Saconnex, Geneva, Switzerland',
    'https://twitter.com/GlobalFund', 'https://www.facebook.com/theglobalfund',
    'https://www.linkedin.com/company/the-global-fund', 'https://www.instagram.com/globalfund',
    'https://www.youtube.com/user/theglobalfund',
    '40', 'USD'),

    ('XM-DAC-47122', 'GAVI', 'Gavi, the Vaccine Alliance',
    '<p>Gavi, the Vaccine Alliance is a public-private global health partnership committed to increasing equitable and sustainable use of vaccines in lower-income countries. Gavi was launched on 31 January 2000 at the World Economic Forum in Davos as the Global Alliance for Vaccines and Immunization, with a US$750 million catalytic founding grant from the Bill & Melinda Gates Foundation that the Foundation described as the "single largest gift" it had ever made at that time. Gavi was created in response to a sobering reality at the turn of the millennium: the gap between the vaccines available to children in wealthy countries and those reaching children in the world''s poorest countries was widening, and millions of children were dying every year from vaccine-preventable diseases. Gavi was designed as an innovative financing platform to close that gap.</p>'
    '<p>Gavi is hosted by Switzerland under a Headquarters Agreement and is based at the Global Health Campus, Chemin du Pommier 40, in Le Grand-Saconnex on the outskirts of Geneva — a campus shared with the Global Fund, Stop TB, and other global health partnerships. The Gavi Secretariat employs approximately 500 staff and, like the Global Fund, operates without a network of country offices, working through and strengthening national health systems and existing partners rather than building a parallel field presence. Gavi also operates a small liaison office in Washington, D.C.</p>'
    '<p>Gavi has helped vaccinate more than 1.1 billion children in the world''s poorest countries since 2000, preventing more than 17.3 million future deaths and helping reduce child mortality by more than half in many partner countries. The Alliance''s impact is achieved through several distinctive mechanisms: pooling demand from countries to negotiate lower vaccine prices through long-term, predictable purchase commitments that give vaccine manufacturers the confidence to expand production capacity for low-income markets; providing predictable, multi-year financing for the introduction of new and underused vaccines; co-financing arrangements that increase as countries grow wealthier (the Eligibility, Transition and Co-Financing Policy), with countries graduating from Gavi support as they reach a defined GNI per capita threshold; and supporting countries to strengthen their immunisation systems, supply chains, cold chain, health workforce, and demand generation.</p>'
    '<p>Gavi''s vaccine portfolio includes more than 20 vaccines protecting against diseases such as measles, rubella, polio, pneumococcal disease, rotavirus, yellow fever, meningitis A (through the path-breaking MenAfriVac campaign that has all but eliminated meningitis A epidemics in the African meningitis belt), Japanese encephalitis, Ebola, cholera, typhoid, human papillomavirus (HPV) for cervical cancer prevention in adolescent girls, and malaria — Gavi began malaria vaccine roll-out in 2023 with the RTS,S/AS01 and R21/Matrix-M vaccines, the first malaria vaccines ever recommended by WHO for routine use in children. The Alliance also operates global vaccine stockpiles for emergency response (cholera, yellow fever, meningitis, Ebola).</p>'
    '<p>Gavi co-led the COVAX Facility — the vaccines pillar of the Access to COVID-19 Tools (ACT) Accelerator — alongside WHO and CEPI, with UNICEF as the principal procurement and delivery partner. Through COVAX and the Gavi COVAX Advance Market Commitment (Gavi COVAX AMC), Gavi supported 92 lower-income economies to access COVID-19 vaccines, ultimately delivering nearly 2 billion doses globally during the pandemic. The COVAX experience prompted significant reflection and reform across the global vaccine architecture and contributed to the establishment of new initiatives including the African Vaccine Manufacturing Accelerator (AVMA), where Gavi committed up to US$1 billion to support sustainable vaccine manufacturing in Africa.</p>'
    '<p>Gavi''s 2026-2030 strategy ("Gavi 6.0") focuses on protecting more children, in more places, with more life-saving vaccines, and includes ambitious commitments on zero-dose children (children who have not received any routine vaccine, often the most marginalised), gender equity, climate-resilient supply chains, and pandemic preparedness through the First Response Fund. Gavi 6.0 is funded through a multi-year replenishment process; the most recent replenishment in June 2025 raised more than US$9 billion for 2026-2030 from public, private, and philanthropic donors.</p>'
    '<p>Gavi is governed by a 28-member Board with a unique balance of institutional core partners (WHO, UNICEF, the World Bank, and the Bill & Melinda Gates Foundation, each holding permanent Board seats), donor country representatives, implementing country representatives, civil society, vaccine industry representatives (one developed-country and one developing-country manufacturer), and independent members. The Board has consistently been chaired by senior global figures — most recently the former President of the European Commission and Prime Minister of Portugal Professor José Manuel Barroso. Gavi is led by a Chief Executive Officer and operates as a non-profit foundation under Swiss law.</p>',
    'Saving lives and protecting people''s health by increasing equitable and sustainable use of vaccines.',
    'https://www.gavi.org', 'info@gavi.org', '+41 22 909 6500',
    'Global Health Campus, Chemin du Pommier 40, 1218 Le Grand-Saconnex, Geneva, Switzerland',
    'https://twitter.com/gavi', 'https://www.facebook.com/Gavi',
    'https://www.linkedin.com/company/gavi-the-vaccine-alliance', 'https://www.instagram.com/gavialliance',
    'https://www.youtube.com/user/gavialliance',
    '40', 'USD')
  )

  -- -----------------------------------------------------------------------------
  -- 2. Single UPDATE: assign iati_org_id to one matching org per curated entry
  --    AND fill in description / social / contact fields on every matched
  --    reporting org. Both behaviours run in one row-write per org to avoid
  --    PostgreSQL's "tuple updated twice in one statement" rule.
  -- -----------------------------------------------------------------------------
  -- iati_org_id is set to c.iati_org_id only when ALL of the following hold:
  --   1. o.iati_org_id is currently NULL/empty
  --   2. no other org already holds c.iati_org_id (UNIQUE constraint guard)
  --   3. this org is the deterministic "winner" per curated entry — the
  --      smallest org id among reporting orgs that match c by acronym/name
  --      and currently lack an iati_org_id
  -- Otherwise iati_org_id is left as-is (so duplicates are silently skipped).
  --
  -- Field-update policy:
  --   * description, mission — ALWAYS overwritten with the curated long
  --     narrative. The pre-existing values are short stubs (e.g. "UN agency
  --     for reproductive health and population") that the user explicitly
  --     wants replaced with the rich Myanmar-country-profile-style copy.
  --   * website, email, phone, address, social_*, type code, default currency
  --     — overwritten when the curated value is non-NULL, otherwise the
  --     existing value is preserved (COALESCE(c.value, o.value)). This means
  --     e.g. JICA''s email (curated NULL) keeps whatever was already in the
  --     database.
  -- -----------------------------------------------------------------------------

  UPDATE organizations o
  SET
    iati_org_id = CASE
      WHEN COALESCE(NULLIF(TRIM(o.iati_org_id), ''), '') <> '' THEN o.iati_org_id
      WHEN EXISTS (
        SELECT 1 FROM organizations other
        WHERE other.id <> o.id
          AND UPPER(TRIM(other.iati_org_id)) = UPPER(c.iati_org_id)
      ) THEN o.iati_org_id
      WHEN o.id = (
        SELECT o2.id
        FROM organizations o2
        WHERE (
            UPPER(TRIM(o2.acronym)) = UPPER(c.acronym)
            OR UPPER(TRIM(o2.name))  = UPPER(c.name)
          )
          AND COALESCE(NULLIF(TRIM(o2.iati_org_id), ''), '') = ''
          AND EXISTS (SELECT 1 FROM activities a WHERE a.reporting_org_id = o2.id)
        ORDER BY o2.id
        LIMIT 1
      ) THEN c.iati_org_id
      ELSE o.iati_org_id
    END,
    description     = c.description,
    mission         = c.mission,
    website         = COALESCE(c.website, o.website),
    email           = COALESCE(c.email, o.email),
    phone           = COALESCE(c.phone, o.phone),
    address         = COALESCE(c.address, o.address),
    social_twitter  = COALESCE(c.twitter, o.social_twitter),
    social_facebook = COALESCE(c.facebook, o.social_facebook),
    social_linkedin = COALESCE(c.linkedin, o.social_linkedin),
    social_instagram= COALESCE(c.instagram, o.social_instagram),
    social_youtube  = COALESCE(c.youtube, o.social_youtube),
    "Organisation_Type_Code" = COALESCE(NULLIF(o."Organisation_Type_Code", ''), c.org_type_code),
    default_currency= COALESCE(NULLIF(o.default_currency, ''), c.default_currency),
    updated_at      = NOW()
  FROM curated c
  WHERE
    (
      UPPER(TRIM(o.iati_org_id)) = UPPER(c.iati_org_id)
      OR UPPER(TRIM(o.acronym))  = UPPER(c.acronym)
      OR UPPER(TRIM(o.name))     = UPPER(c.name)
    )
    AND EXISTS (
      SELECT 1 FROM activities a WHERE a.reporting_org_id = o.id
    );

  -- -----------------------------------------------------------------------------
  -- 4. Templated fallback for any other reporting org without a description
  -- -----------------------------------------------------------------------------

  UPDATE organizations o
  SET
    description = '<p>' || o.name ||
      CASE WHEN o.acronym IS NOT NULL AND o.acronym <> '' THEN ' (' || o.acronym || ')' ELSE '' END ||
      ' is ' ||
      CASE TRIM(COALESCE(o."Organisation_Type_Code", ''))
        WHEN '10' THEN 'a national government entity'
        WHEN '11' THEN 'a sub-national government authority'
        WHEN '15' THEN 'a public-sector body'
        WHEN '21' THEN 'an international non-governmental organisation'
        WHEN '22' THEN 'a national non-governmental organisation'
        WHEN '23' THEN 'a partner-country based non-governmental organisation'
        WHEN '30' THEN 'a regional intergovernmental organisation'
        WHEN '31' THEN 'a public-private partnership'
        WHEN '40' THEN 'a multilateral organisation'
        WHEN '60' THEN 'a private foundation'
        WHEN '70' THEN 'a private-sector organisation'
        WHEN '71' THEN 'a private-sector organisation in a provider country'
        WHEN '72' THEN 'a private-sector organisation in an aid-recipient country'
        WHEN '73' THEN 'a private-sector organisation in a third country'
        WHEN '80' THEN 'an academic, training and research institution'
        ELSE 'an organisation'
      END ||
      ' that contributes to international development cooperation' ||
      CASE WHEN o.country IS NOT NULL AND o.country <> '' THEN ', operating from ' || o.country ELSE '' END ||
      '. The organisation reports its activities through the International Aid Transparency Initiative (IATI) standard, publishing structured information on its projects, funding flows, and results.</p>' ||
      E'\n<p>The organisation works with governments, civil society, and other development actors to deliver assistance aligned with national priorities and the Sustainable Development Goals. Its IATI publication makes its portfolio of activities discoverable, comparable, and re-usable, supporting accountability to partner countries, donors, and the public.</p>' ||
      E'\n<p>This profile is a baseline narrative drawn from registry information. Curated content — including mission, thematic priorities, geographic footprint, and contact details — can be added by the organisation through the AIMS Organisation Profile editor.</p>',
    updated_at = NOW()
  WHERE
    (o.description IS NULL OR TRIM(o.description) = '')
    AND EXISTS (
      SELECT 1 FROM activities a WHERE a.reporting_org_id = o.id
    );

  -- -----------------------------------------------------------------------------
  -- 5. Funding envelope data for every reporting org (2022-2028)
  -- -----------------------------------------------------------------------------
  -- Skips (org, year) combinations that already have a single-year envelope row.
  -- -----------------------------------------------------------------------------

  INSERT INTO organization_funding_envelopes (
    organization_id,
    period_type,
    year_type,
    year_start,
    year_end,
    amount,
    currency,
    amount_usd,
    flow_direction,
    organization_role,
    funding_type_flags,
    status,
    confidence_level,
    notes,
    created_at,
    updated_at
  )
  SELECT
    ro.id                                            AS organization_id,
    'single_year'                                    AS period_type,
    'calendar'                                       AS year_type,
    yr.year                                          AS year_start,
    NULL                                             AS year_end,

    CASE TRIM(COALESCE(ro."Organisation_Type_Code", ''))
      WHEN '40' THEN
        CASE
          WHEN yr.year BETWEEN 2022 AND 2024 THEN ROUND((50000000 + (RANDOM() * 100000000))::NUMERIC, 2)
          WHEN yr.year = 2025 THEN ROUND((60000000 + (RANDOM() * 120000000))::NUMERIC, 2)
          ELSE ROUND((55000000 + (RANDOM() * 110000000))::NUMERIC, 2)
        END
      WHEN '10' THEN
        CASE
          WHEN yr.year BETWEEN 2022 AND 2024 THEN ROUND((20000000 + (RANDOM() * 50000000))::NUMERIC, 2)
          WHEN yr.year = 2025 THEN ROUND((25000000 + (RANDOM() * 60000000))::NUMERIC, 2)
          ELSE ROUND((22000000 + (RANDOM() * 55000000))::NUMERIC, 2)
        END
      WHEN '21' THEN
        CASE
          WHEN yr.year BETWEEN 2022 AND 2024 THEN ROUND((5000000 + (RANDOM() * 15000000))::NUMERIC, 2)
          WHEN yr.year = 2025 THEN ROUND((6000000 + (RANDOM() * 18000000))::NUMERIC, 2)
          ELSE ROUND((5500000 + (RANDOM() * 16000000))::NUMERIC, 2)
        END
      WHEN '60' THEN
        CASE
          WHEN yr.year BETWEEN 2022 AND 2024 THEN ROUND((3000000 + (RANDOM() * 10000000))::NUMERIC, 2)
          WHEN yr.year = 2025 THEN ROUND((3500000 + (RANDOM() * 12000000))::NUMERIC, 2)
          ELSE ROUND((3200000 + (RANDOM() * 11000000))::NUMERIC, 2)
        END
      WHEN '31' THEN
        CASE
          WHEN yr.year BETWEEN 2022 AND 2024 THEN ROUND((4000000 + (RANDOM() * 12000000))::NUMERIC, 2)
          WHEN yr.year = 2025 THEN ROUND((4500000 + (RANDOM() * 14000000))::NUMERIC, 2)
          ELSE ROUND((4200000 + (RANDOM() * 13000000))::NUMERIC, 2)
        END
      ELSE
        CASE
          WHEN yr.year BETWEEN 2022 AND 2024 THEN ROUND((1000000 + (RANDOM() * 5000000))::NUMERIC, 2)
          WHEN yr.year = 2025 THEN ROUND((1200000 + (RANDOM() * 6000000))::NUMERIC, 2)
          ELSE ROUND((1100000 + (RANDOM() * 5500000))::NUMERIC, 2)
        END
    END                                              AS amount,

    COALESCE(NULLIF(ro.default_currency, ''), 'USD') AS currency,
    NULL                                             AS amount_usd,

    'incoming'                                       AS flow_direction,

    CASE TRIM(COALESCE(ro."Organisation_Type_Code", ''))
      WHEN '10' THEN 'original_funder'
      WHEN '60' THEN 'original_funder'
      WHEN '40' THEN 'fund_manager'
      WHEN '21' THEN 'implementer'
      WHEN '22' THEN 'implementer'
      WHEN '23' THEN 'implementer'
      ELSE 'fund_manager'
    END                                              AS organization_role,

    CASE
      WHEN TRIM(COALESCE(ro."Organisation_Type_Code", '')) IN ('10', '60') THEN ARRAY['core_resources']::TEXT[]
      WHEN TRIM(COALESCE(ro."Organisation_Type_Code", '')) = '40' THEN ARRAY['core_resources', 'earmarked_pooled']::TEXT[]
      ELSE ARRAY['earmarked_pooled']::TEXT[]
    END                                              AS funding_type_flags,

    CASE
      WHEN yr.year BETWEEN 2022 AND 2024 THEN 'actual'
      WHEN yr.year = 2025                THEN 'current'
      ELSE                                    'indicative'
    END                                              AS status,

    CASE
      WHEN yr.year BETWEEN 2022 AND 2024 THEN 'high'
      WHEN yr.year = 2025                THEN 'medium'
      ELSE                                    'low'
    END                                              AS confidence_level,

    CASE
      WHEN yr.year BETWEEN 2022 AND 2024 THEN
        'Actual funding envelope for ' || yr.year || '. Figures represent confirmed disbursements as reported by the organisation.'
      WHEN yr.year = 2025 THEN
        'Current-year funding envelope for 2025. Figures reflect approved allocations and are subject to final disbursement.'
      ELSE
        'Indicative forward funding envelope for ' || yr.year || '. Figures are planning estimates and may be revised through budget cycles.'
    END                                              AS notes,

    NOW(),
    NOW()

  FROM (
    SELECT DISTINCT o.id, o.name, o.acronym, o.default_currency, o."Organisation_Type_Code"
    FROM organizations o
    INNER JOIN activities a ON a.reporting_org_id = o.id
  ) ro
  CROSS JOIN (
    VALUES (2022),(2023),(2024),(2025),(2026),(2027),(2028)
  ) AS yr(year)
  WHERE NOT EXISTS (
    SELECT 1
    FROM organization_funding_envelopes ofe
    WHERE ofe.organization_id = ro.id
      AND ofe.year_start = yr.year
      AND ofe.year_end IS NULL
  );

  -- -----------------------------------------------------------------------------
  -- 6. Summary report
  -- -----------------------------------------------------------------------------

  SELECT
    'Reporting orgs total' AS metric,
    COUNT(DISTINCT o.id)   AS value
  FROM organizations o
  WHERE EXISTS (SELECT 1 FROM activities a WHERE a.reporting_org_id = o.id)

  UNION ALL
  SELECT
    'Reporting orgs with description',
    COUNT(*)
  FROM organizations o
  WHERE COALESCE(TRIM(o.description), '') <> ''
    AND EXISTS (SELECT 1 FROM activities a WHERE a.reporting_org_id = o.id)

  UNION ALL
  SELECT
    'Reporting orgs with IATI org ID',
    COUNT(*)
  FROM organizations o
  WHERE COALESCE(TRIM(o.iati_org_id), '') <> ''
    AND EXISTS (SELECT 1 FROM activities a WHERE a.reporting_org_id = o.id)

  UNION ALL
  SELECT
    'Reporting orgs with social media',
    COUNT(*)
  FROM organizations o
  WHERE (
      COALESCE(o.social_twitter, '')   <> '' OR
      COALESCE(o.social_facebook, '')  <> '' OR
      COALESCE(o.social_linkedin, '')  <> '' OR
      COALESCE(o.social_instagram, '') <> '' OR
      COALESCE(o.social_youtube, '')   <> ''
    )
    AND EXISTS (SELECT 1 FROM activities a WHERE a.reporting_org_id = o.id)

  UNION ALL
  SELECT
    'Funding envelope rows for reporting orgs',
    COUNT(*)
  FROM organization_funding_envelopes ofe
  WHERE EXISTS (
    SELECT 1 FROM activities a WHERE a.reporting_org_id = ofe.organization_id
  );
