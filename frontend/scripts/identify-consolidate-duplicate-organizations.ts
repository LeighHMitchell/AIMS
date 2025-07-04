import { getSupabaseAdmin } from '../src/lib/supabase';

interface Organization {
  id: string;
  name: string;
  acronym: string | null;
  type: string;
  country: string | null;
  description: string | null;
  website: string | null;
  logo_url: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface DuplicateGroup {
  organizations: Organization[];
  matchType: 'exact_name' | 'exact_acronym' | 'similar_name';
  matchValue: string;
}

// Function to calculate similarity between two strings (Levenshtein distance)
function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

// Function to normalize organization names for comparison
function normalizeString(str: string | null): string {
  if (!str) return '';
  return str.toLowerCase().trim().replace(/\s+/g, ' ');
}

// Function to find duplicate groups
async function findDuplicateOrganizations(): Promise<DuplicateGroup[]> {
  const supabase = getSupabaseAdmin();
  
  // Fetch all organizations
  const { data: organizations, error } = await supabase
    .from('organizations')
    .select('*')
    .order('name');
  
  if (error) {
    console.error('Error fetching organizations:', error);
    return [];
  }
  
  if (!organizations || organizations.length === 0) {
    console.log('No organizations found');
    return [];
  }
  
  console.log(`Found ${organizations.length} organizations`);
  
  const duplicateGroups: DuplicateGroup[] = [];
  const processedIds = new Set<string>();
  
  // Find exact name matches
  const nameGroups = new Map<string, Organization[]>();
  organizations.forEach((org: Organization) => {
    const normalizedName = normalizeString(org.name);
    if (!nameGroups.has(normalizedName)) {
      nameGroups.set(normalizedName, []);
    }
    nameGroups.get(normalizedName)!.push(org);
  });
  
  // Add groups with multiple organizations (exact name duplicates)
  nameGroups.forEach((orgs, name) => {
    if (orgs.length > 1) {
      duplicateGroups.push({
        organizations: orgs,
        matchType: 'exact_name',
        matchValue: name
      });
      orgs.forEach(org => processedIds.add(org.id));
    }
  });
  
  // Find exact acronym matches (excluding null/empty acronyms)
  const acronymGroups = new Map<string, Organization[]>();
  organizations.forEach((org: Organization) => {
    if (org.acronym) {
      const normalizedAcronym = normalizeString(org.acronym);
      if (!acronymGroups.has(normalizedAcronym)) {
        acronymGroups.set(normalizedAcronym, []);
      }
      acronymGroups.get(normalizedAcronym)!.push(org);
    }
  });
  
  // Add groups with multiple organizations (exact acronym duplicates)
  acronymGroups.forEach((orgs, acronym) => {
    if (orgs.length > 1) {
      // Only add if not already in name duplicates
      const newOrgs = orgs.filter(org => !processedIds.has(org.id));
      if (newOrgs.length > 1) {
        duplicateGroups.push({
          organizations: orgs,
          matchType: 'exact_acronym',
          matchValue: acronym
        });
        orgs.forEach(org => processedIds.add(org.id));
      }
    }
  });
  
  // Find similar names (fuzzy matching)
  const unprocessedOrgs = organizations.filter((org: Organization) => !processedIds.has(org.id));
  const similarityThreshold = 0.85; // 85% similarity
  
  for (let i = 0; i < unprocessedOrgs.length; i++) {
    const org1 = unprocessedOrgs[i];
    if (processedIds.has(org1.id)) continue;
    
    const similarOrgs: Organization[] = [org1];
    
    for (let j = i + 1; j < unprocessedOrgs.length; j++) {
      const org2 = unprocessedOrgs[j];
      if (processedIds.has(org2.id)) continue;
      
      const similarity = calculateSimilarity(
        normalizeString(org1.name),
        normalizeString(org2.name)
      );
      
      if (similarity >= similarityThreshold) {
        similarOrgs.push(org2);
      }
    }
    
    if (similarOrgs.length > 1) {
      duplicateGroups.push({
        organizations: similarOrgs,
        matchType: 'similar_name',
        matchValue: normalizeString(org1.name)
      });
      similarOrgs.forEach(org => processedIds.add(org.id));
    }
  }
  
  return duplicateGroups;
}

// Function to merge organization data
function mergeOrganizations(organizations: Organization[]): Organization {
  // Sort by updated_at to prefer most recently updated data
  const sorted = [...organizations].sort((a, b) => 
    new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );
  
  // Use the most recently updated organization as base
  const merged = { ...sorted[0] };
  
  // Merge data from other organizations, preferring non-null values
  sorted.slice(1).forEach(org => {
    // Keep the earliest created_at
    if (new Date(org.created_at) < new Date(merged.created_at)) {
      merged.created_at = org.created_at;
    }
    
    // Merge fields, preferring non-null values
    if (!merged.acronym && org.acronym) merged.acronym = org.acronym;
    if (!merged.description && org.description) merged.description = org.description;
    if (!merged.website && org.website) merged.website = org.website;
    if (!merged.logo_url && org.logo_url) merged.logo_url = org.logo_url;
    if (!merged.contact_email && org.contact_email) merged.contact_email = org.contact_email;
    if (!merged.contact_phone && org.contact_phone) merged.contact_phone = org.contact_phone;
    if (!merged.address && org.address) merged.address = org.address;
    if (!merged.country && org.country) merged.country = org.country;
    
    // If any organization is active, keep it active
    if (org.is_active) merged.is_active = true;
  });
  
  return merged;
}

// Function to update references and consolidate organizations
async function consolidateDuplicates(group: DuplicateGroup, primaryOrgId: string) {
  const supabase = getSupabaseAdmin();
  const otherOrgIds = group.organizations
    .filter(org => org.id !== primaryOrgId)
    .map(org => org.id);
  
  console.log(`\nConsolidating ${group.organizations.length} organizations into ${primaryOrgId}`);
  console.log('Organizations to be merged:', otherOrgIds);
  
  try {
    // Update all references to point to the primary organization
    const updates = [
      // Update activities table - reporting_org_id
      supabase
        .from('activities')
        .update({ reporting_org_id: primaryOrgId })
        .in('reporting_org_id', otherOrgIds),
      
      // Update activity_contributors table
      supabase
        .from('activity_contributors')
        .update({ organization_id: primaryOrgId })
        .in('organization_id', otherOrgIds),
      
      // Update users table
      supabase
        .from('users')
        .update({ organization_id: primaryOrgId })
        .in('organization_id', otherOrgIds),
      
      // Update user_organizations table
      supabase
        .from('user_organizations')
        .update({ organization_id: primaryOrgId })
        .in('organization_id', otherOrgIds),
      
      // Update custom_group_organizations table
      supabase
        .from('custom_group_organizations')
        .update({ organization_id: primaryOrgId })
        .in('organization_id', otherOrgIds),
    ];
    
    // Execute all updates
    const results = await Promise.all(updates);
    
    // Check for errors
    results.forEach((result, index) => {
      if (result.error) {
        console.error(`Error updating table ${index}:`, result.error);
      }
    });
    
    // Delete duplicate organizations
    const { error: deleteError } = await supabase
      .from('organizations')
      .delete()
      .in('id', otherOrgIds);
    
    if (deleteError) {
      console.error('Error deleting duplicate organizations:', deleteError);
    } else {
      console.log(`Successfully deleted ${otherOrgIds.length} duplicate organizations`);
    }
    
  } catch (error) {
    console.error('Error during consolidation:', error);
  }
}

// Main function
async function main() {
  console.log('Starting duplicate organization identification and consolidation...\n');
  
  const duplicateGroups = await findDuplicateOrganizations();
  
  if (duplicateGroups.length === 0) {
    console.log('No duplicate organizations found!');
    return;
  }
  
  console.log(`Found ${duplicateGroups.length} groups of duplicate organizations:\n`);
  
  // Display duplicate groups
  duplicateGroups.forEach((group, index) => {
    console.log(`\nGroup ${index + 1} (${group.matchType}): ${group.matchValue}`);
    console.log('Organizations in this group:');
    group.organizations.forEach(org => {
      console.log(`  - ID: ${org.id}`);
      console.log(`    Name: ${org.name}`);
      console.log(`    Acronym: ${org.acronym || 'N/A'}`);
      console.log(`    Type: ${org.type}`);
      console.log(`    Country: ${org.country || 'N/A'}`);
      console.log(`    Created: ${org.created_at}`);
      console.log(`    Updated: ${org.updated_at}`);
      console.log('');
    });
    
    // Merge organizations to show what the consolidated version would look like
    const merged = mergeOrganizations(group.organizations);
    console.log('Proposed merged organization:');
    console.log(`  - Name: ${merged.name}`);
    console.log(`  - Acronym: ${merged.acronym || 'N/A'}`);
    console.log(`  - Type: ${merged.type}`);
    console.log(`  - Country: ${merged.country || 'N/A'}`);
    console.log(`  - Description: ${merged.description ? merged.description.substring(0, 50) + '...' : 'N/A'}`);
  });
  
  // Ask for confirmation before consolidating
  console.log('\n================================================');
  console.log('To consolidate these duplicates, run:');
  console.log('npm run consolidate-orgs -- --confirm');
  console.log('================================================\n');
  
  // Check if --confirm flag is passed
  if (process.argv.includes('--confirm')) {
    console.log('Confirmation received. Starting consolidation...\n');
    
    for (const group of duplicateGroups) {
      // Use the organization with the most complete data as primary
      const primary = mergeOrganizations(group.organizations);
      await consolidateDuplicates(group, primary.id);
    }
    
    console.log('\nConsolidation complete!');
  }
}

// Run the script
main().catch(console.error); 