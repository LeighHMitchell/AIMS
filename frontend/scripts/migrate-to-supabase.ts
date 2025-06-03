import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing Supabase environment variables!');
  console.error('Please make sure you have NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env.local file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function migrateActivities() {
  console.log('Starting activities migration...');
  
  try {
    // Read activities from JSON file
    const activitiesPath = path.join(process.cwd(), 'data', 'activities.json');
    const activitiesData = await fs.readFile(activitiesPath, 'utf-8');
    const activities = JSON.parse(activitiesData);
    
    console.log(`Found ${activities.length} activities to migrate`);
    
    // Keep track of old ID to new UUID mapping
    const idMapping: { [oldId: string]: string } = {};
    
    for (const activity of activities) {
      console.log(`Migrating activity: ${activity.title}`);
      
      // Prepare activity data for Supabase
      const activityData = {
        partner_id: null, // Skip partner references for now
        iati_id: activity.iatiId || null,
        title: activity.title,
        description: activity.description || null,
        objectives: activity.objectives || null,
        target_groups: activity.targetGroups || null,
        collaboration_type: activity.collaborationType || null,
        activity_status: activity.activityStatus || activity.status || 'planning',
        publication_status: activity.publicationStatus || (activity.status === 'published' ? 'published' : 'draft'),
        submission_status: activity.submissionStatus || 'draft',
        banner: activity.banner || null,
        created_by_org: null, // Skip organization references for now
        planned_start_date: activity.plannedStartDate && activity.plannedStartDate !== '' ? activity.plannedStartDate : null,
        planned_end_date: activity.plannedEndDate && activity.plannedEndDate !== '' ? activity.plannedEndDate : null,
        actual_start_date: activity.actualStartDate && activity.actualStartDate !== '' ? activity.actualStartDate : null,
        actual_end_date: activity.actualEndDate && activity.actualEndDate !== '' ? activity.actualEndDate : null,
        created_at: activity.createdAt,
        updated_at: activity.updatedAt,
      };
      
      // Insert activity
      const { data: insertedActivity, error: activityError } = await supabase
        .from('activities')
        .insert([activityData])
        .select()
        .single();
      
      if (activityError) {
        console.error(`Error inserting activity ${activity.title}:`, activityError);
        continue;
      }
      
      // Store the ID mapping
      idMapping[activity.id] = insertedActivity.id;
      
      // Migrate sectors if they exist
      if (activity.sectors && activity.sectors.length > 0) {
        const sectorsData = activity.sectors.map((sector: any) => ({
          activity_id: insertedActivity.id,
          sector_code: sector.code || sector.sectorCode,
          sector_name: sector.name || sector.sectorName,
          percentage: sector.percentage,
        }));
        
        const { error: sectorsError } = await supabase
          .from('activity_sectors')
          .insert(sectorsData);
        
        if (sectorsError) {
          console.error(`Error inserting sectors for activity ${activity.title}:`, sectorsError);
        }
      }
      
      // Migrate transactions if they exist
      if (activity.transactions && activity.transactions.length > 0) {
        const transactionsData = activity.transactions.map((transaction: any) => ({
          activity_id: insertedActivity.id,
          transaction_type: transaction.type || transaction.transactionType,
          provider_org: transaction.providerOrg || null,
          receiver_org: transaction.receiverOrg || null,
          value: parseFloat(transaction.value || transaction.amount || 0),
          currency: transaction.currency || 'USD',
          transaction_date: transaction.transactionDate && transaction.transactionDate !== '' ? transaction.transactionDate : null,
          description: transaction.description || null,
        }));
        
        const { error: transactionsError } = await supabase
          .from('transactions')
          .insert(transactionsData);
        
        if (transactionsError) {
          console.error(`Error inserting transactions for activity ${activity.title}:`, transactionsError);
        }
      }
      
      console.log(`Successfully migrated activity: ${activity.title}`);
    }
    
    console.log('Activities migration completed!');
    return idMapping;
  } catch (error) {
    console.error('Error during activities migration:', error);
    return {};
  }
}

async function migratePartners() {
  console.log('Starting partners migration...');
  
  try {
    // Read partners from JSON file
    const partnersPath = path.join(process.cwd(), 'data', 'partners.json');
    const partnersData = await fs.readFile(partnersPath, 'utf-8');
    const partners = JSON.parse(partnersData);
    
    console.log(`Found ${partners.length} partners to migrate`);
    
    for (const partner of partners) {
      console.log(`Migrating partner: ${partner.name}`);
      
      // Prepare partner data for Supabase
      const partnerData = {
        name: partner.name,
        type: partner.type,
        country: partner.country,
        email: partner.email,
        phone: partner.phone,
        address: partner.address,
        website: partner.website,
        created_at: partner.createdAt,
        updated_at: partner.updatedAt,
      };
      
      // Insert partner
      const { error } = await supabase
        .from('partners')
        .insert([partnerData]);
      
      if (error) {
        console.error(`Error inserting partner ${partner.name}:`, error);
      } else {
        console.log(`Successfully migrated partner: ${partner.name}`);
      }
    }
    
    console.log('Partners migration completed!');
  } catch (error) {
    console.error('Error during partners migration:', error);
  }
}

async function migrateActivityLogs(activityIdMapping: { [oldId: string]: string }) {
  console.log('Starting activity logs migration...');
  
  try {
    // Read activity logs from JSON file
    const logsPath = path.join(process.cwd(), 'data', 'activity-logs.json');
    const logsData = await fs.readFile(logsPath, 'utf-8');
    const logs = JSON.parse(logsData);
    
    console.log(`Found ${logs.length} activity logs to migrate`);
    
    for (const log of logs) {
      // Skip logs without action
      if (!log.action) {
        console.log('Skipping log without action');
        continue;
      }
      
      console.log(`Migrating log: ${log.action}`);
      
      // Map old activity ID to new UUID if it exists
      const newActivityId = log.activityId && activityIdMapping[log.activityId] ? activityIdMapping[log.activityId] : null;
      
      // Prepare log data for Supabase
      const logData = {
        user_id: null, // We don't have user UUIDs yet
        activity_id: newActivityId,
        action: log.action,
        details: log.details || {},
        created_at: log.timestamp || log.createdAt,
      };
      
      // Insert log
      const { error } = await supabase
        .from('activity_logs')
        .insert([logData]);
      
      if (error) {
        console.error(`Error inserting log:`, error);
      }
    }
    
    console.log('Activity logs migration completed!');
  } catch (error) {
    console.error('Error during activity logs migration:', error);
  }
}

async function main() {
  console.log('Starting data migration to Supabase...');
  console.log('================================');
  
  // Migrate data in order
  await migratePartners();
  console.log('');
  
  const activityIdMapping = await migrateActivities();
  console.log('');
  
  await migrateActivityLogs(activityIdMapping);
  console.log('');
  
  console.log('================================');
  console.log('Migration completed!');
  console.log('');
  console.log('Next steps:');
  console.log('1. Verify the data in your Supabase dashboard');
  console.log('2. Update your API routes to use the Supabase version');
  console.log('3. Test the application thoroughly');
}

// Run the migration
main().catch(console.error); 