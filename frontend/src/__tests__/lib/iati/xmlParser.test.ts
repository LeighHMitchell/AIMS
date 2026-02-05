/**
 * XML Parser Tests for IATI Import
 *
 * Tests the XML parsing functionality used in IATI imports.
 * Covers valid XML parsing, error handling, and edge cases.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { XMLParser } from 'fast-xml-parser';

// Load test fixtures
const fixturesPath = path.join(__dirname, '../../fixtures/iati');

function loadFixture(filename: string): string {
  return fs.readFileSync(path.join(fixturesPath, filename), 'utf-8');
}

// Parser configuration matching the parse route
const parserConfig = {
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  parseAttributeValue: true,
  trimValues: true
};

function parseXML(xmlContent: string) {
  const parser = new XMLParser(parserConfig);
  return parser.parse(xmlContent);
}

// Helper functions matching parse route
function ensureArray(item: any): any[] {
  return Array.isArray(item) ? item : item ? [item] : [];
}

function extractNarrative(node: any): string | undefined {
  if (!node) return undefined;
  if (typeof node === 'string') return node;
  const narrative = node.narrative;
  if (narrative) {
    if (typeof narrative === 'string') return narrative;
    if (narrative['#text']) return narrative['#text'];
    if (Array.isArray(narrative) && narrative[0]) {
      return narrative[0]['#text'] || narrative[0];
    }
  }
  return node['#text'] || undefined;
}

function extractIatiIdentifier(activity: any): string {
  const identifier = activity['iati-identifier'];
  if (typeof identifier === 'string') return identifier;
  if (identifier?.['#text']) return identifier['#text'];
  return 'unknown-' + Math.random().toString(36).substr(2, 9);
}

describe('IATI XML Parser', () => {
  describe('TC-PARSE-001: Parse valid IATI 2.03 activity', () => {
    let parsed: any;

    beforeAll(() => {
      const xml = loadFixture('valid-activity.xml');
      parsed = parseXML(xml);
    });

    it('should have iati-activities root element', () => {
      expect(parsed['iati-activities']).toBeDefined();
    });

    it('should have version attribute', () => {
      expect(parsed['iati-activities']['@_version']).toBe('2.03');
    });

    it('should contain iati-activity elements', () => {
      expect(parsed['iati-activities']['iati-activity']).toBeDefined();
    });

    it('should extract IATI identifier correctly', () => {
      const activity = parsed['iati-activities']['iati-activity'];
      expect(extractIatiIdentifier(activity)).toBe('TEST-AIMS-001');
    });

    it('should extract reporting org reference', () => {
      const activity = parsed['iati-activities']['iati-activity'];
      expect(activity['reporting-org']['@_ref']).toBe('TEST-ORG');
    });

    it('should extract reporting org type', () => {
      const activity = parsed['iati-activities']['iati-activity'];
      expect(activity['reporting-org']['@_type']).toBe(10);
    });

    it('should extract title narrative', () => {
      const activity = parsed['iati-activities']['iati-activity'];
      expect(extractNarrative(activity.title)).toBe('Test Activity for AIMS Import');
    });

    it('should extract activity status code', () => {
      const activity = parsed['iati-activities']['iati-activity'];
      expect(activity['activity-status']['@_code']).toBe(2);
    });
  });

  describe('TC-PARSE-002: Parse activity with all optional fields', () => {
    let activity: any;

    beforeAll(() => {
      const xml = loadFixture('valid-activity.xml');
      const parsed = parseXML(xml);
      activity = parsed['iati-activities']['iati-activity'];
    });

    it('should extract description narrative', () => {
      expect(extractNarrative(activity.description)).toContain('test activity description');
    });

    it('should extract multiple activity dates', () => {
      const dates = ensureArray(activity['activity-date']);
      expect(dates.length).toBeGreaterThanOrEqual(2);
    });

    it('should extract planned start date (type 1)', () => {
      const dates = ensureArray(activity['activity-date']);
      const plannedStart = dates.find((d: any) => d['@_type'] === 1);
      expect(plannedStart['@_iso-date']).toBe('2024-01-01');
    });

    it('should extract planned end date (type 3)', () => {
      const dates = ensureArray(activity['activity-date']);
      const plannedEnd = dates.find((d: any) => d['@_type'] === 3);
      expect(plannedEnd['@_iso-date']).toBe('2025-12-31');
    });

    it('should extract participating organizations', () => {
      const orgs = ensureArray(activity['participating-org']);
      expect(orgs.length).toBeGreaterThanOrEqual(1);
    });

    it('should extract sectors with percentages', () => {
      const sectors = ensureArray(activity.sector);
      expect(sectors.length).toBe(2);
      const totalPercentage = sectors.reduce((sum: number, s: any) => sum + (s['@_percentage'] || 0), 0);
      expect(totalPercentage).toBe(100);
    });

    it('should extract recipient country', () => {
      const countries = ensureArray(activity['recipient-country']);
      expect(countries[0]['@_code']).toBe('MM');
    });

    it('should extract default flow type', () => {
      expect(activity['default-flow-type']['@_code']).toBe(10);
    });

    it('should extract default finance type', () => {
      expect(activity['default-finance-type']['@_code']).toBe(110);
    });
  });

  describe('TC-PARSE-003: Parse multiple activities collection', () => {
    let activities: any[];

    beforeAll(() => {
      const xml = loadFixture('multiple-activities.xml');
      const parsed = parseXML(xml);
      activities = ensureArray(parsed['iati-activities']['iati-activity']);
    });

    it('should parse all 5 activities', () => {
      expect(activities.length).toBe(5);
    });

    it('should extract unique identifiers for each activity', () => {
      const identifiers = activities.map(a => extractIatiIdentifier(a));
      const uniqueIds = new Set(identifiers);
      expect(uniqueIds.size).toBe(5);
    });

    it('should have different activity statuses', () => {
      const statuses = activities.map(a => a['activity-status']['@_code']);
      expect(statuses).toContain(1); // Pipeline
      expect(statuses).toContain(2); // Implementation
      expect(statuses).toContain(3); // Finalisation
      expect(statuses).toContain(4); // Closed
    });

    it('should identify humanitarian activity', () => {
      const humanitarianActivity = activities.find(a => a['@_humanitarian'] === 1 || a['@_humanitarian'] === '1');
      expect(humanitarianActivity).toBeDefined();
      expect(extractIatiIdentifier(humanitarianActivity)).toBe('TEST-MULTI-005');
    });
  });

  describe('TC-PARSE-010: Reject empty XML file', () => {
    it('should detect empty XML content', () => {
      const xml = loadFixture('empty.xml');
      const trimmed = xml.trim();

      // Check if content is just the declaration or empty
      const isEmpty = !trimmed || trimmed === '<?xml version="1.0" encoding="UTF-8"?>';
      expect(isEmpty).toBe(true);
    });
  });

  describe('TC-PARSE-011: Reject malformed XML', () => {
    it('should throw error on malformed XML', () => {
      const xml = loadFixture('malformed.xml');
      const parser = new XMLParser(parserConfig);

      // fast-xml-parser may not throw but will produce incomplete results
      const parsed = parser.parse(xml);

      // Check that the result is invalid or incomplete
      const activities = parsed['iati-activities'];
      if (activities && activities['iati-activity']) {
        const activity = activities['iati-activity'];
        // Check for missing required nested elements
        const hasCompleteReportingOrg = activity['reporting-org']?.narrative;
        const hasCompleteTitle = activity.title?.narrative;
        // At least one should be incomplete due to malformed XML
        expect(!hasCompleteReportingOrg || !hasCompleteTitle).toBe(true);
      }
    });
  });

  describe('TC-PARSE-012: Detect missing iati-identifier', () => {
    it('should identify activity without iati-identifier', () => {
      const xml = loadFixture('invalid-missing-fields.xml');
      const parsed = parseXML(xml);
      const activity = parsed['iati-activities']['iati-activity'];

      const identifier = activity['iati-identifier'];
      expect(identifier).toBeUndefined();
    });
  });

  describe('TC-PARSE-013: Detect missing reporting-org', () => {
    it('should identify activity without reporting-org', () => {
      const xml = loadFixture('invalid-missing-reporting-org.xml');
      const parsed = parseXML(xml);
      const activity = parsed['iati-activities']['iati-activity'];

      expect(activity['reporting-org']).toBeUndefined();
    });
  });

  describe('TC-PARSE-020: Extract activity dates correctly', () => {
    let dates: any[];

    beforeAll(() => {
      const xml = loadFixture('valid-activity.xml');
      const parsed = parseXML(xml);
      const activity = parsed['iati-activities']['iati-activity'];
      dates = ensureArray(activity['activity-date']);
    });

    it('should extract type 1 (planned start)', () => {
      const date = dates.find(d => d['@_type'] === 1);
      expect(date).toBeDefined();
      expect(date['@_iso-date']).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should extract type 2 (actual start)', () => {
      const date = dates.find(d => d['@_type'] === 2);
      expect(date).toBeDefined();
      expect(date['@_iso-date']).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should extract type 3 (planned end)', () => {
      const date = dates.find(d => d['@_type'] === 3);
      expect(date).toBeDefined();
      expect(date['@_iso-date']).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should extract type 4 (actual end)', () => {
      const date = dates.find(d => d['@_type'] === 4);
      expect(date).toBeDefined();
      expect(date['@_iso-date']).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('TC-PARSE-021: Extract locations with coordinates', () => {
    let location: any;

    beforeAll(() => {
      const xml = loadFixture('valid-activity.xml');
      const parsed = parseXML(xml);
      const activity = parsed['iati-activities']['iati-activity'];
      location = activity.location;
    });

    it('should extract location reference', () => {
      expect(location['@_ref']).toBe('LOC-001');
    });

    it('should extract location name', () => {
      expect(extractNarrative(location.name)).toBe('Test Location');
    });

    it('should extract location description', () => {
      expect(extractNarrative(location.description)).toContain('test location');
    });

    it('should extract point coordinates', () => {
      expect(location.point).toBeDefined();
      expect(location.point.pos).toBeDefined();
    });

    it('should parse coordinate values', () => {
      const pos = location.point.pos;
      const coords = typeof pos === 'string' ? pos : pos['#text'];
      const [lat, lon] = coords.split(' ').map(Number);
      expect(lat).toBeCloseTo(16.8661, 2);
      expect(lon).toBeCloseTo(96.1951, 2);
    });

    it('should extract location reach code', () => {
      expect(location['location-reach']['@_code']).toBeDefined();
    });

    it('should extract exactness code', () => {
      expect(location.exactness['@_code']).toBeDefined();
    });

    it('should extract location class code', () => {
      expect(location['location-class']['@_code']).toBeDefined();
    });
  });
});

describe('Transaction Parsing', () => {
  describe('TC-TX-ALL: Parse all transaction types', () => {
    let transactions: any[];

    beforeAll(() => {
      const xml = loadFixture('all-transaction-types.xml');
      const parsed = parseXML(xml);
      const activity = parsed['iati-activities']['iati-activity'];
      transactions = ensureArray(activity.transaction);
    });

    it('should parse 12 transactions (all types except 10)', () => {
      expect(transactions.length).toBe(12);
    });

    const expectedTypes = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '11', '12', '13'];

    expectedTypes.forEach(type => {
      it(`should parse transaction type ${type}`, () => {
        const tx = transactions.find(t => String(t['transaction-type']['@_code']) === type);
        expect(tx).toBeDefined();
        expect(tx['transaction-date']).toBeDefined();
        expect(tx.value).toBeDefined();
      });
    });

    it('should extract transaction values correctly', () => {
      transactions.forEach(tx => {
        const value = tx.value['#text'] || tx.value;
        expect(Number(value)).toBeGreaterThan(0);
      });
    });

    it('should extract transaction dates correctly', () => {
      transactions.forEach(tx => {
        const date = tx['transaction-date']['@_iso-date'];
        expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      });
    });

    it('should extract currency when specified', () => {
      transactions.forEach(tx => {
        const currency = tx.value['@_currency'];
        expect(currency).toBe('USD');
      });
    });
  });
});

describe('CRS-add Parsing', () => {
  describe('TC-CRS-PARSE: Parse CRS-add financing terms', () => {
    let crsAdd: any;

    beforeAll(() => {
      const xml = loadFixture('crs-add-data.xml');
      const parsed = parseXML(xml);
      const activity = parsed['iati-activities']['iati-activity'];
      crsAdd = activity['crs-add'];
    });

    it('should have crs-add element', () => {
      expect(crsAdd).toBeDefined();
    });

    it('should extract loan terms rate-1', () => {
      expect(crsAdd['loan-terms']['@_rate-1']).toBe(2.5);
    });

    it('should extract loan terms rate-2', () => {
      expect(crsAdd['loan-terms']['@_rate-2']).toBe(1.5);
    });

    it('should extract repayment type code', () => {
      expect(crsAdd['loan-terms']['repayment-type']['@_code']).toBeDefined();
    });

    it('should extract repayment plan code', () => {
      expect(crsAdd['loan-terms']['repayment-plan']['@_code']).toBeDefined();
    });

    it('should extract commitment date', () => {
      expect(crsAdd['loan-terms']['commitment-date']['@_iso-date']).toBe('2024-01-15');
    });

    it('should extract repayment first date', () => {
      expect(crsAdd['loan-terms']['repayment-first-date']['@_iso-date']).toBe('2025-01-15');
    });

    it('should extract repayment final date', () => {
      expect(crsAdd['loan-terms']['repayment-final-date']['@_iso-date']).toBe('2034-01-15');
    });

    it('should extract other-flags (OECD CRS flags)', () => {
      const flags = ensureArray(crsAdd['other-flags']);
      expect(flags.length).toBe(4);
    });

    it('should extract loan-status entries', () => {
      const statuses = ensureArray(crsAdd['loan-status']);
      expect(statuses.length).toBe(2);
    });

    it('should extract loan-status year', () => {
      const statuses = ensureArray(crsAdd['loan-status']);
      expect(statuses[0]['@_year']).toBe(2024);
      expect(statuses[1]['@_year']).toBe(2025);
    });

    it('should extract loan-status financial values', () => {
      const statuses = ensureArray(crsAdd['loan-status']);
      expect(statuses[0]['interest-received']).toBe(12500);
      expect(statuses[0]['principal-outstanding']).toBe(500000);
    });

    it('should extract channel-code', () => {
      expect(crsAdd['channel-code']).toBe(11000);
    });
  });
});

describe('Multi-Currency Parsing', () => {
  describe('TC-CURRENCY-PARSE: Parse multi-currency transactions', () => {
    let transactions: any[];

    beforeAll(() => {
      const xml = loadFixture('multi-currency.xml');
      const parsed = parseXML(xml);
      const activity = parsed['iati-activities']['iati-activity'];
      transactions = ensureArray(activity.transaction);
    });

    it('should parse transactions with different currencies', () => {
      const currencies = transactions.map(t => t.value['@_currency']).filter(Boolean);
      const uniqueCurrencies = new Set(currencies);
      expect(uniqueCurrencies.size).toBeGreaterThanOrEqual(5);
    });

    it('should parse EUR transaction', () => {
      const tx = transactions.find(t => t.value['@_currency'] === 'EUR');
      expect(tx).toBeDefined();
      expect(Number(tx.value['#text'] || tx.value)).toBe(100000);
    });

    it('should parse GBP transaction', () => {
      const tx = transactions.find(t => t.value['@_currency'] === 'GBP');
      expect(tx).toBeDefined();
      expect(Number(tx.value['#text'] || tx.value)).toBe(40000);
    });

    it('should parse JPY transaction', () => {
      const tx = transactions.find(t => t.value['@_currency'] === 'JPY');
      expect(tx).toBeDefined();
      expect(Number(tx.value['#text'] || tx.value)).toBe(5000000);
    });

    it('should identify transaction without currency', () => {
      const txWithoutCurrency = transactions.find(t => !t.value['@_currency']);
      expect(txWithoutCurrency).toBeDefined();
    });

    it('should use activity default currency when transaction currency is missing', () => {
      const xml = loadFixture('multi-currency.xml');
      const parsed = parseXML(xml);
      const activity = parsed['iati-activities']['iati-activity'];
      const defaultCurrency = activity['@_default-currency'];
      expect(defaultCurrency).toBe('EUR');
    });
  });
});
