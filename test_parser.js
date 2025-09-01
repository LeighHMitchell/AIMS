// Simple test to verify the XML parser works
const fs = require('fs');
const { DOMParser } = require('@xmldom/xmldom');

// Helper function to get elements by tag name (like querySelector)
function getElementByTagName(parent, tagName) {
  const elements = parent.getElementsByTagName(tagName);
  return elements.length > 0 ? elements[0] : null;
}

function getElementsByTagName(parent, tagName) {
  return Array.from(parent.getElementsByTagName(tagName));
}

function getElementByAttribute(parent, tagName, attr, value) {
  const elements = parent.getElementsByTagName(tagName);
  for (let i = 0; i < elements.length; i++) {
    if (elements[i].getAttribute(attr) === value) {
      return elements[i];
    }
  }
  return null;
}

// Read the test XML file
const xmlContent = fs.readFileSync('./test_iati_activity.xml', 'utf8');
console.log('XML Content loaded, length:', xmlContent.length);

// Test parsing
try {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
  
  console.log('XML parsed successfully!');
  
  // Test some basic extractions
  const activity = getElementByTagName(xmlDoc, 'iati-activity');
  console.log('Activity found:', !!activity);
  
  if (activity) {
    const iatiId = getElementByTagName(activity, 'iati-identifier');
    console.log('IATI ID:', iatiId?.textContent?.trim());
    
    const title = getElementByTagName(activity, 'title');
    const titleNarrative = title ? getElementByTagName(title, 'narrative') : null;
    console.log('Title:', titleNarrative?.textContent?.trim());
    
    const description = getElementByTagName(activity, 'description');
    const descNarrative = description ? getElementByTagName(description, 'narrative') : null;
    console.log('Description:', descNarrative?.textContent?.trim()?.substring(0, 100) + '...');
    
    const status = getElementByTagName(activity, 'activity-status');
    console.log('Status code:', status?.getAttribute('code'));
    
    const plannedStart = getElementByAttribute(activity, 'activity-date', 'type', '1');
    console.log('Planned start:', plannedStart?.getAttribute('iso-date'));
    
    const actualStart = getElementByAttribute(activity, 'activity-date', 'type', '2');
    console.log('Actual start:', actualStart?.getAttribute('iso-date'));
    
    const plannedEnd = getElementByAttribute(activity, 'activity-date', 'type', '3');
    console.log('Planned end:', plannedEnd?.getAttribute('iso-date'));
    
    const sectors = getElementsByTagName(activity, 'sector');
    console.log('Sectors found:', sectors.length);
    
    const transactions = getElementsByTagName(activity, 'transaction');
    console.log('Transactions found:', transactions.length);
    
    console.log('\n✅ Basic parsing test passed!');
  }
  
} catch (error) {
  console.error('❌ Parsing failed:', error.message);
}