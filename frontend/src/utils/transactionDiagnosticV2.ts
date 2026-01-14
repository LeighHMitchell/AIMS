import { createClient } from '@supabase/supabase-js';
import { XMLParser } from 'fast-xml-parser';

interface DiagnosticResult {
  transactionId: string;
  status: 'valid' | 'invalid' | 'skipped';
  values: Record<string, any>;
  errors: string[];
  warnings: string[];
  activityResolution: {
    iatiIdentifier: string;
    found: boolean;
    activityId?: string;
  };
}

interface ImportSummary {
  totalParsed: number;
  totalValid: number;
  totalSkipped: number;
  totalFailed: number;
  failureReasons: Record<string, number>;
  recommendations: string[];
  criticalIssues: string[];
}

// Comprehensive mappings based on IATI Standard v2.03
const TRANSACTION_TYPE_MAP: Record<string, string> = {
  // IATI numeric codes to our enum values
  '1': '1',   // Incoming Funds
  '2': '2',   // Outgoing Commitment
  '3': '3',   // Disbursement
  '4': '4',   // Expenditure
  '5': '5',   // Interest Payment
  '6': '6',   // Loan Repayment
  '7': '7',   // Reimbursement
  '8': '8',   // Purchase of Equity
  '9': '9',   // Sale of Equity
  '10': '10', // Credit Guarantee
  '11': '11', // Incoming Commitment
  '12': '12', // Outgoing Pledge
  '13': '13', // Incoming Pledge
  // Text mappings (lowercase)
  'incoming funds': '1',
  'outgoing commitment': '2',
  'disbursement': '3',
  'expenditure': '4',
  'interest payment': '5',
  'loan repayment': '6',
  'reimbursement': '7',
  'purchase of equity': '8',
  'sale of equity': '9',
  'credit guarantee': '10',
  'incoming commitment': '11',
  'outgoing pledge': '12',
  'incoming pledge': '13',
  'commitment cancellation': '13', // Legacy alias
  // Common variations
  'D': '3',  // Disbursement
  'E': '4',  // Expenditure
  'IF': '1', // Incoming Funds
  'C': '2'   // Commitment
};

const TIED_STATUS_MAP: Record<string, string> = {
  '3': '3',  // Partially tied
  '4': '4',  // Tied
  '5': '5',  // Untied
  'tied': '4',
  'partially tied': '3',
  'untied': '5',
  'partially untied': '3',
  'unknown': '5' // Default to untied if unknown
};

const FLOW_TYPE_MAP: Record<string, string> = {
  '10': '10', // ODA
  '20': '20', // OOF
  '30': '30', // Private grants
  '35': '35', // Private market
  '40': '40', // Non flow
  '50': '50', // Other flows
  'ODA': '10',
  'OOF': '20',
  'private grants': '30',
  'private market': '35',
  'non flow': '40',
  'other flows': '50'
};

const AID_TYPE_MAP: Record<string, string> = {
  'A01': 'A01', 'A02': 'A02', 'B01': 'B01', 'B02': 'B02', 
  'B03': 'B03', 'B04': 'B04', 'C01': 'C01', 'D01': 'D01',
  'D02': 'D02', 'E01': 'E01', 'E02': 'E02', 'F01': 'F01',
  'G01': 'G01', 'H01': 'H01', 'H02': 'H02'
};

const FINANCE_TYPE_MAP: Record<string, string> = {
  '100': '100', // Grant
  '110': '110', // Standard grant
  '111': '111', // Subsidies to national private investors
  '210': '210', // Interest subsidy
  '211': '211', // Interest subsidy to national private exporters
  '310': '310', // Deposit basis
  '311': '311', // Deposit basis to national private exporters
  '410': '410', // Aid loan excluding debt reorganisation
  '411': '411', // Investment-related loan to developing countries
  '412': '412', // Loan in a joint venture with the recipient
  '413': '413', // Loan to national private investor
  '414': '414', // Loan to national private exporter
  '451': '451', // Non-banks guaranteed export credits
  '452': '452', // Non-banks non-guaranteed portions of guaranteed export credits
  '453': '453', // Bank export credits
  '510': '510', // Common equity
  '511': '511', // Acquisition of equity as part of a joint venture
  '512': '512', // Other acquisition of equity
  '520': '520', // Shares in collective investment vehicles
  '530': '530', // Reinvested earnings
  '610': '610', // Debt forgiveness
  '611': '611', // Debt forgiveness: ODA claims
  '612': '612', // Debt forgiveness: OOF claims
  '613': '613', // Debt forgiveness: Private claims
  '614': '614', // Debt forgiveness: OOF claims (DSR)
  '615': '615', // Debt forgiveness: Private export credit claims (DSR)
  '616': '616', // Debt forgiveness: OOF claims (DDR)
  '617': '617', // Debt forgiveness: Private export credit claims (DDR)
  '618': '618', // Debt forgiveness: Other
  '619': '619', // Debt forgiveness: For which payment expected from creditor to donor
  '620': '620', // Debt rescheduling
  '621': '621', // Debt rescheduling: ODA claims
  '622': '622', // Debt rescheduling: OOF claims
  '623': '623', // Debt rescheduling: Private claims
  '624': '624', // Debt rescheduling: OOF claim (DSR)
  '625': '625', // Debt rescheduling: Private export credit claims (DSR)
  '626': '626', // Debt rescheduling: OOF claim (DDR)
  '627': '627', // Debt rescheduling: Private export credit claims (DDR)
  '630': '630', // Debt rescheduling: OOF claim (DSR – original loan principal)
  '631': '631', // Debt rescheduling: OOF claim (DSR – original loan interest)
  '632': '632', // Debt rescheduling: Private export credit claims (DSR – original loan principal)
  '633': '633', // Debt rescheduling: Private export credit claims (DSR – original loan interest)
  '710': '710', // Foreign direct investment
  '711': '711', // Other foreign direct investment
  '810': '810', // Bank bonds
  '811': '811', // Non-bank bonds
  '910': '910', // Other securities/claims
  '911': '911', // Securities and other instruments issued by multilateral agencies
  '912': '912', // Securities and other instruments issued by bilateral agencies
  '913': '913'  // Securities and other instruments issued by other
};

const DISBURSEMENT_CHANNEL_MAP: Record<string, string> = {
  '1': '1', // Money
  '2': '2', // Food
  '3': '3', // In-kind
  '4': '4', // Reimbursable
  '5': '5', // Bonds
  '6': '6', // IOU
  '7': '7', // CRS++
  '8': '8'  // Direct
};

export class TransactionDiagnosticV2 {
  private supabase: any;
  private results: DiagnosticResult[] = [];
  private summary: ImportSummary = {
    totalParsed: 0,
    totalValid: 0,
    totalSkipped: 0,
    totalFailed: 0,
    failureReasons: {},
    recommendations: [],
    criticalIssues: []
  };

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async diagnoseXmlFile(xmlContent: string): Promise<ImportSummary> {
    console.log('🔍 Starting Enhanced Transaction Diagnostic Analysis...\n');

    // Parse XML
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      textNodeName: '#text',
      parseAttributeValue: true,
      trimValues: true
    });

    const parsed = parser.parse(xmlContent);
    const activities = this.ensureArray(parsed['iati-activities']?.['iati-activity'] || []);

    // Pre-validation checks
    this.performPreValidation(activities);

    // Process each activity
    for (const activity of activities) {
      const iatiIdentifier = this.extractIatiIdentifier(activity);
      const transactions = this.ensureArray(activity.transaction || []);

      console.log(`\n📋 Processing Activity: ${iatiIdentifier}`);
      console.log(`   Found ${transactions.length} transactions`);

      // Check if activity exists in database
      const activityLookup = await this.findActivity(iatiIdentifier);

      for (let i = 0; i < transactions.length; i++) {
        const result = await this.diagnoseTransaction(
          transactions[i], 
          iatiIdentifier, 
          activityLookup,
          i + 1
        );
        this.results.push(result);
        this.updateSummary(result);
      }
    }

    this.generateRecommendations();
    this.printSummary();
    
    return this.summary;
  }

  private performPreValidation(activities: any[]) {
    console.log('📝 Pre-validation Checks:');
    
    // Check for activities without identifiers
    const noIdActivities = activities.filter(a => !this.extractIatiIdentifier(a));
    if (noIdActivities.length > 0) {
      this.summary.criticalIssues.push(`${noIdActivities.length} activities have no IATI identifier`);
    }

    // Check for activities without transactions
    const noTransActivities = activities.filter(a => !a.transaction || 
      (Array.isArray(a.transaction) && a.transaction.length === 0));
    if (noTransActivities.length > 0) {
      console.log(`   ⚠️  ${noTransActivities.length} activities have no transactions`);
    }

    console.log('');
  }

  private async diagnoseTransaction(
    transaction: any,
    iatiIdentifier: string,
    activityLookup: { found: boolean; activityId?: string },
    index: number
  ): Promise<DiagnosticResult> {
    const result: DiagnosticResult = {
      transactionId: `${iatiIdentifier}-tx-${index}`,
      status: 'valid',
      values: {},
      errors: [],
      warnings: [],
      activityResolution: {
        iatiIdentifier,
        ...activityLookup
      }
    };

    console.log(`\n🔄 Transaction #${index}:`);

    // 1. Extract transaction type (REQUIRED)
    const typeCode = transaction['transaction-type']?.['@_code'] || 
                     transaction['transaction-type'] || 
                     transaction.type;
    result.values.transaction_type = this.mapTransactionType(typeCode);
    if (!result.values.transaction_type) {
      result.errors.push(`❌ Invalid transaction type: "${typeCode}" (not mapped)`);
      console.log(`   ❌ Type: INVALID "${typeCode}"`);
    } else {
      console.log(`   ✅ Type: ${result.values.transaction_type} (from "${typeCode}")`);
    }

    // 2. Extract and validate value (REQUIRED)
    const valueNode = transaction.value;
    if (valueNode) {
      const rawValue = valueNode['#text'] || valueNode['@_value'] || valueNode;
      result.values.value = this.parseValue(rawValue);
      
      // CRITICAL: Extract currency
      result.values.currency = valueNode['@_currency'];
      result.values.value_date = valueNode['@_value-date'];

      if (result.values.value === null || result.values.value === undefined) {
        result.errors.push(`❌ Invalid value format: "${rawValue}"`);
        console.log(`   ❌ Value: INVALID "${rawValue}"`);
      } else {
        console.log(`   ✅ Value: ${result.values.value}`);
      }

      // CRITICAL CHECK: Currency is REQUIRED
      if (!result.values.currency) {
        result.errors.push('❌ MISSING CURRENCY - <value> element must have currency attribute!');
        console.log('   ❌ Currency: MISSING (REQUIRED!)');
      } else if (!this.isValidCurrency(result.values.currency)) {
        result.warnings.push(`⚠️  Non-standard currency: "${result.values.currency}"`);
        console.log(`   ⚠️  Currency: ${result.values.currency} (non-standard)`);
      } else {
        console.log(`   ✅ Currency: ${result.values.currency}`);
      }
    } else {
      result.errors.push('❌ Missing <value> element (REQUIRED)');
      console.log('   ❌ Value: MISSING ELEMENT');
    }

    // 3. Extract and validate transaction date (REQUIRED)
    const dateNode = transaction['transaction-date'];
    const rawDate = dateNode?.['@_iso-date'] || dateNode;
    result.values.transaction_date = this.parseDate(rawDate);
    
    if (!result.values.transaction_date) {
      result.errors.push(`❌ Invalid or missing transaction date: "${rawDate}"`);
      console.log(`   ❌ Date: INVALID "${rawDate}"`);
    } else {
      console.log(`   ✅ Date: ${result.values.transaction_date}`);
    }

    // 4. Extract description (OPTIONAL)
    const description = this.extractNarrative(transaction.description);
    if (description) {
      result.values.description = description;
      console.log(`   ✅ Description: "${description.substring(0, 50)}..."`);
    }

    // 5. Extract provider organization (OPTIONAL but recommended)
    const providerOrg = transaction['provider-org'];
    if (providerOrg) {
      result.values.provider_org_ref = providerOrg['@_ref'];
      result.values.provider_org_type = providerOrg['@_type'];
      result.values.provider_org_name = this.extractNarrative(providerOrg) || providerOrg['@_ref'];
      console.log(`   ✅ Provider: ${result.values.provider_org_name || result.values.provider_org_ref || '[name not found]'}`);
    } else {
      // Not an error - these fields are optional
      console.log('   ℹ️  Provider: Not specified (optional)');
    }

    // 6. Extract receiver organization (OPTIONAL but recommended)
    const receiverOrg = transaction['receiver-org'];
    if (receiverOrg) {
      result.values.receiver_org_ref = receiverOrg['@_ref'];
      result.values.receiver_org_type = receiverOrg['@_type'];
      result.values.receiver_org_name = this.extractNarrative(receiverOrg) || receiverOrg['@_ref'];
      console.log(`   ✅ Receiver: ${result.values.receiver_org_name || result.values.receiver_org_ref || '[name not found]'}`);
    } else {
      // Not an error - these fields are optional
      console.log('   ℹ️  Receiver: Not specified (optional)');
    }

    // 7. Extract classifications (all OPTIONAL)
    // Aid Type
    const aidTypeCode = transaction['aid-type']?.['@_code'] || transaction.aidType;
    if (aidTypeCode) {
      result.values.aid_type = this.mapAidType(aidTypeCode);
      if (!result.values.aid_type) {
        result.warnings.push(`⚠️  Unknown aid type: "${aidTypeCode}" - will be stored as-is`);
        result.values.aid_type = aidTypeCode; // Store raw value
      }
      console.log(`   ℹ️  Aid Type: ${result.values.aid_type}`);
    }

    // Tied Status
    const tiedStatusCode = transaction['tied-status']?.['@_code'] || transaction.tiedStatus;
    if (tiedStatusCode) {
      result.values.tied_status = this.mapTiedStatus(tiedStatusCode);
      if (!result.values.tied_status) {
        result.warnings.push(`⚠️  Unknown tied status: "${tiedStatusCode}" - defaulting to untied`);
        result.values.tied_status = '5'; // Default to untied
      }
      console.log(`   ℹ️  Tied Status: ${result.values.tied_status}`);
    }

    // Flow Type
    const flowTypeCode = transaction['flow-type']?.['@_code'] || transaction.flowType;
    if (flowTypeCode) {
      result.values.flow_type = this.mapFlowType(flowTypeCode);
      if (!result.values.flow_type) {
        result.warnings.push(`⚠️  Unknown flow type: "${flowTypeCode}" - will be stored as-is`);
        result.values.flow_type = flowTypeCode; // Store raw value
      }
      console.log(`   ℹ️  Flow Type: ${result.values.flow_type}`);
    }

    // Finance Type
    const financeTypeCode = transaction['finance-type']?.['@_code'];
    if (financeTypeCode) {
      result.values.finance_type = this.mapFinanceType(financeTypeCode);
      if (!result.values.finance_type) {
        result.warnings.push(`⚠️  Unknown finance type: "${financeTypeCode}" - will be stored as-is`);
        result.values.finance_type = financeTypeCode;
      }
      console.log(`   ℹ️  Finance Type: ${result.values.finance_type}`);
    }

    // Disbursement Channel
    const channelCode = transaction['disbursement-channel']?.['@_code'];
    if (channelCode) {
      result.values.disbursement_channel = this.mapDisbursementChannel(channelCode);
      if (!result.values.disbursement_channel) {
        result.warnings.push(`⚠️  Unknown disbursement channel: "${channelCode}" - will be stored as-is`);
        result.values.disbursement_channel = channelCode;
      }
      console.log(`   ℹ️  Disbursement Channel: ${result.values.disbursement_channel}`);
    }

    // 8. Additional IATI fields (all OPTIONAL)
    result.values.sector_code = transaction.sector?.['@_code'];
    result.values.sector_vocabulary = transaction.sector?.['@_vocabulary'];
    result.values.recipient_country_code = transaction['recipient-country']?.['@_code'];
    result.values.recipient_region_code = transaction['recipient-region']?.['@_code'];
    
    // 9. Set transaction reference
    result.values.transaction_reference = transaction['@_ref'] || 
                                         `${iatiIdentifier}-${index}`;

    // 10. Set status (always actual for IATI imports)
    result.values.status = 'actual';

    // 11. Handle is_humanitarian (ensure boolean)
    const humanitarian = transaction['@_humanitarian'] || transaction.humanitarian;
    result.values.is_humanitarian = humanitarian === true || humanitarian === '1' || humanitarian === 'true';

    // 12. Check activity resolution (CRITICAL)
    if (!activityLookup.found) {
      result.errors.push(`❌ ACTIVITY NOT FOUND: "${iatiIdentifier}" - must exist before importing transactions`);
      console.log(`   ❌ Activity: NOT FOUND IN DATABASE`);
    } else {
      result.values.activity_id = activityLookup.activityId;
      console.log(`   ✅ Activity: Found (${activityLookup.activityId})`);
    }

    // Determine final status
    if (result.errors.length > 0) {
      result.status = 'invalid';
      console.log(`   ❌ STATUS: INVALID - ${result.errors.length} error(s)`);
    } else {
      console.log(`   ✅ STATUS: Valid for import`);
      if (result.warnings.length > 0) {
        console.log(`   ⚠️  WARNINGS: ${result.warnings.length} warning(s)`);
      }
    }

    // Attempt insert if valid using RPC function
    if (result.status === 'valid' && activityLookup.found) {
      const insertResult = await this.attemptInsertWithRPC(result.values);
      if (!insertResult.success) {
        result.status = 'invalid';
        result.errors.push(`❌ Database insert failed: ${insertResult.error}`);
        console.log(`   ❌ INSERT FAILED: ${insertResult.error}`);
      } else {
        console.log(`   ✅ INSERT SUCCESSFUL (ID: ${insertResult.transactionId})`);
      }
    }

    return result;
  }

  private async findActivity(iatiIdentifier: string): Promise<{ found: boolean; activityId?: string }> {
    try {
      const { data, error } = await this.supabase
        .from('activities')
        .select('id')
        .eq('iati_id', iatiIdentifier)
        .single();

      if (error || !data) {
        return { found: false };
      }

      return { found: true, activityId: data.id };
    } catch (err) {
      console.error(`Error looking up activity ${iatiIdentifier}:`, err);
      return { found: false };
    }
  }

  private async attemptInsertWithRPC(values: Record<string, any>): Promise<{ success: boolean; error?: string; transactionId?: string }> {
    try {
      // Use RPC function to bypass schema cache issues
      const { data, error } = await this.supabase
        .rpc('insert_iati_transaction', {
          p_activity_id: values.activity_id,
          p_transaction_type: values.transaction_type,
          p_transaction_date: values.transaction_date,
          p_value: values.value,
          p_currency: values.currency,
          p_description: values.description,
          p_disbursement_channel: values.disbursement_channel,
          p_flow_type: values.flow_type,
          p_finance_type: values.finance_type,
          p_aid_type: values.aid_type,
          p_tied_status: values.tied_status,
          p_provider_org_name: values.provider_org_name,
          p_receiver_org_name: values.receiver_org_name
        });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, transactionId: data };
    } catch (err: any) {
      // If RPC fails, try direct insert as fallback
      try {
        const { data, error } = await this.supabase
          .from('transactions')
          .insert(values)
          .select();

        if (error) {
          return { success: false, error: error.message };
        }

        return { success: true, transactionId: data[0]?.id };
      } catch (fallbackErr: any) {
        return { success: false, error: fallbackErr.message || 'Unknown error' };
      }
    }
  }

  private mapTransactionType(code: any): string | null {
    if (!code) return null;
    const strCode = String(code).toLowerCase();
    return TRANSACTION_TYPE_MAP[code] || TRANSACTION_TYPE_MAP[strCode] || null;
  }

  private mapAidType(code: any): string | null {
    if (!code) return null;
    return AID_TYPE_MAP[String(code).toUpperCase()] || null;
  }

  private mapTiedStatus(code: any): string | null {
    if (!code) return null;
    return TIED_STATUS_MAP[String(code).toLowerCase()] || TIED_STATUS_MAP[code] || null;
  }

  private mapFlowType(code: any): string | null {
    if (!code) return null;
    return FLOW_TYPE_MAP[code] || FLOW_TYPE_MAP[String(code).toLowerCase()] || null;
  }

  private mapFinanceType(code: any): string | null {
    if (!code) return null;
    return FINANCE_TYPE_MAP[code] || null;
  }

  private mapDisbursementChannel(code: any): string | null {
    if (!code) return null;
    return DISBURSEMENT_CHANNEL_MAP[code] || null;
  }

  private parseValue(raw: any): number | null {
    if (raw === null || raw === undefined) return null;
    
    // Remove common formatting
    const cleaned = String(raw)
      .replace(/[$,]/g, '')
      .replace(/\s/g, '')
      .trim();

    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
  }

  private parseDate(raw: any): string | null {
    if (!raw) return null;

    const dateStr = String(raw);
    
    // Try ISO format YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }

    // Try DD-MM-YYYY or DD/MM/YYYY
    const altMatch = dateStr.match(/^(\d{2})[-\/](\d{2})[-\/](\d{4})$/);
    if (altMatch) {
      return `${altMatch[3]}-${altMatch[2]}-${altMatch[1]}`;
    }

    // Try to parse with Date object
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }

    return null;
  }

  private isValidCurrency(currency: string): boolean {
    // Check for 3-letter ISO code
    return /^[A-Z]{3}$/.test(currency);
  }

  private extractNarrative(node: any): string | null {
    if (!node) return null;
    
    if (typeof node === 'string') return node;
    
    const narrative = node.narrative;
    if (narrative) {
      if (typeof narrative === 'string') return narrative;
      if (narrative['#text']) return narrative['#text'];
      if (Array.isArray(narrative) && narrative[0]) {
        return narrative[0]['#text'] || narrative[0];
      }
    }
    
    return node['#text'] || null;
  }

  private extractIatiIdentifier(activity: any): string {
    const identifier = activity['iati-identifier'];
    if (typeof identifier === 'string') return identifier;
    if (identifier?.['#text']) return identifier['#text'];
    return 'unknown';
  }

  private ensureArray(item: any): any[] {
    return Array.isArray(item) ? item : [item];
  }

  private updateSummary(result: DiagnosticResult) {
    this.summary.totalParsed++;
    
    if (result.status === 'valid') {
      this.summary.totalValid++;
    } else if (result.status === 'skipped') {
      this.summary.totalSkipped++;
    } else {
      this.summary.totalFailed++;
      
      // Track failure reasons
      result.errors.forEach(error => {
        const reason = this.categorizeError(error);
        this.summary.failureReasons[reason] = (this.summary.failureReasons[reason] || 0) + 1;
      });
    }
  }

  private categorizeError(error: string): string {
    if (error.includes('ACTIVITY NOT FOUND')) return 'Missing Activity';
    if (error.includes('MISSING CURRENCY')) return 'Missing Currency';
    if (error.includes('Invalid transaction type')) return 'Invalid Transaction Type';
    if (error.includes('Invalid value format')) return 'Invalid Value Format';
    if (error.includes('Invalid or missing transaction date')) return 'Invalid Date Format';
    if (error.includes('Missing <value> element')) return 'Missing Value Element';
    if (error.includes('Database insert failed')) {
      if (error.includes('foreign key')) return 'Foreign Key Constraint';
      if (error.includes('null value')) return 'Null Constraint Violation';
      if (error.includes('duplicate')) return 'Duplicate Entry';
      if (error.includes('enum')) return 'Invalid Enum Value';
      return 'Database Error';
    }
    return 'Other';
  }

  private generateRecommendations() {
    const { failureReasons } = this.summary;
    
    // CRITICAL: Currency issues
    if (failureReasons['Missing Currency'] > 0) {
      this.summary.recommendations.push(
        '🚨 CRITICAL: Transactions are missing currency attributes in <value> elements. This is REQUIRED by the schema!'
      );
      this.summary.recommendations.push(
        '📌 Ensure all <value> elements have currency="XXX" attribute (e.g., currency="USD")'
      );
    }
    
    // Activity lookup issues
    if (failureReasons['Missing Activity'] > 0) {
      this.summary.recommendations.push(
        '📌 Import activities BEFORE transactions, or enable auto-creation of activities'
      );
      this.summary.recommendations.push(
        '📌 Verify IATI identifiers match exactly between activities and transactions'
      );
    }
    
    if (failureReasons['Invalid Transaction Type'] > 0) {
      this.summary.recommendations.push(
        '📌 Review transaction types - ensure they use standard IATI codes (1-13)'
      );
    }
    
    if (failureReasons['Invalid Value Format'] > 0) {
      this.summary.recommendations.push(
        '📌 Check value formatting - remove currency symbols and use decimal points'
      );
    }
    
    if (failureReasons['Invalid Date Format'] > 0) {
      this.summary.recommendations.push(
        '📌 Use ISO date format (YYYY-MM-DD) in iso-date attributes'
      );
    }
    
    if (failureReasons['Invalid Enum Value'] > 0) {
      this.summary.recommendations.push(
        '📌 Check enum values match database constraints (aid_type, flow_type, etc.)'
      );
    }

    if (this.summary.totalValid === 0 && this.summary.totalParsed > 0) {
      this.summary.recommendations.push(
        '📌 No transactions could be imported - check XML structure and required fields'
      );
    }
  }

  private printSummary() {
    console.log('\n' + '='.repeat(80));
    console.log('📊 ENHANCED TRANSACTION IMPORT DIAGNOSTIC SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total Transactions Parsed: ${this.summary.totalParsed}`);
    console.log(`✅ Valid & Imported: ${this.summary.totalValid}`);
    console.log(`⏭️  Skipped: ${this.summary.totalSkipped}`);
    console.log(`❌ Failed: ${this.summary.totalFailed}`);
    
    if (this.summary.criticalIssues.length > 0) {
      console.log('\n🚨 CRITICAL ISSUES:');
      this.summary.criticalIssues.forEach(issue => {
        console.log(`   ${issue}`);
      });
    }
    
    if (Object.keys(this.summary.failureReasons).length > 0) {
      console.log('\n🔍 Failure Breakdown:');
      Object.entries(this.summary.failureReasons)
        .sort((a, b) => b[1] - a[1])
        .forEach(([reason, count]) => {
          console.log(`   ${reason}: ${count}`);
        });
    }
    
    if (this.summary.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      this.summary.recommendations.forEach(rec => {
        console.log(`   ${rec}`);
      });
    }
    
    console.log('\n' + '='.repeat(80));
  }
}

// Example usage
export async function runTransactionDiagnosticV2(
  xmlContent: string,
  supabaseUrl: string,
  supabaseKey: string
): Promise<ImportSummary> {
  const diagnostic = new TransactionDiagnosticV2(supabaseUrl, supabaseKey);
  return await diagnostic.diagnoseXmlFile(xmlContent);
} 