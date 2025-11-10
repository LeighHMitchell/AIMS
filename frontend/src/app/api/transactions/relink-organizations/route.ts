import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * POST /api/transactions/relink-organizations
 *
 * Finds transactions that have org names but no org IDs, and links them to
 * organizations by matching name or IATI ref.
 */
export async function POST() {
  try {
    const supabase = getSupabaseAdmin();

    console.log('[Relink Orgs] Starting transaction organization relinking...');

    // Get all transactions with org names but no org IDs
    const { data: transactions, error: fetchError } = await supabase
      .from('transactions')
      .select('uuid, provider_org_name, provider_org_ref, receiver_org_name, receiver_org_ref, provider_org_id, receiver_org_id')
      .or('provider_org_id.is.null,receiver_org_id.is.null');

    if (fetchError) {
      console.error('[Relink Orgs] Error fetching transactions:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
    }

    const txCount = transactions?.length || 0;
    console.log(`[Relink Orgs] Found ${txCount} transactions to check`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const tx of transactions || []) {
      let updates: any = {};
      let needsUpdate = false;

      // Check provider org
      if (!tx.provider_org_id && tx.provider_org_name) {
        console.log(`[Relink Orgs] Looking for provider org: ${tx.provider_org_name}`);

        let query = supabase
          .from('organizations')
          .select('id');

        if (tx.provider_org_ref) {
          query = query.or(`iati_org_id.eq.${tx.provider_org_ref},name.ilike.${tx.provider_org_name},alias_refs.cs.{${tx.provider_org_ref}}`);
        } else {
          query = query.ilike('name', tx.provider_org_name);
        }

        const { data: providerOrgs } = await query;

        const matchingOrg = providerOrgs?.find(org => true); // Take first match
        if (matchingOrg) {
          updates.provider_org_id = matchingOrg.id;
          needsUpdate = true;
          console.log(`[Relink Orgs] Found provider org for "${tx.provider_org_name}": ${matchingOrg.id}`);
        }
      }

      // Check receiver org
      if (!tx.receiver_org_id && tx.receiver_org_name) {
        console.log(`[Relink Orgs] Looking for receiver org: ${tx.receiver_org_name}`);

        let query = supabase
          .from('organizations')
          .select('id');

        if (tx.receiver_org_ref) {
          query = query.or(`iati_org_id.eq.${tx.receiver_org_ref},name.ilike.${tx.receiver_org_name},alias_refs.cs.{${tx.receiver_org_ref}}`);
        } else {
          query = query.ilike('name', tx.receiver_org_name);
        }

        const { data: receiverOrgs } = await query;

        const matchingOrg = receiverOrgs?.find(org => true); // Take first match
        if (matchingOrg) {
          updates.receiver_org_id = matchingOrg.id;
          needsUpdate = true;
          console.log(`[Relink Orgs] Found receiver org for "${tx.receiver_org_name}": ${matchingOrg.id}`);
        }
      }

      // Update transaction if we found any orgs
      if (needsUpdate) {
        const { error: updateError } = await supabase
          .from('transactions')
          .update(updates)
          .eq('uuid', tx.uuid);

        if (updateError) {
          console.error(`[Relink Orgs] Error updating transaction ${tx.uuid}:`, updateError);
        } else {
          updatedCount++;
          console.log(`[Relink Orgs] Updated transaction ${tx.uuid}`);
        }
      } else {
        skippedCount++;
      }
    }

    console.log(`[Relink Orgs] Complete: ${updatedCount} updated, ${skippedCount} skipped`);

    return NextResponse.json({
      success: true,
      checked: txCount,
      updated: updatedCount,
      skipped: skippedCount
    });

  } catch (error) {
    console.error('[Relink Orgs] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
