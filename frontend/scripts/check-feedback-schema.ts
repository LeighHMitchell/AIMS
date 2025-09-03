import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkFeedbackSchema() {
  console.log('🔍 Checking feedback table schema...\n');

  try {
    // Get a sample record to see current schema
    const { data: sampleData, error: sampleError } = await supabase
      .from('feedback')
      .select('*')
      .limit(1);

    if (sampleError) {
      console.error('Error fetching sample data:', sampleError);
      return;
    }

    if (sampleData && sampleData.length > 0) {
      console.log('Current feedback table columns:');
      console.log('=' .repeat(50));
      Object.keys(sampleData[0]).forEach((column, index) => {
        console.log(`${(index + 1).toString().padStart(2)}. ${column}`);
      });
      
      // Check specifically for the columns we need
      const requiredColumns = ['feature', 'attachment_url', 'attachment_filename', 'attachment_type', 'attachment_size'];
      const missingColumns: string[] = [];
      
      console.log('\n' + '=' .repeat(50));
      console.log('Required columns check:');
      console.log('=' .repeat(50));
      
      requiredColumns.forEach(column => {
        if (column in sampleData[0]) {
          console.log(`✅ ${column} - EXISTS`);
        } else {
          console.log(`❌ ${column} - MISSING`);
          missingColumns.push(column);
        }
      });
      
      if (missingColumns.length > 0) {
        console.log('\n' + '⚠️  Missing columns detected!'.repeat(1));
        console.log('The following columns need to be added to the feedback table:');
        missingColumns.forEach(column => {
          console.log(`  - ${column}`);
        });
        
        console.log('\nCreating SQL migration...');
        
        const migrationSQL = generateMigrationSQL(missingColumns);
        console.log('\n' + '=' .repeat(80));
        console.log('SQL MIGRATION TO RUN:');
        console.log('=' .repeat(80));
        console.log(migrationSQL);
        console.log('=' .repeat(80));
      } else {
        console.log('\n✅ All required columns exist!');
      }
    } else {
      console.log('No data in feedback table. Let\'s check if table exists...');
      
      // Try to create a test record to see what columns are expected
      const testData = {
        user_id: '00000000-0000-0000-0000-000000000000', // dummy UUID
        category: 'comment',
        message: 'test message',
        status: 'open',
        priority: 'medium'
      };
      
      const { error: insertError } = await supabase
        .from('feedback')
        .insert(testData);
      
      if (insertError) {
        console.log('Insert test error:', insertError);
        console.log('This can help us understand the expected schema.');
      }
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

function generateMigrationSQL(missingColumns: string[]): string {
  const columnDefinitions: Record<string, string> = {
    'feature': 'feature TEXT',
    'attachment_url': 'attachment_url TEXT',
    'attachment_filename': 'attachment_filename TEXT', 
    'attachment_type': 'attachment_type TEXT',
    'attachment_size': 'attachment_size INTEGER'
  };

  let sql = '-- Migration to add missing columns to feedback table\n\n';
  
  missingColumns.forEach(column => {
    if (columnDefinitions[column]) {
      sql += `ALTER TABLE feedback ADD COLUMN IF NOT EXISTS ${columnDefinitions[column]};\n`;
    }
  });
  
  sql += '\n-- Add comments for clarity\n';
  missingColumns.forEach(column => {
    switch(column) {
      case 'feature':
        sql += `COMMENT ON COLUMN feedback.feature IS 'App feature/functionality this feedback relates to';\n`;
        break;
      case 'attachment_url':
        sql += `COMMENT ON COLUMN feedback.attachment_url IS 'URL of uploaded attachment file';\n`;
        break;
      case 'attachment_filename':
        sql += `COMMENT ON COLUMN feedback.attachment_filename IS 'Original filename of uploaded attachment';\n`;
        break;
      case 'attachment_type':
        sql += `COMMENT ON COLUMN feedback.attachment_type IS 'MIME type of uploaded attachment';\n`;
        break;
      case 'attachment_size':
        sql += `COMMENT ON COLUMN feedback.attachment_size IS 'Size in bytes of uploaded attachment';\n`;
        break;
    }
  });
  
  return sql;
}

// Run the check
checkFeedbackSchema();