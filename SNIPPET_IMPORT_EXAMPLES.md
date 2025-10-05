# IATI Snippet Import Examples

This document provides example XML snippets that can be imported using the IATI Snippet Import feature.

## Transaction Snippets

### Single Transaction
```xml
<transaction>
  <transaction-type code="2"/>
  <transaction-date iso-date="2024-01-15"/>
  <value currency="USD" value-date="2024-01-15">50000</value>
  <description>
    <narrative>Quarterly disbursement for primary education program</narrative>
  </description>
  <provider-org ref="US-GOV-1">
    <narrative>US Government - USAID</narrative>
  </provider-org>
  <receiver-org ref="MM-GOV-001">
    <narrative>Ministry of Education, Myanmar</narrative>
  </receiver-org>
  <aid-type code="C01"/>
  <finance-type code="110"/>
  <flow-type code="10"/>
  <tied-status code="5"/>
</transaction>
```

### Multiple Transactions
```xml
<transaction>
  <transaction-type code="2"/>
  <transaction-date iso-date="2024-01-15"/>
  <value currency="USD">50000</value>
  <description>
    <narrative>Q1 Disbursement</narrative>
  </description>
</transaction>
<transaction>
  <transaction-type code="3"/>
  <transaction-date iso-date="2024-02-15"/>
  <value currency="USD">75000</value>
  <description>
    <narrative>Q2 Disbursement</narrative>
  </description>
</transaction>
<transaction>
  <transaction-type code="4"/>
  <transaction-date iso-date="2024-03-15"/>
  <value currency="USD">60000</value>
  <description>
    <narrative>Q3 Disbursement</narrative>
  </description>
</transaction>
```

## Organization Snippets

### Participating Organizations
```xml
<participating-org role="1" type="10" ref="MM-GOV-001">
  <narrative>Ministry of Planning and Finance</narrative>
</participating-org>
<participating-org role="2" type="40" ref="XM-DAC-5-7">
  <narrative>World Bank</narrative>
</participating-org>
<participating-org role="4" type="21" ref="MM-NGO-123">
  <narrative>Myanmar Development Network</narrative>
</participating-org>
```

### Reporting Organization
```xml
<reporting-org ref="US-GOV-1" type="10">
  <narrative>United States Agency for International Development</narrative>
</reporting-org>
```

## Location Snippets

### Location with Coordinates
```xml
<location>
  <location-reach code="1"/>
  <location-id vocabulary="G1" code="1307204"/>
  <name>
    <narrative>Yangon</narrative>
  </name>
  <description>
    <narrative>Yangon Division - Urban development area</narrative>
  </description>
  <activity-description>
    <narrative>Primary health care facility construction</narrative>
  </activity-description>
  <administrative vocabulary="G1" level="1" code="MMR-001">
    <narrative>Yangon Region</narrative>
  </administrative>
  <point srsName="http://www.opengis.net/def/crs/EPSG/0/4326">
    <pos>16.8661 96.1951</pos>
  </point>
  <exactness code="1"/>
  <location-class code="1"/>
  <feature-designation code="PPLA"/>
</location>
```

### Multiple Locations
```xml
<location>
  <location-reach code="2"/>
  <name>
    <narrative>Mandalay</narrative>
  </name>
  <point srsName="http://www.opengis.net/def/crs/EPSG/0/4326">
    <pos>21.9588 96.0891</pos>
  </point>
</location>
<location>
  <location-reach code="2"/>
  <name>
    <narrative>Naypyidaw</narrative>
  </name>
  <point srsName="http://www.opengis.net/def/crs/EPSG/0/4326">
    <pos>19.7475 96.1150</pos>
  </point>
</location>
```

## Sector Snippets

### Single Sector
```xml
<sector vocabulary="1" code="11220" percentage="100">
  <narrative>Primary education</narrative>
</sector>
```

### Multiple Sectors with Percentages
```xml
<sector vocabulary="1" code="11220" percentage="60">
  <narrative>Primary education</narrative>
</sector>
<sector vocabulary="1" code="12220" percentage="25">
  <narrative>Basic health care</narrative>
</sector>
<sector vocabulary="1" code="14030" percentage="15">
  <narrative>Basic drinking water supply and basic sanitation</narrative>
</sector>
```

### Sectors with Different Vocabularies
```xml
<sector vocabulary="1" code="11220" percentage="50">
  <narrative>Primary education - DAC</narrative>
</sector>
<sector vocabulary="2" code="740" percentage="50">
  <narrative>Education - SDG Goal 4</narrative>
</sector>
```

## Recipient Country/Region Snippets

### Recipient Countries
```xml
<recipient-country code="MM" percentage="70">
  <narrative>Myanmar</narrative>
</recipient-country>
<recipient-country code="TH" percentage="30">
  <narrative>Thailand</narrative>
</recipient-country>
```

### Recipient Regions
```xml
<recipient-region code="298" vocabulary="1" percentage="100">
  <narrative>Asia, regional</narrative>
</recipient-region>
```

## Policy Marker Snippets

### Policy Markers
```xml
<policy-marker vocabulary="1" code="1" significance="2">
  <narrative>Gender Equality - Significant objective</narrative>
</policy-marker>
<policy-marker vocabulary="1" code="2" significance="1">
  <narrative>Aid to Environment - Principal objective</narrative>
</policy-marker>
<policy-marker vocabulary="1" code="7" significance="0">
  <narrative>Biodiversity - Not targeted</narrative>
</policy-marker>
```

## Budget Snippets

### Project Budget
```xml
<budget type="1" status="1">
  <period-start iso-date="2024-01-01"/>
  <period-end iso-date="2024-12-31"/>
  <value currency="USD" value-date="2024-01-01">1000000</value>
</budget>
```

### Multiple Budget Periods
```xml
<budget type="1" status="1">
  <period-start iso-date="2024-01-01"/>
  <period-end iso-date="2024-12-31"/>
  <value currency="USD">1000000</value>
</budget>
<budget type="1" status="1">
  <period-start iso-date="2025-01-01"/>
  <period-end iso-date="2025-12-31"/>
  <value currency="USD">1200000</value>
</budget>
<budget type="1" status="1">
  <period-start iso-date="2026-01-01"/>
  <period-end iso-date="2026-12-31"/>
  <value currency="USD">1500000</value>
</budget>
```

## Full Activity Snippet

### Complete Activity
```xml
<iati-activity>
  <iati-identifier>US-GOV-1-MM-EDU-2024-001</iati-identifier>
  <reporting-org ref="US-GOV-1" type="10">
    <narrative>USAID</narrative>
  </reporting-org>
  <title>
    <narrative>Primary Education Enhancement Program</narrative>
  </title>
  <description>
    <narrative>Comprehensive program to improve primary education quality and access in rural Myanmar</narrative>
  </description>
  <activity-status code="2"/>
  <activity-date iso-date="2024-01-01" type="1"/>
  <activity-date iso-date="2024-01-15" type="2"/>
  <activity-date iso-date="2026-12-31" type="3"/>
  <participating-org role="1" type="10" ref="US-GOV-1">
    <narrative>USAID</narrative>
  </participating-org>
  <participating-org role="2" type="10" ref="MM-GOV-001">
    <narrative>Ministry of Education</narrative>
  </participating-org>
  <recipient-country code="MM" percentage="100">
    <narrative>Myanmar</narrative>
  </recipient-country>
  <sector vocabulary="1" code="11220" percentage="100">
    <narrative>Primary education</narrative>
  </sector>
  <default-aid-type code="C01"/>
  <default-finance-type code="110"/>
  <default-flow-type code="10"/>
  <default-tied-status code="5"/>
  <transaction>
    <transaction-type code="2"/>
    <transaction-date iso-date="2024-01-15"/>
    <value currency="USD">50000</value>
  </transaction>
</iati-activity>
```

## Mixed Element Snippets

### Multiple Element Types
```xml
<sector vocabulary="1" code="11220" percentage="60">
  <narrative>Primary education</narrative>
</sector>
<sector vocabulary="1" code="12220" percentage="40">
  <narrative>Basic health care</narrative>
</sector>
<recipient-country code="MM" percentage="100">
  <narrative>Myanmar</narrative>
</recipient-country>
<policy-marker vocabulary="1" code="1" significance="2">
  <narrative>Gender Equality</narrative>
</policy-marker>
<budget type="1" status="1">
  <period-start iso-date="2024-01-01"/>
  <period-end iso-date="2024-12-31"/>
  <value currency="USD">1000000</value>
</budget>
```

## Tips for Using Snippets

1. **Start Small**: Begin with single element snippets to test the feature
2. **Validate XML**: Ensure your XML is well-formed before pasting
3. **Check Codes**: Use valid IATI code lists for better results
4. **Use Narratives**: Include narrative elements for better readability
5. **Test Incrementally**: Add complexity gradually to identify issues
6. **Review Results**: Always check the parsed summary before importing
7. **Keep References**: Save frequently used snippets for reuse

## Common Issues and Solutions

### Issue: "Unknown snippet type"
**Solution**: Ensure your snippet contains recognizable IATI elements like `<transaction>`, `<sector>`, etc.

### Issue: "Invalid XML format"
**Solution**: Check for:
- Unclosed tags
- Missing angle brackets
- Invalid characters
- Proper nesting

### Issue: "Missing required attributes"
**Solution**: Include required attributes like:
- `code` for sectors, countries, transaction types
- `iso-date` for dates
- `currency` for monetary values

### Issue: No data appears after parsing
**Solution**: Verify that:
- Element names match IATI standard
- Attributes are properly formatted
- Values are present in elements

## Additional Resources

- [IATI Standard](https://iatistandard.org/)
- [IATI Codelists](https://iatistandard.org/en/iati-standard/203/codelists/)
- [IATI Validator](https://validator.iatistandard.org/)
- [IATI Registry](https://www.iatiregistry.org/)

