import { NextRequest, NextResponse } from 'next/server';
import { parseStringPromise } from 'xml2js';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const content = await file.text();
    
    // Parse XML
    const result = await parseStringPromise(content, {
      explicitArray: true,
      ignoreAttrs: false,
      tagNameProcessors: [(name) => name.toLowerCase()]
    });

    const activities = result['iati-activities']?.['iati-activity'] || [];
    const debugInfo: any = {
      totalActivities: activities.length,
      activitiesWithTransactions: 0,
      totalTransactions: 0,
      sampleTransactions: [],
      valueFormats: new Set<string>(),
      issues: []
    };

    // Check each activity
    for (let i = 0; i < Math.min(activities.length, 3); i++) {
      const activity = activities[i];
      const activityId = activity['iati-identifier']?.[0]?._ || 
                        activity['iati-identifier']?.[0] || 
                        `Activity ${i}`;
      
      const transactions = activity.transaction || [];
      
      if (transactions.length > 0) {
        debugInfo.activitiesWithTransactions++;
        debugInfo.totalTransactions += transactions.length;
        
        // Sample first transaction
        const firstTrans = transactions[0];
        const valueElem = firstTrans.value?.[0];
        
        let valueFormat = 'unknown';
        let extractedValue = null;
        
        if (valueElem) {
          if (valueElem._) {
            valueFormat = 'text content (_)';
            extractedValue = valueElem._;
          } else if (typeof valueElem === 'string') {
            valueFormat = 'direct string';
            extractedValue = valueElem;
          } else if (typeof valueElem === 'number') {
            valueFormat = 'direct number';
            extractedValue = valueElem;
          } else if (valueElem.$ && Object.keys(valueElem).length === 1) {
            valueFormat = 'attributes only (missing text)';
            debugInfo.issues.push(`Activity ${activityId}: Transaction has value element with only attributes, no text content`);
          } else {
            valueFormat = `object with keys: ${Object.keys(valueElem).join(', ')}`;
          }
        }
        
        debugInfo.valueFormats.add(valueFormat);
        
        debugInfo.sampleTransactions.push({
          activityId,
          transactionType: firstTrans['transaction-type']?.[0]?.$.code || 'unknown',
          valueFormat,
          extractedValue,
          valueElement: valueElem,
          currency: valueElem?.$.currency || 'unknown'
        });
      }
    }

    // Convert Set to Array for JSON serialization
    debugInfo.valueFormats = Array.from(debugInfo.valueFormats);

    return NextResponse.json({
      debug: debugInfo,
      recommendation: debugInfo.issues.length > 0 ? 
        'Some transactions have value elements with only attributes and no text content. The value amount should be between the <value> tags.' : 
        'Transaction structure looks correct.'
    });
  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json(
      { error: 'Failed to debug IATI file', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 