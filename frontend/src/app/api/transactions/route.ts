import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { Transaction } from '@/types/transaction';

// Helper to validate and fix activity ID format
function validateActivityId(activityId: string): string | null {
    if (!activityId) return null;
    
    // Check if it's already a valid UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(activityId)) {
        return activityId;
    }
    
    // If it's a malformed activity ID like "activity_123_abc", create a deterministic UUID from it
    if (activityId.startsWith('activity_')) {
        console.log('[TRANSACTION API] Converting malformed activity ID to UUID:', activityId);
        
        // Create a deterministic UUID based on the activity ID string
        // This ensures the same malformed ID always maps to the same UUID
        const crypto = require('crypto');
        const hash = crypto.createHash('md5').update(activityId).digest('hex');
        const uuid = [
            hash.substring(0, 8),
            hash.substring(8, 12),
            hash.substring(12, 16),
            hash.substring(16, 20),
            hash.substring(20, 32)
        ].join('-');
        
        console.log('[TRANSACTION API] Converted', activityId, 'to UUID:', uuid);
        return uuid;
    }
    
    // For any other format, create a random UUID
    console.log('[TRANSACTION API] Creating new UUID for invalid activity ID:', activityId);
    return require('crypto').randomUUID();
}

// Helper to convert organization UUID back to name for display
async function getOrganizationName(organizationId: string): Promise<string> {
    if (!organizationId || organizationId === 'Other') {
        return organizationId || 'Other';
    }
    
    console.log('[TRANSACTION API] Converting UUID to name:', organizationId);
    
    // Check if it's a UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(organizationId)) {
        // If not a UUID, return as-is (already a name)
        return organizationId;
    }
    
    // Look up organization name by UUID
    const { data, error } = await supabaseAdmin
        .from('organizations')
        .select('name, acronym, full_name')
        .eq('id', organizationId)
        .single();
    
    if (!error && data) {
        // Create display name: "Full Name (Acronym)" or just "Name"
        const displayName = data.full_name || data.name || 'Unknown Organization';
        const result = data.acronym && displayName !== data.acronym 
            ? `${displayName} (${data.acronym})`
            : displayName;
        console.log('[TRANSACTION API] Converted UUID', organizationId, 'to name:', result);
        return result;
    }
    
    console.warn('[TRANSACTION API] Could not find organization name for UUID:', organizationId);
    return `Organization (${organizationId.substring(0, 8)}...)`;
}

// Helper to find organization ID by name or UUID
async function getOrganizationId(identifier: string): Promise<string | null> {
    if (!identifier) return null;
    
    console.log('[TRANSACTION API] Looking up organization for identifier:', identifier);
    
    // Check if it's already a UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(identifier)) {
        console.log('[TRANSACTION API] Identifier is already a UUID');
        return identifier;
    }

    // Clean up the identifier - remove parentheses and extra spaces
    let cleanIdentifier = identifier.trim();
    
    // If it's in format "NAME (ACRONYM)", extract both parts
    const match = cleanIdentifier.match(/^(.+?)\s*\(([^)]+)\)$/);
    let searchTerms = [cleanIdentifier.toLowerCase()];
    
    if (match) {
        const [, name, acronym] = match;
        searchTerms = [
            name.trim().toLowerCase(),
            acronym.trim().toLowerCase(),
            cleanIdentifier.toLowerCase()
        ];
    }
    
    console.log('[TRANSACTION API] Search terms:', searchTerms);

    // Try to find organization by any of the search terms
    for (const term of searchTerms) {
        const { data, error } = await supabaseAdmin
            .from('organizations')
            .select('id, name, acronym, full_name')
            .or(`name.ilike.%${term}%,acronym.ilike.%${term}%,full_name.ilike.%${term}%`)
            .limit(10);
        
        if (!error && data && data.length > 0) {
            console.log('[TRANSACTION API] Found organizations:', data);
            // Return the first exact match or the first partial match
            const exactMatch = data.find((org: { id: string; name: string | null; acronym: string | null; full_name: string | null }) => 
                org.name?.toLowerCase() === term || 
                org.acronym?.toLowerCase() === term ||
                org.full_name?.toLowerCase() === term
            );
            const result = exactMatch || data[0];
            console.log('[TRANSACTION API] Selected organization:', result);
            return result.id;
        }
    }
    
    console.warn(`[TRANSACTION API] Could not find organization for identifier: ${identifier}`);
    return null;
}

// Helper to parse and format date
function parseTransactionDate(dateStr: string): string | null {
    if (!dateStr) return null;
    
    console.log('[TRANSACTION API] Parsing date:', dateStr);
    
    // If already in yyyy-MM-dd format, return as is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return dateStr;
    }
    
    // Try to parse dd/MM/yyyy format
    const ddmmyyyyMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (ddmmyyyyMatch) {
        const [, day, month, year] = ddmmyyyyMatch;
        const formatted = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        console.log('[TRANSACTION API] Converted date from', dateStr, 'to', formatted);
        return formatted;
    }
    
    // Try to parse other date formats using Date constructor
    try {
        const parsed = new Date(dateStr);
        if (!isNaN(parsed.getTime())) {
            const formatted = parsed.toISOString().split('T')[0];
            console.log('[TRANSACTION API] Parsed date from', dateStr, 'to', formatted);
            return formatted;
        }
    } catch (error) {
        console.error('[TRANSACTION API] Error parsing date:', error);
    }
    
    console.warn('[TRANSACTION API] Could not parse date:', dateStr);
    return null;
}

// Helper to ensure activity exists in database
async function ensureActivityExists(activityId: string): Promise<void> {
    if (!activityId) return;
    
    console.log('[TRANSACTION API] Checking if activity exists:', activityId);
    
    // Check if activity exists
    const { data: existingActivity, error: checkError } = await supabaseAdmin
        .from('activities')
        .select('id')
        .eq('id', activityId)
        .single();
    
    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = not found
        console.error('[TRANSACTION API] Error checking activity:', checkError);
        throw checkError;
    }
    
    if (existingActivity) {
        console.log('[TRANSACTION API] Activity exists:', activityId);
        return;
    }
    
    // Activity doesn't exist, create it
    console.log('[TRANSACTION API] Creating missing activity:', activityId);
    
    const { error: createError } = await supabaseAdmin
        .from('activities')
        .insert({
            id: activityId,
            title: 'Legacy Activity (Auto-created for transactions)',
            description: 'This activity was automatically created to support existing transactions',
            activity_status: 'planning',
            publication_status: 'draft',
            submission_status: 'draft'
        });
    
    if (createError) {
        console.error('[TRANSACTION API] Error creating activity:', createError);
        throw createError;
    }
    
    console.log('[TRANSACTION API] Successfully created activity:', activityId);
}

// POST /api/transactions - Create a new transaction
export async function POST(request: NextRequest) {
    console.log('[TRANSACTION API] ========== START POST REQUEST ==========');
    
    try {
        console.log('[TRANSACTION API] 1. Parsing request body...');
        const body = await request.json() as Transaction;
        console.log('[TRANSACTION API] 2. Request body parsed successfully:', JSON.stringify(body, null, 2));

        console.log('[TRANSACTION API] 3. Converting organization UUIDs to names...');
        const providerName = await getOrganizationName(body.providerOrg);
        const receiverName = await getOrganizationName(body.receiverOrg);
        console.log('[TRANSACTION API] 4. Provider name:', providerName);
        console.log('[TRANSACTION API] 5. Receiver name:', receiverName);

        // Use the UUIDs directly for organization_id (relational integrity)
        const providerId = body.providerOrg; // Frontend sends UUID
        const receiverId = body.receiverOrg; // Frontend sends UUID

        console.log('[TRANSACTION API] 6. Parsing transaction date...');
        const formattedDate = parseTransactionDate(body.transactionDate);
        console.log('[TRANSACTION API] 7. Formatted date result:', formattedDate);
        
        if (!formattedDate) {
            console.error('[TRANSACTION API] 8. ERROR: Invalid transaction date:', body.transactionDate);
            return NextResponse.json({ error: `Invalid transaction date format: ${body.transactionDate}` }, { status: 400 });
        }

        console.log('[TRANSACTION API] 9. Preparing transaction data for database...');
        console.log('[TRANSACTION API] 9a. Original activity ID:', body.activityId);
        const validatedActivityId = validateActivityId(body.activityId);
        console.log('[TRANSACTION API] 9b. Validated activity ID:', validatedActivityId);
        
        // Ensure the activity exists in the database
        if (validatedActivityId) {
            console.log('[TRANSACTION API] 9c. Ensuring activity exists...');
            await ensureActivityExists(validatedActivityId);
            console.log('[TRANSACTION API] 9d. Activity check completed');
        }
        
        const newTransactionData = {
            id: body.id,
            activity_id: validatedActivityId,
            transaction_type: body.type,
            value: body.value,
            currency: body.currency,
            transaction_date: formattedDate,
            organization_id: providerId, // Provider organization UUID for relational integrity
            provider_org: providerName, // Store original name/identifier as text
            receiver_org: receiverName, // Store original name/identifier as text
            description: body.narrative,
        };

        console.log('[TRANSACTION API] 10. Transaction data prepared:', JSON.stringify(newTransactionData, null, 2));

        console.log('[TRANSACTION API] 11. Inserting into database...');
        const { data, error } = await supabaseAdmin
            .from('transactions')
            .insert(newTransactionData)
            .select()
            .single();

        console.log('[TRANSACTION API] 12. Database operation completed');
        console.log('[TRANSACTION API] 13. Database error (if any):', error);
        console.log('[TRANSACTION API] 14. Database result (if any):', data);

        if (error) {
            console.error('[TRANSACTION API] 15. DATABASE ERROR DETAILS:');
            console.error('[TRANSACTION API] Error message:', error.message);
            console.error('[TRANSACTION API] Error code:', error.code);
            console.error('[TRANSACTION API] Error details:', JSON.stringify(error, null, 2));
            throw new Error(`Database error: ${error.message} (Code: ${error.code})`);
        }

        console.log('[TRANSACTION API] 16. SUCCESS: Transaction saved successfully:', data);
        console.log('[TRANSACTION API] ========== END POST REQUEST SUCCESS ==========');
        return NextResponse.json(data);

    } catch (error) {
        console.error('[TRANSACTION API] ========== CATCH BLOCK ERROR ==========');
        console.error('[TRANSACTION API] Error type:', typeof error);
        console.error('[TRANSACTION API] Error instanceof Error:', error instanceof Error);
        console.error('[TRANSACTION API] Error message:', error instanceof Error ? error.message : String(error));
        console.error('[TRANSACTION API] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
        console.error('[TRANSACTION API] Full error object:', error);
        console.error('[TRANSACTION API] ========== END POST REQUEST ERROR ==========');
        
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return NextResponse.json({ error: `Failed to create transaction: ${errorMessage}` }, { status: 500 });
    }
}

// PUT /api/transactions - Update an existing transaction
export async function PUT(request: NextRequest) {
    try {
        const body = await request.json() as Transaction;
        console.log('[TRANSACTION API] Updating transaction:', body.id);

        // Convert UUIDs to organization names for storage
        const providerName = await getOrganizationName(body.providerOrg);
        const receiverName = await getOrganizationName(body.receiverOrg);
        const providerId = body.providerOrg; // Frontend sends UUID
        const receiverId = body.receiverOrg; // Frontend sends UUID

        console.log('[TRANSACTION API PUT] Provider name:', providerName);
        console.log('[TRANSACTION API PUT] Receiver name:', receiverName);

        // Parse and format the transaction date
        const formattedDate = parseTransactionDate(body.transactionDate);
        if (!formattedDate) {
            return NextResponse.json({ error: `Invalid transaction date format: ${body.transactionDate}` }, { status: 400 });
        }

        const updateData: {
            transaction_type: string;
            value: number;
            currency: string;
            transaction_date: string;
            organization_id: string | null;
            provider_org: string;
            receiver_org: string;
            description: string | undefined;
            updated_at: string;
            activity_id?: string;
        } = {
            transaction_type: body.type,
            value: body.value,
            currency: body.currency,
            transaction_date: formattedDate,
            organization_id: providerId, // Provider organization UUID for relational integrity (can be null)
            provider_org: providerName, // Store original name/identifier as text
            receiver_org: receiverName, // Store original name/identifier as text
            description: body.narrative,
            updated_at: new Date().toISOString(),
        };

        // Only update activity_id if it's provided in the request
        if (body.activityId) {
            const validatedId = validateActivityId(body.activityId);
            if (validatedId) {
                updateData.activity_id = validatedId;
            }
        }

        const { data, error } = await supabaseAdmin
            .from('transactions')
            .update(updateData)
            .eq('id', body.id)
            .select()
            .single();

        if (error) throw error;

        console.log('[TRANSACTION API] Successfully updated transaction:', data);
        return NextResponse.json(data);

    } catch (error) {
        console.error('[TRANSACTION API] Error updating transaction:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: `Failed to update transaction: ${errorMessage}` }, { status: 500 });
    }
}

// DELETE /api/transactions - Delete a transaction
export async function DELETE(request: NextRequest) {
    try {
        const url = new URL(request.url);
        const transactionId = url.searchParams.get('id');
        
        if (!transactionId) {
            return NextResponse.json({ error: 'Transaction ID is required' }, { status: 400 });
        }

        const { error } = await supabaseAdmin
            .from('transactions')
            .delete()
            .eq('id', transactionId);

        if (error) throw error;

        console.log('[TRANSACTION API] Successfully deleted transaction:', transactionId);
        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('[TRANSACTION API] Error deleting transaction:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: `Failed to delete transaction: ${errorMessage}` }, { status: 500 });
    }
} 