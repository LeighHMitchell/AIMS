import { XMLParser } from 'fast-xml-parser';
import { createClient } from '@supabase/supabase-js';

// Transaction diagnostic types
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
}

// IATI Code Mappings (IATI Standard v2.03)
const TRANSACTION_TYPE_MAP: Record<string, string> = {
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
  // Text mappings
  'Incoming Funds': '1',
  'Outgoing Commitment': '2',
  'Disbursement': '3',
  'Expenditure': '4',
  'Interest Payment': '5',
  'Interest Repayment': '5', // Legacy alias
  'Loan Repayment': '6',
  'Reimbursement': '7',
  'Purchase of Equity': '8',
  'Sale of Equity': '9',
  'Credit Guarantee': '10',
  'Incoming Commitment': '11',
  'Outgoing Pledge': '12',
  'Incoming Pledge': '13',
  'Commitment Cancellation': '13' // Legacy alias
};

const TIED_STATUS_MAP: Record<string, string> = {
  '1': '4',  // Tied
  '2': '3',  // Partially tied
  '3': '5',  // Untied
  '4': '5',  // Unknown -> Untied
  '5': '5',  // Untied
  'tied': '4',
  'partially tied': '3',
  'untied': '5'
};

const FLOW_TYPE_MAP: Record<string, string> = {
  '10': '10', // ODA
  '20': '20', // OOF
  '30': '30', // Private grants
  '35': '35', // Private market
  '40': '40', // Non flow
  '50': '50', // Other flows
  'ODA': '10',
  'OOF': '20'
};

const AID_TYPE_MAP: Record<string, string> = {
  'A01': 'A01', // General budget support
  'A02': 'A02', // Sector budget support
  'B01': 'B01', // Core support to NGOs
  'B02': 'B02', // Core contributions to multilateral
  'B03': 'B03', // Contributions to pooled programmes
  'B04': 'B04', // Basket funds/pooled funding
  'C01': 'C01', // Project-type interventions
  'D01': 'D01', // Donor country personnel
  'D02': 'D02', // Other technical assistance
  'E01': 'E01', // Scholarships/training in donor country
  'E02': 'E02', // Imputed student costs
  'F01': 'F01', // Debt relief
  'G01': 'G01', // Administrative costs
  'H01': 'H01', // Development awareness
  'H02': 'H02'  // Refugees in donor countries
};

export class TransactionDiagnostic {
  private supabase: any;
  private results: DiagnosticResult[] = [];
  private summary: ImportSummary = {
    totalParsed: 0,
    totalValid: 0,
    totalSkipped: 0,
    totalFailed: 0,
    failureReasons: {},
    recommendations: []
  };

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async diagnoseXmlFile(xmlContent: string): Promise<ImportSummary> {
    console.log('🔍 Starting Transaction Diagnostic Analysis...\n');

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

    // 1. Extract transaction type
    const typeCode = transaction['transaction-type']?.['@_code'] || 
                     transaction['transaction-type'] || 
                     transaction.type;
    result.values.transaction_type = this.mapTransactionType(typeCode);
    if (!result.values.transaction_type) {
      result.errors.push(`❌ Invalid transaction type: "${typeCode}"`);
    } else {
      console.log(`   ✅ Type: ${result.values.transaction_type} (from "${typeCode}")`);
    }

    // 2. Extract and validate value
    const valueNode = transaction.value;
    if (valueNode) {
      const rawValue = valueNode['#text'] || valueNode['@_value'] || valueNode;
      result.values.value = this.parseValue(rawValue);
      result.values.currency = valueNode['@_currency'] || 'USD';
      result.values.value_date = valueNode['@_value-date'];

      if (result.values.value === null) {
        result.errors.push(`❌ Invalid value format: "${rawValue}"`);
      } else {
        console.log(`   ✅ Value: ${result.values.value} ${result.values.currency}`);
      }

      if (!this.isValidCurrency(result.values.currency)) {
        result.warnings.push(`⚠️  Non-standard currency: "${result.values.currency}"`);
      }
    } else {
      result.errors.push('❌ Missing value element');
    }

    // 3. Extract and validate transaction date
    const dateNode = transaction['transaction-date'];
    const rawDate = dateNode?.['@_iso-date'] || dateNode;
    result.values.transaction_date = this.parseDate(rawDate);
    
    if (!result.values.transaction_date) {
      result.errors.push(`❌ Invalid date format: "${rawDate}"`);
    } else {
      console.log(`   ✅ Date: ${result.values.transaction_date}`);
    }

    // 4. Extract description
    const description = this.extractNarrative(transaction.description);
    if (description) {
      result.values.description = description;
      console.log(`   ✅ Description: "${description.substring(0, 50)}..."`);
    }

    // 5. Extract provider organization
    const providerOrg = transaction['provider-org'];
    if (providerOrg) {
      result.values.provider_org_ref = providerOrg['@_ref'];
      result.values.provider_org_type = providerOrg['@_type'];
      result.values.provider_org_name = this.extractNarrative(providerOrg);
      console.log(`   ✅ Provider: ${result.values.provider_org_name || result.values.provider_org_ref}`);
    }

    // 6. Extract receiver organization
    const receiverOrg = transaction['receiver-org'];
    if (receiverOrg) {
      result.values.receiver_org_ref = receiverOrg['@_ref'];
      result.values.receiver_org_type = receiverOrg['@_type'];
      result.values.receiver_org_name = this.extractNarrative(receiverOrg);
      console.log(`   ✅ Receiver: ${result.values.receiver_org_name || result.values.receiver_org_ref}`);
    }

    // 7. Extract classifications
    // Aid Type
    const aidTypeCode = transaction['aid-type']?.['@_code'] || transaction.aidType;
    if (aidTypeCode) {
      result.values.aid_type = this.mapAidType(aidTypeCode);
      if (!result.values.aid_type) {
        result.warnings.push(`⚠️  Unknown aid type: "${aidTypeCode}"`);
      }
    }

    // Tied Status
    const tiedStatusCode = transaction['tied-status']?.['@_code'] || transaction.tiedStatus;
    if (tiedStatusCode) {
      result.values.tied_status = this.mapTiedStatus(tiedStatusCode);
      if (!result.values.tied_status) {
        result.warnings.push(`⚠️  Unknown tied status: "${tiedStatusCode}"`);
      }
    }

    // Flow Type
    const flowTypeCode = transaction['flow-type']?.['@_code'] || transaction.flowType;
    if (flowTypeCode) {
      result.values.flow_type = this.mapFlowType(flowTypeCode);
      if (!result.values.flow_type) {
        result.warnings.push(`⚠️  Unknown flow type: "${flowTypeCode}"`);
      }
    }

    // 8. Additional IATI fields
    result.values.disbursement_channel = transaction['disbursement-channel']?.['@_code'];
    result.values.finance_type = transaction['finance-type']?.['@_code'];
    result.values.sector_code = transaction.sector?.['@_code'];
    result.values.sector_vocabulary = transaction.sector?.['@_vocabulary'];
    result.values.recipient_country_code = transaction['recipient-country']?.['@_code'];
    result.values.recipient_region_code = transaction['recipient-region']?.['@_code'];
    
    // 9. Set transaction reference
    result.values.transaction_reference = transaction['@_ref'] || 
                                         `${iatiIdentifier}-${index}`;

    // 10. Set status (always actual for IATI imports)
    result.values.status = 'actual';

    // 11. Check activity resolution
    if (!activityLookup.found) {
      result.errors.push(`❌ Activity not found in database: "${iatiIdentifier}"`);
    } else {
      result.values.activity_id = activityLookup.activityId;
    }

    // Determine final status
    if (result.errors.length > 0) {
      result.status = 'invalid';
      console.log(`   ❌ INVALID: ${result.errors.join(', ')}`);
    } else if (result.warnings.length > 0) {
      console.log(`   ⚠️  WARNINGS: ${result.warnings.join(', ')}`);
    }

    // Attempt insert if valid
    if (result.status === 'valid' && activityLookup.found) {
      const insertResult = await this.attemptInsert(result.values);
      if (!insertResult.success) {
        result.status = 'invalid';
        result.errors.push(`❌ Database insert failed: ${insertResult.error}`);
        console.log(`   ❌ INSERT FAILED: ${insertResult.error}`);
      } else {
        console.log(`   ✅ INSERT SUCCESSFUL`);
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

  private async attemptInsert(values: Record<string, any>): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await this.supabase
        .from('transactions')
        .insert(values)
        .select();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Unknown error' };
    }
  }

  private mapTransactionType(code: any): string | null {
    if (!code) return null;
    const mapped = TRANSACTION_TYPE_MAP[String(code)];
    return mapped || null;
  }

  private mapAidType(code: any): string | null {
    if (!code) return null;
    const mapped = AID_TYPE_MAP[String(code).toUpperCase()];
    return mapped || null;
  }

  private mapTiedStatus(code: any): string | null {
    if (!code) return null;
    const mapped = TIED_STATUS_MAP[String(code).toLowerCase()];
    return mapped || null;
  }

  private mapFlowType(code: any): string | null {
    if (!code) return null;
    const mapped = FLOW_TYPE_MAP[String(code)];
    return mapped || null;
  }

  private parseValue(raw: any): number | null {
    if (!raw) return null;
    
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
    // Simple check for 3-letter code
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
    if (error.includes('Activity not found')) return 'Missing Activity';
    if (error.includes('Invalid transaction type')) return 'Invalid Transaction Type';
    if (error.includes('Invalid value format')) return 'Invalid Value Format';
    if (error.includes('Invalid date format')) return 'Invalid Date Format';
    if (error.includes('Missing value element')) return 'Missing Required Field';
    if (error.includes('Database insert failed')) {
      if (error.includes('foreign key')) return 'Foreign Key Constraint';
      if (error.includes('null value')) return 'Null Constraint Violation';
      if (error.includes('duplicate')) return 'Duplicate Entry';
      return 'Database Error';
    }
    return 'Other';
  }

  private generateRecommendations() {
    const { failureReasons } = this.summary;
    
    if (failureReasons['Missing Activity'] > 0) {
      this.summary.recommendations.push(
        '📌 Import activities before transactions, or implement activity auto-creation'
      );
    }
    
    if (failureReasons['Invalid Transaction Type'] > 0) {
      this.summary.recommendations.push(
        '📌 Expand transaction type mapping to handle more IATI variations'
      );
    }
    
    if (failureReasons['Invalid Value Format'] > 0) {
      this.summary.recommendations.push(
        '📌 Enhance value parser to handle formatted numbers (e.g., "$1,000")'
      );
    }
    
    if (failureReasons['Invalid Date Format'] > 0) {
      this.summary.recommendations.push(
        '📌 Add support for more date formats (DD/MM/YYYY, MM-DD-YYYY)'
      );
    }
    
    if (failureReasons['Foreign Key Constraint'] > 0) {
      this.summary.recommendations.push(
        '📌 Consider making organization_id optional or implement org lookup by reference'
      );
    }

    if (this.summary.totalValid === 0 && this.summary.totalParsed > 0) {
      this.summary.recommendations.push(
        '📌 Review database schema constraints - consider relaxing requirements for initial import'
      );
    }
  }

  private printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 TRANSACTION IMPORT DIAGNOSTIC SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Transactions Parsed: ${this.summary.totalParsed}`);
    console.log(`✅ Valid & Imported: ${this.summary.totalValid}`);
    console.log(`⏭️  Skipped: ${this.summary.totalSkipped}`);
    console.log(`❌ Failed: ${this.summary.totalFailed}`);
    
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
    
    console.log('\n' + '='.repeat(60));
  }
}

// Example usage
export async function runTransactionDiagnostic(
  xmlContent: string,
  supabaseUrl: string,
  supabaseKey: string
): Promise<ImportSummary> {
  const diagnostic = new TransactionDiagnostic(supabaseUrl, supabaseKey);
  return await diagnostic.diagnoseXmlFile(xmlContent);
} 