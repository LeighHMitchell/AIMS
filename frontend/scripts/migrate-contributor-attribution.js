#!/usr/bin/env node

/**
 * Data Migration Script: Contributor Attribution Fix
 * 
 * This script addresses the issue where activities currently display only the creator's 
 * organization instead of actual contributor organizations. It:
 * 
 * 1. Checks all existing activities for contributor data
 * 2. If contributors exist, ensures proper attribution
 * 3. If no contributors exist, removes misleading creator organization display
 * 4. Adds creator as a contributor if they have actual involvement (transactions, etc.)
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '❌');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '❌');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function migrateContributorAttribution() {
  console.log('🚀 Starting Contributor Attribution Migration...\n');

  try {
    // Step 1: Fetch all activities with their current data
    console.log('📊 Fetching all activities...');
    const { data: activities, error: activitiesError } = await supabase
      .from('activities')
      .select(`
        id,
        title,
        created_by_org,
        created_by,
        activity_contributors (
          id,
          organization_id,
          status,
          role,
          organization:organizations(id, name, acronym)
        ),
        transactions (
          id,
          provider_org,
          receiver_org,
          organization_id
        )
      `);

    if (activitiesError) {
      throw new Error(`Failed to fetch activities: ${activitiesError.message}`);
    }

    console.log(`✅ Found ${activities.length} activities to process\n`);

    // Step 2: Analyze and categorize activities
    const stats = {
      withContributors: 0,
      withoutContributors: 0,
      creatorAsContributor: 0,
      transactionBasedContributors: 0,
      updated: 0,
      errors: 0
    };

    const updates = [];

    for (const activity of activities) {
      console.log(`🔍 Processing: "${activity.title}" (${activity.id})`);
      
      const existingContributors = activity.activity_contributors || [];
      const acceptedContributors = existingContributors.filter(c => c.status === 'accepted');
      
      if (acceptedContributors.length > 0) {
        stats.withContributors++;
        console.log(`   ✅ Has ${acceptedContributors.length} accepted contributors`);
        
        // Check if contributors have proper roles
        const contributorsNeedingRoles = acceptedContributors.filter(c => !c.role || c.role === 'contributor');
        if (contributorsNeedingRoles.length > 0) {
          console.log(`   🔧 ${contributorsNeedingRoles.length} contributors need role assignment`);
          updates.push({
            type: 'assignRoles',
            activityId: activity.id,
            contributors: contributorsNeedingRoles,
            transactions: activity.transactions
          });
        }
      } else {
        stats.withoutContributors++;
        console.log(`   ⚠️  No accepted contributors found`);
        
        // Check if creator organization should be added as contributor based on transactions
        if (activity.created_by_org) {
          const creatorTransactions = activity.transactions?.filter(t => 
            t.provider_org === activity.created_by_org || 
            t.receiver_org === activity.created_by_org ||
            t.organization_id === activity.created_by_org
          ) || [];
          
          if (creatorTransactions.length > 0) {
            console.log(`   💡 Creator org has ${creatorTransactions.length} transactions - adding as contributor`);
            stats.creatorAsContributor++;
            updates.push({
              type: 'addCreatorAsContributor',
              activityId: activity.id,
              organizationId: activity.created_by_org,
              createdBy: activity.created_by,
              transactions: creatorTransactions
            });
          } else {
            console.log(`   ℹ️  Creator org has no transactions - will show "No contributors listed"`);
          }
        }
      }
      
      // Check for transaction-based contributors not yet in contributors table
      const transactionOrgs = new Set();
      activity.transactions?.forEach(t => {
        if (t.provider_org) transactionOrgs.add(t.provider_org);
        if (t.receiver_org) transactionOrgs.add(t.receiver_org);
        if (t.organization_id) transactionOrgs.add(t.organization_id);
      });
      
      const existingContributorOrgs = new Set(existingContributors.map(c => c.organization_id));
      const missingContributorOrgs = Array.from(transactionOrgs).filter(orgId => 
        !existingContributorOrgs.has(orgId) && orgId !== activity.created_by_org
      );
      
      if (missingContributorOrgs.length > 0) {
        console.log(`   🔍 Found ${missingContributorOrgs.length} orgs with transactions but not in contributors`);
        stats.transactionBasedContributors++;
        updates.push({
          type: 'addTransactionBasedContributors',
          activityId: activity.id,
          organizationIds: missingContributorOrgs,
          createdBy: activity.created_by,
          transactions: activity.transactions
        });
      }
      
      console.log(''); // Empty line for readability
    }

    // Step 3: Display migration plan
    console.log('📋 Migration Plan Summary:');
    console.log(`   Activities with contributors: ${stats.withContributors}`);
    console.log(`   Activities without contributors: ${stats.withoutContributors}`);
    console.log(`   Creator orgs to add as contributors: ${stats.creatorAsContributor}`);
    console.log(`   Transaction-based contributors to add: ${stats.transactionBasedContributors}`);
    console.log(`   Total updates planned: ${updates.length}\n`);

    // Step 4: Execute updates
    if (updates.length === 0) {
      console.log('✅ No updates needed - all activities have proper contributor attribution!');
      return;
    }

    console.log('🔧 Executing updates...\n');

    for (const update of updates) {
      try {
        switch (update.type) {
          case 'assignRoles':
            await assignContributorRoles(update);
            break;
          case 'addCreatorAsContributor':
            await addCreatorAsContributor(update);
            break;
          case 'addTransactionBasedContributors':
            await addTransactionBasedContributors(update);
            break;
        }
        stats.updated++;
      } catch (error) {
        console.error(`❌ Error updating activity ${update.activityId}:`, error.message);
        stats.errors++;
      }
    }

    // Step 5: Final summary
    console.log('\n🎉 Migration Complete!');
    console.log(`   ✅ Successfully updated: ${stats.updated}`);
    console.log(`   ❌ Errors: ${stats.errors}`);
    
    if (stats.errors > 0) {
      console.log('\n⚠️  Some updates failed. Check the error messages above.');
      process.exit(1);
    }

  } catch (error) {
    console.error('💥 Migration failed:', error.message);
    process.exit(1);
  }
}

async function assignContributorRoles(update) {
  console.log(`🔧 Assigning roles for activity ${update.activityId}...`);
  
  for (const contributor of update.contributors) {
    // Determine role based on transaction patterns
    const orgTransactions = update.transactions?.filter(t => 
      t.provider_org === contributor.organization_id ||
      t.receiver_org === contributor.organization_id ||
      t.organization_id === contributor.organization_id
    ) || [];
    
    let role = 'contributor'; // default
    
    if (orgTransactions.some(t => t.provider_org === contributor.organization_id)) {
      role = 'funder';
    } else if (orgTransactions.some(t => t.receiver_org === contributor.organization_id)) {
      role = 'implementer';
    }
    
    const { error } = await supabase
      .from('activity_contributors')
      .update({ 
        role,
        display_order: role === 'funder' ? 1 : role === 'implementer' ? 2 : 5
      })
      .eq('id', contributor.id);
    
    if (error) throw error;
    
    console.log(`   ✅ Set ${contributor.organization?.name} as ${role}`);
  }
}

async function addCreatorAsContributor(update) {
  console.log(`👤 Adding creator org as contributor for activity ${update.activityId}...`);
  
  // Determine role based on transactions
  let role = 'contributor';
  if (update.transactions.some(t => t.provider_org === update.organizationId)) {
    role = 'funder';
  } else if (update.transactions.some(t => t.receiver_org === update.organizationId)) {
    role = 'implementer';
  }
  
  const { error } = await supabase
    .from('activity_contributors')
    .insert({
      activity_id: update.activityId,
      organization_id: update.organizationId,
      status: 'accepted',
      role,
      display_order: role === 'funder' ? 1 : role === 'implementer' ? 2 : 5,
      nominated_by: update.createdBy,
      nominated_at: new Date().toISOString(),
      responded_at: new Date().toISOString(),
      can_edit_own_data: true,
      can_view_other_drafts: false
    });
  
  if (error) throw error;
  
  console.log(`   ✅ Added creator org as ${role}`);
}

async function addTransactionBasedContributors(update) {
  console.log(`💰 Adding transaction-based contributors for activity ${update.activityId}...`);
  
  const contributorsToAdd = [];
  
  for (const orgId of update.organizationIds) {
    const orgTransactions = update.transactions?.filter(t => 
      t.provider_org === orgId ||
      t.receiver_org === orgId ||
      t.organization_id === orgId
    ) || [];
    
    let role = 'contributor';
    if (orgTransactions.some(t => t.provider_org === orgId)) {
      role = 'funder';
    } else if (orgTransactions.some(t => t.receiver_org === orgId)) {
      role = 'implementer';
    }
    
    contributorsToAdd.push({
      activity_id: update.activityId,
      organization_id: orgId,
      status: 'accepted',
      role,
      display_order: role === 'funder' ? 1 : role === 'implementer' ? 2 : 5,
      nominated_by: update.createdBy,
      nominated_at: new Date().toISOString(),
      responded_at: new Date().toISOString(),
      can_edit_own_data: true,
      can_view_other_drafts: false
    });
  }
  
  if (contributorsToAdd.length > 0) {
    const { error } = await supabase
      .from('activity_contributors')
      .insert(contributorsToAdd);
    
    if (error) throw error;
    
    console.log(`   ✅ Added ${contributorsToAdd.length} transaction-based contributors`);
  }
}

// Run the migration
if (require.main === module) {
  migrateContributorAttribution()
    .then(() => {
      console.log('\n🎯 Migration completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateContributorAttribution }; 