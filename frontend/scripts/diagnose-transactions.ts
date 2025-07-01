#!/usr/bin/env tsx
/**
 * Transaction Import Diagnostic Script
 * 
 * Usage:
 *   pnpm tsx scripts/diagnose-transactions.ts path/to/iati.xml
 * 
 * Environment variables required:
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 */

import { readFileSync } from 'fs';
import { runTransactionDiagnostic } from '../src/utils/transactionDiagnostic';
import * as dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

async function main() {
  // Check environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing required environment variables:');
    if (!supabaseUrl) console.error('   - NEXT_PUBLIC_SUPABASE_URL');
    if (!supabaseKey) console.error('   - SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  // Get XML file path from command line
  const xmlPath = process.argv[2];
  if (!xmlPath) {
    console.error('❌ Usage: pnpm tsx scripts/diagnose-transactions.ts path/to/iati.xml');
    process.exit(1);
  }

  // Read XML file
  let xmlContent: string;
  try {
    xmlContent = readFileSync(xmlPath, 'utf-8');
  } catch (error: any) {
    console.error(`❌ Error reading file: ${error.message}`);
    process.exit(1);
  }

  console.log(`📄 Loaded XML file: ${xmlPath}`);
  console.log(`📏 File size: ${(xmlContent.length / 1024).toFixed(2)} KB`);

  // Run diagnostic
  try {
    const summary = await runTransactionDiagnostic(
      xmlContent,
      supabaseUrl,
      supabaseKey
    );

    // Exit with error code if any transactions failed
    if (summary.totalFailed > 0) {
      process.exit(1);
    }
  } catch (error: any) {
    console.error(`\n❌ Diagnostic failed: ${error.message}`);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error); 