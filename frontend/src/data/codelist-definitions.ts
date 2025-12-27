// IATI/DAC Codelist Definitions
// Authoritative source for tooltip content across the app
// Based on official IATI/DAC reference data

export interface CodelistDefinition {
  code: string;
  name: string;
  definition: [string, string]; // Two-line definition as per IATI/DAC standards
}

// Default Aid Type Definitions
export const AID_TYPE_DEFINITIONS: Record<string, CodelistDefinition> = {
  'A01': {
    code: 'A01',
    name: 'General budget support',
    definition: [
      'Funding paid directly into a government\'s central budget.',
      'Managed using national budget and public financial management systems.'
    ]
  },
  'A02': {
    code: 'A02',
    name: 'Sector budget support',
    definition: [
      'Funding paid into a government budget for a specific sector.',
      'Uses national systems, with policy dialogue focused on that sector.'
    ]
  },
  'B01': {
    code: 'B01',
    name: 'Core support to NGOs, private bodies, PPPs, research institutes',
    definition: [
      'Flexible funding provided to organisations for their overall work.',
      'Not earmarked to a specific project or activity.'
    ]
  },
  'B02': {
    code: 'B02',
    name: 'Core contributions to multilateral institutions and global funds',
    definition: [
      'Unrestricted funding pooled by multilateral organisations.',
      'Funds lose donor identity and support overall institutional programmes.'
    ]
  },
  'B021': {
    code: 'B021',
    name: 'Core contributions to multilateral institutions',
    definition: [
      'Core funding pooled within a multilateral organisation.',
      'Used across its full mandate and operations.'
    ]
  },
  'B022': {
    code: 'B022',
    name: 'Core contributions to global funds',
    definition: [
      'Core funding to recognised global or inter-agency pooled funds.',
      'Managed collectively and not earmarked by donor.'
    ]
  },
  'B03': {
    code: 'B03',
    name: 'Contributions to specific-purpose programmes and funds',
    definition: [
      'Earmarked funding for defined thematic or geographic programmes.',
      'Managed by partner organisations outside core budgets.'
    ]
  },
  'B031': {
    code: 'B031',
    name: 'Multi-donor, multi-entity funding mechanisms',
    definition: [
      'Pooled funding from multiple donors and implementers.',
      'Resources allocated across several organisations.'
    ]
  },
  'B032': {
    code: 'B032',
    name: 'Multi-donor, single-entity funding mechanisms',
    definition: [
      'Pooled funding managed by one organisation.',
      'Supported by multiple donors for a specific purpose.'
    ]
  },
  'B033': {
    code: 'B033',
    name: 'Single-donor or tightly earmarked funding mechanisms',
    definition: [
      'Funding where the donor retains strong allocation control.',
      'Often earmarked to specific countries or funding windows.'
    ]
  },
  'B04': {
    code: 'B04',
    name: 'Basket funds / pooled funding',
    definition: [
      'Joint donor and recipient funding with shared governance.',
      'Uses common reporting, disbursement, and accountability systems.'
    ]
  },
  'C01': {
    code: 'C01',
    name: 'Project-type interventions',
    definition: [
      'Time-bound activities with defined objectives, budget, and location.',
      'Includes programmes, projects, evaluations, and feasibility studies.'
    ]
  },
  'D01': {
    code: 'D01',
    name: 'Donor country personnel',
    definition: [
      'Costs for experts, consultants, or volunteers provided by donors.',
      'Includes salaries, fees, and deployment costs.'
    ]
  },
  'D02': {
    code: 'D02',
    name: 'Other technical assistance',
    definition: [
      'Training, research, studies, or advisory support outside projects.',
      'Excludes donor personnel and scholarships in donor countries.'
    ]
  },
  'E01': {
    code: 'E01',
    name: 'Scholarships and training in donor country',
    definition: [
      'Financial support for students or trainees studying abroad.',
      'Includes tuition, stipends, and training-related costs.'
    ]
  },
  'E02': {
    code: 'E02',
    name: 'Imputed student costs',
    definition: [
      'Estimated public cost of educating foreign students.',
      'Calculated rather than directly transferred funds.'
    ]
  },
  'F01': {
    code: 'F01',
    name: 'Debt relief',
    definition: [
      'Cancellation or restructuring of existing debt obligations.',
      'Includes forgiveness, swaps, and rescheduling.'
    ]
  },
  'G01': {
    code: 'G01',
    name: 'Administrative costs',
    definition: [
      'Donor administrative expenses for managing aid programmes.',
      'Excludes implementation and expert deployment costs.'
    ]
  },
  'H01': {
    code: 'H01',
    name: 'Development awareness',
    definition: [
      'Activities to raise public understanding of development issues.',
      'Conducted in the donor country.'
    ]
  },
  'H02': {
    code: 'H02',
    name: 'Refugees and asylum seekers in donor countries',
    definition: [
      'Short-term basic assistance for refugees and asylum seekers.',
      'Covers costs up to 12 months.'
    ]
  },
  'H03': {
    code: 'H03',
    name: 'Asylum seekers ultimately accepted',
    definition: [
      'Pre-recognition support for asylum seekers later granted status.',
      'Includes costs before official recognition.'
    ]
  },
  'H04': {
    code: 'H04',
    name: 'Asylum seekers ultimately rejected',
    definition: [
      'Pre-decision support for asylum seekers later rejected.',
      'Includes costs incurred before rejection.'
    ]
  },
  'H05': {
    code: 'H05',
    name: 'Recognised refugees',
    definition: [
      'Post-recognition support for refugees in donor countries.',
      'Includes assistance after legal status is granted.'
    ]
  },
  'H06': {
    code: 'H06',
    name: 'Refugees and asylum seekers in other provider countries',
    definition: [
      'Assistance costs incurred outside the donor country.',
      'Applies to refugees and asylum seekers from developing countries.'
    ]
  }
};

// Default Finance Type Definitions
export const FINANCE_TYPE_DEFINITIONS: Record<string, CodelistDefinition> = {
  '110': {
    code: '110',
    name: 'Grant',
    definition: [
      'Non-repayable funding provided in cash or in kind.',
      'No legal debt is incurred by the recipient.'
    ]
  },
  '421': {
    code: '421',
    name: 'Standard loan',
    definition: [
      'Repayable funding with legally binding repayment terms.',
      'Classified as senior debt.'
    ]
  },
  '422': {
    code: '422',
    name: 'Reimbursable grant',
    definition: [
      'Funding expected to generate repayments if successful.',
      'Provider bears the risk of investment failure.'
    ]
  },
  '423': {
    code: '423',
    name: 'Bonds',
    definition: [
      'Tradable fixed-interest debt instruments.',
      'Issued by governments or institutions.'
    ]
  },
  '424': {
    code: '424',
    name: 'Asset-backed securities',
    definition: [
      'Debt securities backed by specific underlying assets.',
      'Payments depend on asset performance.'
    ]
  },
  '431': {
    code: '431',
    name: 'Subordinated loan',
    definition: [
      'Loan repaid after senior creditors in default.',
      'Carries higher risk and return.'
    ]
  },
  '432': {
    code: '432',
    name: 'Preferred equity',
    definition: [
      'Equity with priority over common shares.',
      'Ranks below debt in repayment order.'
    ]
  },
  '510': {
    code: '510',
    name: 'Common equity',
    definition: [
      'Ownership stake with residual claim on assets.',
      'Returns depend on enterprise performance.'
    ]
  },
  '520': {
    code: '520',
    name: 'Shares in collective investment vehicles',
    definition: [
      'Investments in pooled funds holding multiple assets.',
      'Can include financial or non-financial assets.'
    ]
  },
  '530': {
    code: '530',
    name: 'Reinvested earnings',
    definition: [
      'Retained profits from foreign direct investment.',
      'Treated as reinvested capital flows.'
    ]
  },
  '610': {
    code: '610',
    name: 'Debt forgiveness: ODA claims (P)',
    definition: [
      'Actions modifying or cancelling debt obligations.',
      'Includes ODA, OOF, and private claims.'
    ]
  },
  '611': {
    code: '611',
    name: 'Debt forgiveness: ODA claims (I)',
    definition: [
      'Actions modifying or cancelling debt obligations.',
      'Includes ODA, OOF, and private claims.'
    ]
  },
  '612': {
    code: '612',
    name: 'Debt forgiveness: OOF claims (P)',
    definition: [
      'Actions modifying or cancelling debt obligations.',
      'Includes ODA, OOF, and private claims.'
    ]
  },
  '613': {
    code: '613',
    name: 'Debt forgiveness: OOF claims (I)',
    definition: [
      'Actions modifying or cancelling debt obligations.',
      'Includes ODA, OOF, and private claims.'
    ]
  },
  '614': {
    code: '614',
    name: 'Debt forgiveness: Private claims (P)',
    definition: [
      'Actions modifying or cancelling debt obligations.',
      'Includes ODA, OOF, and private claims.'
    ]
  },
  '615': {
    code: '615',
    name: 'Debt forgiveness: Private claims (I)',
    definition: [
      'Actions modifying or cancelling debt obligations.',
      'Includes ODA, OOF, and private claims.'
    ]
  },
  '620': {
    code: '620',
    name: 'Debt rescheduling: ODA claims (P)',
    definition: [
      'Actions modifying or cancelling debt obligations.',
      'Includes ODA, OOF, and private claims.'
    ]
  },
  '621': {
    code: '621',
    name: 'Debt rescheduling: ODA claims (I)',
    definition: [
      'Actions modifying or cancelling debt obligations.',
      'Includes ODA, OOF, and private claims.'
    ]
  },
  '630': {
    code: '630',
    name: 'Debt rescheduling: OOF claims (DSR)',
    definition: [
      'Actions modifying or cancelling debt obligations.',
      'Includes ODA, OOF, and private claims.'
    ]
  },
  '631': {
    code: '631',
    name: 'Debt rescheduling: OOF claims (HIPC)',
    definition: [
      'Actions modifying or cancelling debt obligations.',
      'Includes ODA, OOF, and private claims.'
    ]
  },
  '632': {
    code: '632',
    name: 'Debt rescheduling: OOF claims (MDRI)',
    definition: [
      'Actions modifying or cancelling debt obligations.',
      'Includes ODA, OOF, and private claims.'
    ]
  },
  '633': {
    code: '633',
    name: 'Debt forgiveness/conversion: export credit claims (P)',
    definition: [
      'Actions modifying or cancelling debt obligations.',
      'Includes ODA, OOF, and private claims.'
    ]
  },
  '634': {
    code: '634',
    name: 'Debt forgiveness/conversion: export credit claims (I)',
    definition: [
      'Actions modifying or cancelling debt obligations.',
      'Includes ODA, OOF, and private claims.'
    ]
  },
  '635': {
    code: '635',
    name: 'Debt forgiveness: export credit claims (DSR)',
    definition: [
      'Actions modifying or cancelling debt obligations.',
      'Includes ODA, OOF, and private claims.'
    ]
  },
  '636': {
    code: '636',
    name: 'Debt rescheduling: export credit claims (P)',
    definition: [
      'Actions modifying or cancelling debt obligations.',
      'Includes ODA, OOF, and private claims.'
    ]
  },
  '637': {
    code: '637',
    name: 'Debt rescheduling: export credit claims (I)',
    definition: [
      'Actions modifying or cancelling debt obligations.',
      'Includes ODA, OOF, and private claims.'
    ]
  },
  '638': {
    code: '638',
    name: 'Debt rescheduling: export credit claims (DSR)',
    definition: [
      'Actions modifying or cancelling debt obligations.',
      'Includes ODA, OOF, and private claims.'
    ]
  },
  '639': {
    code: '639',
    name: 'Debt rescheduling: export credit claim (DSR – original loan principal)',
    definition: [
      'Actions modifying or cancelling debt obligations.',
      'Includes ODA, OOF, and private claims.'
    ]
  }
};

// Default Flow Type Definitions
export const FLOW_TYPE_DEFINITIONS: Record<string, CodelistDefinition> = {
  '10': {
    code: '10',
    name: 'Official Development Assistance (ODA)',
    definition: [
      'Concessional public finance for development purposes.',
      'Must promote economic development and welfare.'
    ]
  },
  '21': {
    code: '21',
    name: 'Non-export credit Other Official Flows (OOF)',
    definition: [
      'Public finance not meeting ODA concessionality criteria.',
      'Excludes export credits.'
    ]
  },
  '22': {
    code: '22',
    name: 'Officially supported export credits',
    definition: [
      'Export financing backed by government support.',
      'Includes guarantees and insurance.'
    ]
  },
  '30': {
    code: '30',
    name: 'Private Development Finance',
    definition: [
      'Development-related finance from private or civil society actors.',
      'Includes NGOs and foundations.'
    ]
  },
  '36': {
    code: '36',
    name: 'Private Foreign Direct Investment',
    definition: [
      'Private equity investments with lasting economic interest.',
      'Includes reinvested earnings.'
    ]
  },
  '37': {
    code: '37',
    name: 'Other private flows at market terms',
    definition: [
      'Long-term private capital flows outside FDI.',
      'Provided at market-based conditions.'
    ]
  },
  '40': {
    code: '40',
    name: 'Non-flow items',
    definition: [
      'Statistical or contextual indicators, not financial flows.',
      'Includes GNI and population data.'
    ]
  },
  '50': {
    code: '50',
    name: 'Other flows',
    definition: [
      'Flows not classified as ODA or OOF.',
      'Includes specific non-ODA peace-related expenditures.'
    ]
  },
  // Legacy codes that might still appear in data
  '20': {
    code: '20',
    name: 'Other Official Flows (OOF)',
    definition: [
      'Public finance not meeting ODA concessionality criteria.',
      'Withdrawn code - use 21 or 22 for new records.'
    ]
  },
  '35': {
    code: '35',
    name: 'Private market',
    definition: [
      'Private capital flows with over one-year maturity.',
      'Withdrawn code - use 36 or 37 for new records.'
    ]
  }
};

// Default Tied Status Definitions
export const TIED_STATUS_DEFINITIONS: Record<string, CodelistDefinition> = {
  '3': {
    code: '3',
    name: 'Partially tied',
    definition: [
      'Procurement limited to a defined group of countries.',
      'Includes most recipient countries and possibly the donor.'
    ]
  },
  '4': {
    code: '4',
    name: 'Tied',
    definition: [
      'Procurement restricted to the donor or a small group.',
      'Excludes most aid-recipient countries.'
    ]
  },
  '5': {
    code: '5',
    name: 'Untied',
    definition: [
      'Procurement open to OECD and most developing countries.',
      'No geographic restrictions on suppliers.'
    ]
  }
};

// Codelist type union for type safety
export type CodelistType = 'aid_type' | 'finance_type' | 'flow_type' | 'tied_status';

// Helper function to get definition by codelist type
export function getCodelistDefinition(
  type: CodelistType,
  code: string | undefined | null
): CodelistDefinition | null {
  if (!code) return null;
  
  const definitions: Record<CodelistType, Record<string, CodelistDefinition>> = {
    aid_type: AID_TYPE_DEFINITIONS,
    finance_type: FINANCE_TYPE_DEFINITIONS,
    flow_type: FLOW_TYPE_DEFINITIONS,
    tied_status: TIED_STATUS_DEFINITIONS,
  };

  return definitions[type]?.[code] || null;
}

// Helper to check if a definition exists for a code
export function hasCodelistDefinition(type: CodelistType, code: string | undefined | null): boolean {
  return getCodelistDefinition(type, code) !== null;
}





