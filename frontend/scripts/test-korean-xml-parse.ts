/**
 * Test script to check if Korean activity XML is being parsed correctly
 */

const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<iati-activities version="2.02">
<iati-activity xmlns:dstore="http://d-portal.org/xmlns/dstore" xmlns:iati-activities="http://d-portal.org/xmlns/iati-activities" default-currency="USD" dstore:dataset="odakorea-act4" dstore:index="396" hierarchy="1" iati-activities:version="2.02" xml:lang="EN">
<iati-identifier>KR-GOV-010-KR-GOV-051-2023010103248</iati-identifier>
<reporting-org ref="KR-GOV-010" secondary-reporter="1" type="10">
<narrative xml:lang="EN">Office for Government Policy Coordination</narrative>
</reporting-org>
<title>
<narrative xml:lang="EN">
Enhancing Community Resilience in Conflict and Disaster-Affected Communities in Myanmar
</narrative>
</title>
<budget status="1" type="1">
<period-start iso-date="2025-01-01"/>
<period-end iso-date="2025-12-31"/>
<value currency="KRW" value-date="2025-06-30">5160000000</value>
</budget>
<transaction ref="KR-GOV-051-2023010103248">
<transaction-type code="1"/>
<transaction-date iso-date="2023-10-02"/>
<value currency="KRW" value-date="2023-11-10">5160000000</value>
<description>
<narrative xml:lang="EN">
Enhancing Community Resilience in Conflict and Disaster-Affected Communities in Myanmar
</narrative>
</description>
<provider-org provider-activity-id="KR-GOV-010-KR-GOV-051-2023010103248" ref="KR-GOV-051" type="10">
<narrative xml:lang="EN">Korea International Cooperation Agency</narrative>
</provider-org>
<receiver-org ref="XM-DAC-47066" type="40">
<narrative xml:lang="EN">IOM</narrative>
</receiver-org>
<flow-type code="10"/>
<finance-type code="110"/>
<aid-type code="C01" vocabulary="1"/>
<tied-status code="5"/>
</transaction>
</iati-activity>
</iati-activities>`;

// Simple XML parser using DOMParser (browser) or xmldom (Node.js)
function parseXML(xmlString: string) {
  // For Node.js, we need to use a library
  const { DOMParser } = require('xmldom');
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, 'text/xml');

  const activity = doc.getElementsByTagName('iati-activity')[0];

  // Check default currency
  const defaultCurrency = activity?.getAttribute('default-currency');
  console.log('Default currency:', defaultCurrency);

  // Parse budgets
  const budgets = Array.from(doc.getElementsByTagName('budget')).map((budget: any) => {
    const value = budget.getElementsByTagName('value')[0];
    return {
      type: budget.getAttribute('type'),
      status: budget.getAttribute('status'),
      period: {
        start: budget.getElementsByTagName('period-start')[0]?.getAttribute('iso-date'),
        end: budget.getElementsByTagName('period-end')[0]?.getAttribute('iso-date')
      },
      value: parseFloat(value?.textContent || '0'),
      currency: value?.getAttribute('currency'),
      valueDate: value?.getAttribute('value-date')
    };
  });

  console.log('\nBudgets found:', budgets.length);
  budgets.forEach((b, i) => {
    console.log(`  Budget ${i + 1}:`, {
      value: b.value,
      currency: b.currency,
      period: `${b.period.start} to ${b.period.end}`
    });
  });

  // Parse transactions
  const transactions = Array.from(doc.getElementsByTagName('transaction')).map((transaction: any) => {
    const value = transaction.getElementsByTagName('value')[0];
    const transactionType = transaction.getElementsByTagName('transaction-type')[0];
    const transactionDate = transaction.getElementsByTagName('transaction-date')[0];

    return {
      type: transactionType?.getAttribute('code'),
      date: transactionDate?.getAttribute('iso-date'),
      value: parseFloat(value?.textContent || '0'),
      currency: value?.getAttribute('currency'),
      valueDate: value?.getAttribute('value-date')
    };
  });

  console.log('\nTransactions found:', transactions.length);
  transactions.forEach((t, i) => {
    console.log(`  Transaction ${i + 1}:`, {
      type: t.type,
      date: t.date,
      value: t.value,
      currency: t.currency
    });
  });
}

try {
  parseXML(xmlContent);
} catch (error) {
  console.error('Error parsing XML:', error);
}
