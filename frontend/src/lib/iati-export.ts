import { Transaction } from '@/types/transaction';

/**
 * Generate IATI-compliant XML for a transaction value element
 * Includes value-date attribute only when different from transaction-date
 */
export function generateTransactionValueXML(transaction: Transaction): string {
  const valueAttrs: Record<string, string> = {
    currency: transaction.currency || 'USD',
  };
  
  // Only include value-date if it exists and is different from transaction-date
  if (transaction.value_date && transaction.value_date !== transaction.transaction_date) {
    valueAttrs['value-date'] = transaction.value_date;
  }
  
  // Generate attribute string
  const attrs = Object.entries(valueAttrs)
    .map(([key, value]) => `${key}="${escapeXML(value)}"`)
    .join(' ');
  
  return `<value ${attrs}>${transaction.value}</value>`;
}

/**
 * Generate complete IATI transaction XML element
 */
export function generateTransactionXML(transaction: Transaction): string {
  const xml: string[] = [];
  
  // Transaction element with optional ref attribute
  const transactionAttrs = transaction.transaction_reference 
    ? ` ref="${escapeXML(transaction.transaction_reference)}"` 
    : '';
  
  xml.push(`<transaction${transactionAttrs}>`);
  
  // Transaction type
  xml.push(`  <transaction-type code="${transaction.transaction_type}" />`);
  
  // Transaction date
  xml.push(`  <transaction-date iso-date="${transaction.transaction_date}" />`);
  
  // Value element with conditional value-date
  xml.push(`  ${generateTransactionValueXML(transaction)}`);
  
  // Description (if present)
  if (transaction.description) {
    const lang = transaction.description_language || 'en';
    xml.push(`  <description>`);
    xml.push(`    <narrative xml:lang="${lang}">${escapeXML(transaction.description)}</narrative>`);
    xml.push(`  </description>`);
  }
  
  // Provider organization
  if (transaction.provider_org_name || transaction.provider_org_ref) {
    const providerAttrs: string[] = [];
    if (transaction.provider_org_ref) {
      providerAttrs.push(`ref="${escapeXML(transaction.provider_org_ref)}"`);
    }
    if (transaction.provider_org_type) {
      providerAttrs.push(`type="${transaction.provider_org_type}"`);
    }
    
    xml.push(`  <provider-org ${providerAttrs.join(' ')}>`);
    if (transaction.provider_org_name || transaction.provider_org) {
      const lang = transaction.provider_org_language || 'en';
      const orgName = transaction.provider_org_name || (typeof transaction.provider_org === 'string' ? transaction.provider_org : transaction.provider_org?.name);
      if (orgName) {
        xml.push(`    <narrative xml:lang="${lang}">${escapeXML(orgName)}</narrative>`);
      }
    }
    xml.push(`  </provider-org>`);
  }
  
  // Receiver organization
  if (transaction.receiver_org_name || transaction.receiver_org_ref) {
    const receiverAttrs: string[] = [];
    if (transaction.receiver_org_ref) {
      receiverAttrs.push(`ref="${escapeXML(transaction.receiver_org_ref)}"`);
    }
    if (transaction.receiver_org_type) {
      receiverAttrs.push(`type="${transaction.receiver_org_type}"`);
    }
    
    xml.push(`  <receiver-org ${receiverAttrs.join(' ')}>`);
    if (transaction.receiver_org_name) {
      const lang = transaction.receiver_org_language || 'en';
      xml.push(`    <narrative xml:lang="${lang}">${escapeXML(transaction.receiver_org_name)}</narrative>`);
    }
    xml.push(`  </receiver-org>`);
  }
  
  // Disbursement channel
  if (transaction.disbursement_channel) {
    xml.push(`  <disbursement-channel code="${transaction.disbursement_channel}" />`);
  }
  
  // Sector
  if (transaction.sector_code) {
    const vocab = transaction.sector_vocabulary || '1';
    xml.push(`  <sector vocabulary="${vocab}" code="${escapeXML(transaction.sector_code)}" />`);
  }
  
  // Recipient country
  if (transaction.recipient_country_code) {
    xml.push(`  <recipient-country code="${transaction.recipient_country_code}" />`);
  }
  
  // Recipient region
  if (transaction.recipient_region_code) {
    const vocab = transaction.recipient_region_vocab || '1';
    xml.push(`  <recipient-region code="${escapeXML(transaction.recipient_region_code)}" vocabulary="${vocab}" />`);
  }
  
  // Flow type
  if (transaction.flow_type) {
    xml.push(`  <flow-type code="${transaction.flow_type}" />`);
  }
  
  // Finance type
  if (transaction.finance_type) {
    xml.push(`  <finance-type code="${transaction.finance_type}" />`);
  }
  
  // Aid type
  if (transaction.aid_type) {
    const vocab = transaction.aid_type_vocabulary || '1';
    xml.push(`  <aid-type code="${transaction.aid_type}" vocabulary="${vocab}" />`);
  }
  
  // Tied status
  if (transaction.tied_status) {
    xml.push(`  <tied-status code="${transaction.tied_status}" />`);
  }
  
  // Humanitarian marker
  if (transaction.is_humanitarian) {
    xml.push(`  <humanitarian />`);
  }
  
  // Humanitarian scope (if any of the fields are present)
  if (transaction.humanitarian_scope_type || transaction.humanitarian_scope_code) {
    const scopeAttrs: string[] = [];
    if (transaction.humanitarian_scope_type) {
      scopeAttrs.push(`type="${escapeXML(transaction.humanitarian_scope_type)}"`);
    }
    if (transaction.humanitarian_scope_vocabulary) {
      scopeAttrs.push(`vocabulary="${escapeXML(transaction.humanitarian_scope_vocabulary)}"`);
    }
    if (transaction.humanitarian_scope_code) {
      scopeAttrs.push(`code="${escapeXML(transaction.humanitarian_scope_code)}"`);
    }
    xml.push(`  <humanitarian-scope ${scopeAttrs.join(' ')} />`);
  }
  
  xml.push('</transaction>');
  
  return xml.join('\n');
}

/**
 * Escape special XML characters
 */
function escapeXML(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generate IATI transactions XML for an activity
 */
export function generateTransactionsXML(transactions: Transaction[]): string {
  return transactions
    .map(transaction => generateTransactionXML(transaction))
    .join('\n\n');
}

/**
 * Generate a complete IATI activity XML with transactions
 */
export function generateActivityXML(
  activity: any,
  transactions: Transaction[]
): string {
  const xml: string[] = [];
  
  // Activity element with optional humanitarian attribute
  const humanitarianAttr = activity.humanitarian ? ' humanitarian="1"' : '';
  xml.push(`<iati-activity 
    default-currency="${activity.currency || 'USD'}"
    last-updated-datetime="${new Date().toISOString()}"
    xml:lang="${activity.language || 'en'}"${humanitarianAttr}>`);
  
  // Activity identifier
  xml.push(`  <iati-identifier>${escapeXML(activity.iati_identifier || activity.iati_id)}</iati-identifier>`);
  
  // Title
  xml.push(`  <title>`);
  xml.push(`    <narrative>${escapeXML(activity.title_narrative || activity.title)}</narrative>`);
  xml.push(`  </title>`);
  
  // Description
  const description = activity.description_narrative || activity.description;
  if (description) {
    xml.push(`  <description>`);
    xml.push(`    <narrative>${escapeXML(description)}</narrative>`);
    xml.push(`  </description>`);
  }
  
  // Activity status
  if (activity.activity_status) {
    xml.push(`  <activity-status code="${activity.activity_status}" />`);
  }
  
  // Activity dates
  if (activity.planned_start_date) {
    xml.push(`  <activity-date iso-date="${activity.planned_start_date}" type="1" />`);
  }
  if (activity.actual_start_date) {
    xml.push(`  <activity-date iso-date="${activity.actual_start_date}" type="2" />`);
  }
  if (activity.planned_end_date) {
    xml.push(`  <activity-date iso-date="${activity.planned_end_date}" type="3" />`);
  }
  if (activity.actual_end_date) {
    xml.push(`  <activity-date iso-date="${activity.actual_end_date}" type="4" />`);
  }
  
  // Humanitarian scope elements
  if (activity.humanitarian_scopes && activity.humanitarian_scopes.length > 0) {
    xml.push('');
    xml.push('  <!-- Humanitarian Scope -->');
    activity.humanitarian_scopes.forEach((scope: any) => {
      const scopeAttrs: string[] = [];
      if (scope.type) scopeAttrs.push(`type="${scope.type}"`);
      if (scope.vocabulary) scopeAttrs.push(`vocabulary="${escapeXML(scope.vocabulary)}"`);
      if (scope.code) scopeAttrs.push(`code="${escapeXML(scope.code)}"`);
      if (scope.vocabulary_uri) scopeAttrs.push(`vocabulary-uri="${escapeXML(scope.vocabulary_uri)}"`);
      
      if (scope.narratives && scope.narratives.length > 0) {
        xml.push(`  <humanitarian-scope ${scopeAttrs.join(' ')}>`);
        scope.narratives.forEach((narrative: any) => {
          const lang = narrative.language || 'en';
          const langAttr = lang !== 'en' ? ` xml:lang="${lang}"` : '';
          xml.push(`    <narrative${langAttr}>${escapeXML(narrative.narrative)}</narrative>`);
        });
        xml.push(`  </humanitarian-scope>`);
      } else {
        xml.push(`  <humanitarian-scope ${scopeAttrs.join(' ')} />`);
      }
    });
  }
  
  // Default values
  if (activity.default_aid_type) {
    xml.push(`  <default-aid-type code="${activity.default_aid_type}" />`);
  }
  if (activity.default_finance_type) {
    xml.push(`  <default-finance-type code="${activity.default_finance_type}" />`);
  }
  if (activity.flow_type) {
    xml.push(`  <default-flow-type code="${activity.flow_type}" />`);
  }
  
  // Capital spend
  if (activity.capital_spend_percentage !== null && activity.capital_spend_percentage !== undefined) {
    // Validate and round to 2 decimal places
    const capitalSpend = Math.round(activity.capital_spend_percentage * 100) / 100;
    if (capitalSpend >= 0 && capitalSpend <= 100) {
      xml.push(`  <capital-spend percentage="${capitalSpend}" />`);
    }
  }

  // Country Budget Items (IATI Watch Point 1 & 2 compliant)
  if (activity.country_budget_items && activity.country_budget_items.length > 0) {
    xml.push('');
    xml.push('  <!-- Country Budget Items -->');
    activity.country_budget_items.forEach((cbi: any) => {
      // Build attributes for country-budget-items element
      const cbiAttrs: string[] = [`vocabulary="${escapeXML(cbi.vocabulary)}"`];

      // IATI Watch Point 1: Include vocabulary-uri for country-specific vocabularies (98/99)
      if ((cbi.vocabulary === '98' || cbi.vocabulary === '99') && cbi.vocabulary_uri) {
        cbiAttrs.push(`vocabulary-uri="${escapeXML(cbi.vocabulary_uri)}"`);
      }

      xml.push(`  <country-budget-items ${cbiAttrs.join(' ')}>`);

      // Add budget items
      if (cbi.budget_items && cbi.budget_items.length > 0) {
        cbi.budget_items.forEach((item: any) => {
          const itemAttrs = [`code="${escapeXML(item.code)}"`, `percentage="${item.percentage}"`];

          // Check if there's a description
          if (item.description) {
            xml.push(`    <budget-item ${itemAttrs.join(' ')}>`);
            xml.push(`      <description>`);

            // Handle multi-language descriptions
            if (typeof item.description === 'object') {
              Object.entries(item.description).forEach(([lang, text]) => {
                if (text) {
                  const langAttr = lang !== 'en' ? ` xml:lang="${lang}"` : '';
                  xml.push(`        <narrative${langAttr}>${escapeXML(String(text))}</narrative>`);
                }
              });
            } else if (typeof item.description === 'string' && item.description) {
              xml.push(`        <narrative>${escapeXML(item.description)}</narrative>`);
            }

            xml.push(`      </description>`);
            xml.push(`    </budget-item>`);
          } else {
            xml.push(`    <budget-item ${itemAttrs.join(' ')} />`);
          }
        });
      }

      xml.push(`  </country-budget-items>`);
    });
  }

  // Transactions
  if (transactions.length > 0) {
    xml.push('');
    xml.push('  <!-- Transactions -->');
    transactions.forEach(transaction => {
      const transactionXML = generateTransactionXML(transaction)
        .split('\n')
        .map(line => '  ' + line)
        .join('\n');
      xml.push(transactionXML);
    });
  }

  xml.push('</iati-activity>');
  
  return xml.join('\n');
}

// Type extensions for additional fields
declare module '@/types/transaction' {
  interface Transaction {
    description_language?: string;
    provider_org_language?: string;
    receiver_org_language?: string;
    humanitarian_scope_type?: string;
    humanitarian_scope_code?: string;
    humanitarian_scope_vocabulary?: string;
    transaction_scope?: string;
  }
} 