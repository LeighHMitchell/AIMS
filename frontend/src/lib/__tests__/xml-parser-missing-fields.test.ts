/**
 * Tests for missing IATI fields parsing functionality
 * Tests humanitarian scope, activity attributes, and other previously missing fields
 */

import { IATIXMLParser } from '../xml-parser';

describe('XML Parser - Missing IATI Fields', () => {
  describe('Humanitarian Scope Parsing', () => {
    it('should parse humanitarian scope elements', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<iati-activities version="2.03">
  <iati-activity humanitarian="1">
    <iati-identifier>TEST-123</iati-identifier>
    <title><narrative>Test Activity</narrative></title>
    <humanitarian-scope type="1" vocabulary="1-2" code="EQ-2015-000048-NPL">
      <narrative>Nepal Earthquake April 2015</narrative>
      <narrative xml:lang="fr">Népal Earthquake Avril 2015</narrative>
    </humanitarian-scope>
    <humanitarian-scope type="2" vocabulary="2-1" code="HRP-2020-SYR">
      <narrative>Syria Humanitarian Response Plan 2020</narrative>
    </humanitarian-scope>
  </iati-activity>
</iati-activities>`;

      const parser = new IATIXMLParser(xml);
      const result = parser.parseActivity();

      expect(result.humanitarian).toBe(true);
      expect(result.humanitarianScopes).toHaveLength(2);
      
      const scope1 = result.humanitarianScopes![0];
      expect(scope1.type).toBe('1');
      expect(scope1.vocabulary).toBe('1-2');
      expect(scope1.code).toBe('EQ-2015-000048-NPL');
      expect(scope1.narratives).toHaveLength(2);
      expect(scope1.narratives![0].text).toBe('Nepal Earthquake April 2015');
      expect(scope1.narratives![0].language).toBe('en');
      expect(scope1.narratives![1].text).toBe('Népal Earthquake Avril 2015');
      expect(scope1.narratives![1].language).toBe('fr');

      const scope2 = result.humanitarianScopes![1];
      expect(scope2.type).toBe('2');
      expect(scope2.vocabulary).toBe('2-1');
      expect(scope2.code).toBe('HRP-2020-SYR');
    });

    it('should parse custom vocabulary humanitarian scopes', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<iati-activities version="2.03">
  <iati-activity>
    <iati-identifier>TEST-124</iati-identifier>
    <title><narrative>Test Activity</narrative></title>
    <humanitarian-scope type="1" vocabulary="99" code="CUSTOM-001" vocabulary-uri="http://example.com/vocab.html">
      <narrative>Custom humanitarian classification</narrative>
    </humanitarian-scope>
  </iati-activity>
</iati-activities>`;

      const parser = new IATIXMLParser(xml);
      const result = parser.parseActivity();

      expect(result.humanitarianScopes).toHaveLength(1);
      const scope = result.humanitarianScopes![0];
      expect(scope.vocabulary).toBe('99');
      expect(scope.vocabularyUri).toBe('http://example.com/vocab.html');
      expect(scope.code).toBe('CUSTOM-001');
    });

    it('should handle activities without humanitarian scopes', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<iati-activities version="2.03">
  <iati-activity>
    <iati-identifier>TEST-125</iati-identifier>
    <title><narrative>Test Activity</narrative></title>
  </iati-activity>
</iati-activities>`;

      const parser = new IATIXMLParser(xml);
      const result = parser.parseActivity();

      expect(result.humanitarian).toBe(false);
      expect(result.humanitarianScopes).toBeUndefined();
    });
  });

  describe('Activity Attributes Parsing', () => {
    it('should parse hierarchy attribute', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<iati-activities version="2.03">
  <iati-activity hierarchy="2">
    <iati-identifier>TEST-126</iati-identifier>
    <title><narrative>Test Activity</narrative></title>
  </iati-activity>
</iati-activities>`;

      const parser = new IATIXMLParser(xml);
      const result = parser.parseActivity();

      expect(result.hierarchy).toBe(2);
    });

    it('should parse budget-not-provided attribute', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<iati-activities version="2.03">
  <iati-activity budget-not-provided="1">
    <iati-identifier>TEST-127</iati-identifier>
    <title><narrative>Test Activity</narrative></title>
  </iati-activity>
</iati-activities>`;

      const parser = new IATIXMLParser(xml);
      const result = parser.parseActivity();

      expect(result.budgetNotProvided).toBe(true);
    });

    it('should parse linked-data-uri attribute', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<iati-activities version="2.03">
  <iati-activity linked-data-uri="http://data.example.org/123456789">
    <iati-identifier>TEST-128</iati-identifier>
    <title><narrative>Test Activity</narrative></title>
  </iati-activity>
</iati-activities>`;

      const parser = new IATIXMLParser(xml);
      const result = parser.parseActivity();

      expect(result.linkedDataUri).toBe('http://data.example.org/123456789');
    });

    it('should parse all attributes together', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<iati-activities version="2.03">
  <iati-activity 
    hierarchy="1" 
    budget-not-provided="1" 
    linked-data-uri="http://data.example.org/activity/999"
    humanitarian="1">
    <iati-identifier>TEST-129</iati-identifier>
    <title><narrative>Comprehensive Test Activity</narrative></title>
  </iati-activity>
</iati-activities>`;

      const parser = new IATIXMLParser(xml);
      const result = parser.parseActivity();

      expect(result.hierarchy).toBe(1);
      expect(result.budgetNotProvided).toBe(true);
      expect(result.linkedDataUri).toBe('http://data.example.org/activity/999');
      expect(result.humanitarian).toBe(true);
    });

    it('should handle missing attributes gracefully', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<iati-activities version="2.03">
  <iati-activity>
    <iati-identifier>TEST-130</iati-identifier>
    <title><narrative>Minimal Activity</narrative></title>
  </iati-activity>
</iati-activities>`;

      const parser = new IATIXMLParser(xml);
      const result = parser.parseActivity();

      expect(result.hierarchy).toBeUndefined();
      expect(result.budgetNotProvided).toBeUndefined();
      expect(result.linkedDataUri).toBeUndefined();
      expect(result.humanitarian).toBe(false);
    });
  });

  describe('Contacts Parsing (Existing)', () => {
    it('should parse contact information correctly', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<iati-activities version="2.03">
  <iati-activity>
    <iati-identifier>TEST-131</iati-identifier>
    <title><narrative>Test Activity</narrative></title>
    <contact-info type="1">
      <organisation><narrative>Example Agency</narrative></organisation>
      <department><narrative>Finance Department</narrative></department>
      <person-name><narrative>John Doe</narrative></person-name>
      <job-title><narrative>Project Manager</narrative></job-title>
      <telephone>+1234567890</telephone>
      <email>john.doe@example.org</email>
      <website>https://example.org</website>
      <mailing-address><narrative>123 Main St, City, Country</narrative></mailing-address>
    </contact-info>
  </iati-activity>
</iati-activities>`;

      const parser = new IATIXMLParser(xml);
      const result = parser.parseActivity();

      expect(result.contactInfo).toHaveLength(1);
      const contact = result.contactInfo![0];
      expect(contact.type).toBe('1');
      expect(contact.organization).toBe('Example Agency');
      expect(contact.department).toBe('Finance Department');
      expect(contact.personName).toBe('John Doe');
      expect(contact.jobTitle).toBe('Project Manager');
      expect(contact.telephone).toBe('+1234567890');
      expect(contact.email).toBe('john.doe@example.org');
      expect(contact.website).toBe('https://example.org');
      expect(contact.mailingAddress).toBe('123 Main St, City, Country');
    });
  });

  describe('Conditions Parsing (Existing)', () => {
    it('should parse conditions correctly', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<iati-activities version="2.03">
  <iati-activity>
    <iati-identifier>TEST-132</iati-identifier>
    <title><narrative>Test Activity</narrative></title>
    <conditions attached="1">
      <condition type="1">
        <narrative>Condition text</narrative>
        <narrative xml:lang="fr">Texte de condition</narrative>
      </condition>
      <condition type="2">
        <narrative>Performance requirement</narrative>
      </condition>
    </conditions>
  </iati-activity>
</iati-activities>`;

      const parser = new IATIXMLParser(xml);
      const result = parser.parseActivity();

      expect(result.conditions).toBeDefined();
      expect(result.conditions!.attached).toBe(true);
      expect(result.conditions!.conditions).toHaveLength(2);
      
      expect(result.conditions!.conditions[0].type).toBe('1');
      expect(result.conditions!.conditions[0].narrative).toBe('Condition text');
      
      expect(result.conditions!.conditions[1].type).toBe('2');
      expect(result.conditions!.conditions[1].narrative).toBe('Performance requirement');
    });
  });

  describe('Document Links Parsing (Existing)', () => {
    it('should parse activity-level document links correctly', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<iati-activities version="2.03">
  <iati-activity>
    <iati-identifier>TEST-133</iati-identifier>
    <title><narrative>Test Activity</narrative></title>
    <document-link format="application/pdf" url="http://example.org/report.pdf">
      <title><narrative>Project Report 2023</narrative></title>
      <description><narrative>Annual project report</narrative></description>
      <category code="A01" />
      <language code="en" />
      <document-date iso-date="2023-12-31" />
    </document-link>
  </iati-activity>
</iati-activities>`;

      const parser = new IATIXMLParser(xml);
      const result = parser.parseActivity();

      expect(result.document_links).toHaveLength(1);
      const doc = result.document_links![0];
      expect(doc.format).toBe('application/pdf');
      expect(doc.url).toBe('http://example.org/report.pdf');
      expect(doc.title).toBe('Project Report 2023');
      expect(doc.description).toBe('Annual project report');
      expect(doc.category_code).toBe('A01');
      expect(doc.language_code).toBe('en');
      expect(doc.document_date).toBe('2023-12-31');
    });
  });
});

