// ========================================
// Test Tag Creation Directly
// Run this in your browser console
// ========================================

async function testTagCreation() {
  console.log('=== Testing Tag Creation ===\n');
  
  // Test 1: First tag from your XML (this one worked)
  console.log('TEST 1: Tag with vocabulary="1", code="1"');
  try {
    const response1 = await fetch('/api/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'A description of the tag',
        vocabulary: '1',
        code: '1'
      })
    });
    
    const result1 = await response1.json();
    console.log('Status:', response1.status);
    console.log('Result:', result1);
    
    if (response1.ok) {
      console.log('✅ Tag 1 created/found successfully\n');
    } else {
      console.error('❌ Tag 1 failed:', result1.error, '\n');
    }
  } catch (e) {
    console.error('❌ Error:', e, '\n');
  }
  
  // Test 2: Second tag from your XML (this one failed)
  console.log('TEST 2: Tag with vocabulary="99", code="T1", vocabulary-uri');
  try {
    const response2 = await fetch('/api/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'A description of the tag',  // Same name as tag 1!
        vocabulary: '99',
        code: 'T1',
        vocabulary_uri: 'http://example.com/vocab.html'
      })
    });
    
    const result2 = await response2.json();
    console.log('Status:', response2.status);
    console.log('Result:', result2);
    
    if (response2.ok) {
      console.log('✅ Tag 2 created/found successfully\n');
    } else {
      console.error('❌ Tag 2 failed:', result2.error);
      console.error('Details:', result2.details || result2);
      console.log('\n');
    }
  } catch (e) {
    console.error('❌ Error:', e, '\n');
  }
  
  console.log('=== Analysis ===');
  console.log('Both tags have the SAME NAME: "A description of the tag"');
  console.log('But DIFFERENT vocabularies: "1" vs "99"');
  console.log('This should be allowed with the name+vocabulary unique constraint');
  console.log('\nIf Tag 2 fails, check:');
  console.log('1. Is the unique constraint on name+vocabulary applied?');
  console.log('2. Or is there still a UNIQUE constraint on just "name"?');
}

// Run it
testTagCreation();

