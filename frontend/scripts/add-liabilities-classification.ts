/**
 * Script to add Liabilities Summary budget classification hierarchy
 *
 * Category: Liabilities Summary
 * Sub-sector: Loans
 * Sub-sub-element: 411351 Multi-lateral
 *
 * Run with: npx tsx scripts/add-liabilities-classification.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'set' : 'missing');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'set' : 'missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addLiabilitiesClassifications() {
  console.log('Adding Liabilities Summary budget classifications...\n');

  // 1. Create the top-level category: Liabilities Summary
  console.log('1. Creating "Liabilities Summary" category...');
  const { data: liabilitiesCategory, error: categoryError } = await supabase
    .from('budget_classifications')
    .insert({
      code: 'L1',
      name: 'Liabilities Summary',
      description: 'Summary of government liabilities including loans and debt obligations',
      classification_type: 'economic',
      parent_id: null,
      level: 1,
      is_active: true,
      sort_order: 10, // After existing economic classifications
    })
    .select()
    .single();

  if (categoryError) {
    if (categoryError.code === '23505') {
      console.log('   Category already exists, fetching existing...');
      const { data: existing } = await supabase
        .from('budget_classifications')
        .select()
        .eq('code', 'L1')
        .eq('classification_type', 'economic')
        .single();

      if (existing) {
        console.log('   Found existing category:', existing.id);
        return addSubClassifications(existing.id);
      }
    }
    console.error('   Error creating category:', categoryError.message);
    return;
  }

  console.log('   Created category with ID:', liabilitiesCategory.id);
  await addSubClassifications(liabilitiesCategory.id);
}

async function addSubClassifications(parentId: string) {
  // 2. Create the sub-sector: Loans
  console.log('\n2. Creating "Loans" sub-sector...');
  const { data: loansSubsector, error: loansError } = await supabase
    .from('budget_classifications')
    .insert({
      code: 'L1.1',
      name: 'Loans',
      description: 'Loan obligations and borrowings',
      classification_type: 'economic',
      parent_id: parentId,
      level: 2,
      is_active: true,
      sort_order: 1,
    })
    .select()
    .single();

  if (loansError) {
    if (loansError.code === '23505') {
      console.log('   Sub-sector already exists, fetching existing...');
      const { data: existing } = await supabase
        .from('budget_classifications')
        .select()
        .eq('code', 'L1.1')
        .eq('classification_type', 'economic')
        .single();

      if (existing) {
        console.log('   Found existing sub-sector:', existing.id);
        return addSubSubElement(existing.id);
      }
    }
    console.error('   Error creating sub-sector:', loansError.message);
    return;
  }

  console.log('   Created sub-sector with ID:', loansSubsector.id);
  await addSubSubElement(loansSubsector.id);
}

async function addSubSubElement(parentId: string) {
  // 3. Create the sub-sub-element: 411351 Multi-lateral
  console.log('\n3. Creating "411351 Multi-lateral" sub-sub-element...');
  const { data: multilateralElement, error: elementError } = await supabase
    .from('budget_classifications')
    .insert({
      code: '411351',
      name: 'Multi-lateral',
      description: 'Multi-lateral loan obligations',
      classification_type: 'economic',
      parent_id: parentId,
      level: 3,
      is_active: true,
      sort_order: 1,
    })
    .select()
    .single();

  if (elementError) {
    if (elementError.code === '23505') {
      console.log('   Sub-sub-element already exists');
      return;
    }
    console.error('   Error creating sub-sub-element:', elementError.message);
    return;
  }

  console.log('   Created sub-sub-element with ID:', multilateralElement.id);
  console.log('\n✓ Successfully added all Liabilities Summary classifications!');

  // Display the hierarchy
  console.log('\nHierarchy created:');
  console.log('  └─ L1: Liabilities Summary (economic, level 1)');
  console.log('      └─ L1.1: Loans (economic, level 2)');
  console.log('          └─ 411351: Multi-lateral (economic, level 3)');
}

addLiabilitiesClassifications()
  .then(() => {
    console.log('\nScript completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
