import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function deduplicatePartners() {
  console.log('Starting partner deduplication...\n');
  
  // Fetch all partners
  const { data: partners, error: fetchError } = await supabase
    .from('partners')
    .select('*')
    .order('name');
    
  if (fetchError || !partners) {
    console.error('Error fetching partners:', fetchError);
    return;
  }
  
  console.log(`Found ${partners.length} total partners`);
  
  // Group by name
  const partnersByName = partners.reduce((acc: any, partner: any) => {
    if (!acc[partner.name]) {
      acc[partner.name] = [];
    }
    acc[partner.name].push(partner);
    return acc;
  }, {});
  
  // Process duplicates
  let deletedCount = 0;
  
  for (const [name, duplicates] of Object.entries(partnersByName) as [string, any[]][]) {
    if (duplicates.length > 1) {
      console.log(`\nFound ${duplicates.length} entries for "${name}"`);
      
      // Keep the one with the most data (check for filled fields)
      const scorePartner = (p: any) => {
        let score = 0;
        if (p.email) score++;
        if (p.phone) score++;
        if (p.address) score++;
        if (p.website) score++;
        if (p.type) score++;
        if (p.country) score++;
        return score;
      };
      
      // Sort by score (most complete data first), then by created_at (oldest first)
      duplicates.sort((a, b) => {
        const scoreA = scorePartner(a);
        const scoreB = scorePartner(b);
        if (scoreA !== scoreB) return scoreB - scoreA;
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });
      
      const keepPartner = duplicates[0];
      const deletePartners = duplicates.slice(1);
      
      console.log(`  Keeping: ${keepPartner.id} (score: ${scorePartner(keepPartner)}, created: ${keepPartner.created_at})`);
      
      // Delete duplicates
      for (const partner of deletePartners) {
        console.log(`  Deleting: ${partner.id} (score: ${scorePartner(partner)}, created: ${partner.created_at})`);
        
        const { error: deleteError } = await supabase
          .from('partners')
          .delete()
          .eq('id', partner.id);
          
        if (deleteError) {
          console.error(`    Error deleting partner ${partner.id}:`, deleteError);
        } else {
          deletedCount++;
        }
      }
    }
  }
  
  console.log(`\n✅ Deduplication complete!`);
  console.log(`   Deleted ${deletedCount} duplicate partners`);
  console.log(`   Remaining unique partners: ${Object.keys(partnersByName).length}`);
}

// Run the script
deduplicatePartners().catch(console.error); 