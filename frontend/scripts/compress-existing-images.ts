import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

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

// Compression settings
const ICON_SETTINGS = { maxWidth: 512, maxHeight: 512, quality: 80, maxSizeKB: 150 };
const BANNER_SETTINGS = { maxWidth: 1920, maxHeight: 1080, quality: 80, maxSizeKB: 300 };

interface CompressionResult {
  success: boolean;
  originalSize: number;
  compressedSize: number;
  compressedData?: string;
  error?: string;
}

/**
 * Check if a string is a base64 data URI (not an external URL)
 */
function isBase64DataUri(value: string | null): boolean {
  if (!value) return false;
  return value.startsWith('data:image/');
}

/**
 * Extract base64 data and mime type from data URI
 */
function parseDataUri(dataUri: string): { mimeType: string; base64: string } | null {
  const match = dataUri.match(/^data:(image\/[^;]+);base64,(.+)$/);
  if (!match) return null;
  return { mimeType: match[1], base64: match[2] };
}

/**
 * Compress a base64 image using sharp
 */
async function compressImage(
  dataUri: string,
  settings: typeof ICON_SETTINGS
): Promise<CompressionResult> {
  try {
    const parsed = parseDataUri(dataUri);
    if (!parsed) {
      return { success: false, originalSize: 0, compressedSize: 0, error: 'Invalid data URI' };
    }

    const originalBuffer = Buffer.from(parsed.base64, 'base64');
    const originalSize = originalBuffer.length;

    // Skip if already small enough
    if (originalSize <= settings.maxSizeKB * 1024) {
      return {
        success: true,
        originalSize,
        compressedSize: originalSize,
        compressedData: dataUri,
      };
    }

    // Compress with sharp
    let compressedBuffer = await sharp(originalBuffer)
      .resize(settings.maxWidth, settings.maxHeight, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: settings.quality })
      .toBuffer();

    // If still too large, reduce quality further
    if (compressedBuffer.length > settings.maxSizeKB * 1024) {
      compressedBuffer = await sharp(originalBuffer)
        .resize(settings.maxWidth, settings.maxHeight, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: 60 })
        .toBuffer();
    }

    const compressedBase64 = compressedBuffer.toString('base64');
    const compressedDataUri = `data:image/jpeg;base64,${compressedBase64}`;

    return {
      success: true,
      originalSize,
      compressedSize: compressedBuffer.length,
      compressedData: compressedDataUri,
    };
  } catch (error) {
    return {
      success: false,
      originalSize: 0,
      compressedSize: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
}

async function compressActivitiesImages() {
  console.log('\n📸 Compressing activity images...\n');

  const { data: activities, error } = await supabase
    .from('activities')
    .select('id, title_narrative, icon, banner');

  if (error) {
    console.error('Error fetching activities:', error);
    return { compressed: 0, skipped: 0, errors: 0, savedBytes: 0 };
  }

  let compressed = 0;
  let skipped = 0;
  let errors = 0;
  let savedBytes = 0;

  for (const activity of activities || []) {
    const updates: Record<string, string> = {};
    let activitySaved = 0;

    // Compress icon
    if (isBase64DataUri(activity.icon)) {
      const result = await compressImage(activity.icon, ICON_SETTINGS);
      if (result.success && result.compressedData && result.compressedSize < result.originalSize) {
        updates.icon = result.compressedData;
        activitySaved += result.originalSize - result.compressedSize;
        console.log(`  ✅ Icon: ${formatSize(result.originalSize)} → ${formatSize(result.compressedSize)}`);
      } else if (!result.success) {
        console.log(`  ❌ Icon error: ${result.error}`);
        errors++;
      } else {
        skipped++;
      }
    }

    // Compress banner
    if (isBase64DataUri(activity.banner)) {
      const result = await compressImage(activity.banner, BANNER_SETTINGS);
      if (result.success && result.compressedData && result.compressedSize < result.originalSize) {
        updates.banner = result.compressedData;
        activitySaved += result.originalSize - result.compressedSize;
        console.log(`  ✅ Banner: ${formatSize(result.originalSize)} → ${formatSize(result.compressedSize)}`);
      } else if (!result.success) {
        console.log(`  ❌ Banner error: ${result.error}`);
        errors++;
      } else {
        skipped++;
      }
    }

    // Update if we have changes
    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from('activities')
        .update(updates)
        .eq('id', activity.id);

      if (updateError) {
        console.error(`  ❌ Failed to update activity ${activity.id}:`, updateError);
        errors++;
      } else {
        compressed++;
        savedBytes += activitySaved;
        console.log(`  📦 Activity "${activity.title_narrative?.substring(0, 40)}..." - Saved ${formatSize(activitySaved)}`);
      }
    }
  }

  return { compressed, skipped, errors, savedBytes };
}

async function compressOrganizationsImages() {
  console.log('\n🏢 Compressing organization images...\n');

  const { data: organizations, error } = await supabase
    .from('organizations')
    .select('id, name, logo, banner');

  if (error) {
    console.error('Error fetching organizations:', error);
    return { compressed: 0, skipped: 0, errors: 0, savedBytes: 0 };
  }

  let compressed = 0;
  let skipped = 0;
  let errors = 0;
  let savedBytes = 0;

  for (const org of organizations || []) {
    const updates: Record<string, string> = {};
    let orgSaved = 0;

    // Compress logo
    if (isBase64DataUri(org.logo)) {
      const result = await compressImage(org.logo, ICON_SETTINGS);
      if (result.success && result.compressedData && result.compressedSize < result.originalSize) {
        updates.logo = result.compressedData;
        orgSaved += result.originalSize - result.compressedSize;
        console.log(`  ✅ Logo: ${formatSize(result.originalSize)} → ${formatSize(result.compressedSize)}`);
      } else if (!result.success) {
        console.log(`  ❌ Logo error: ${result.error}`);
        errors++;
      } else {
        skipped++;
      }
    }

    // Compress banner
    if (isBase64DataUri(org.banner)) {
      const result = await compressImage(org.banner, BANNER_SETTINGS);
      if (result.success && result.compressedData && result.compressedSize < result.originalSize) {
        updates.banner = result.compressedData;
        orgSaved += result.originalSize - result.compressedSize;
        console.log(`  ✅ Banner: ${formatSize(result.originalSize)} → ${formatSize(result.compressedSize)}`);
      } else if (!result.success) {
        console.log(`  ❌ Banner error: ${result.error}`);
        errors++;
      } else {
        skipped++;
      }
    }

    // Update if we have changes
    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from('organizations')
        .update(updates)
        .eq('id', org.id);

      if (updateError) {
        console.error(`  ❌ Failed to update organization ${org.id}:`, updateError);
        errors++;
      } else {
        compressed++;
        savedBytes += orgSaved;
        console.log(`  📦 Organization "${org.name?.substring(0, 40)}..." - Saved ${formatSize(orgSaved)}`);
      }
    }
  }

  return { compressed, skipped, errors, savedBytes };
}

async function compressCustomGroupsImages() {
  console.log('\n👥 Compressing custom groups images...\n');

  const { data: groups, error } = await supabase
    .from('custom_groups')
    .select('id, name, logo, banner');

  if (error) {
    console.error('Error fetching custom groups:', error);
    return { compressed: 0, skipped: 0, errors: 0, savedBytes: 0 };
  }

  let compressed = 0;
  let skipped = 0;
  let errors = 0;
  let savedBytes = 0;

  for (const group of groups || []) {
    const updates: Record<string, string> = {};
    let groupSaved = 0;

    // Compress logo
    if (isBase64DataUri(group.logo)) {
      const result = await compressImage(group.logo, ICON_SETTINGS);
      if (result.success && result.compressedData && result.compressedSize < result.originalSize) {
        updates.logo = result.compressedData;
        groupSaved += result.originalSize - result.compressedSize;
        console.log(`  ✅ Logo: ${formatSize(result.originalSize)} → ${formatSize(result.compressedSize)}`);
      } else if (!result.success) {
        console.log(`  ❌ Logo error: ${result.error}`);
        errors++;
      } else {
        skipped++;
      }
    }

    // Compress banner
    if (isBase64DataUri(group.banner)) {
      const result = await compressImage(group.banner, BANNER_SETTINGS);
      if (result.success && result.compressedData && result.compressedSize < result.originalSize) {
        updates.banner = result.compressedData;
        groupSaved += result.originalSize - result.compressedSize;
        console.log(`  ✅ Banner: ${formatSize(result.originalSize)} → ${formatSize(result.compressedSize)}`);
      } else if (!result.success) {
        console.log(`  ❌ Banner error: ${result.error}`);
        errors++;
      } else {
        skipped++;
      }
    }

    // Update if we have changes
    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from('custom_groups')
        .update(updates)
        .eq('id', group.id);

      if (updateError) {
        console.error(`  ❌ Failed to update custom group ${group.id}:`, updateError);
        errors++;
      } else {
        compressed++;
        savedBytes += groupSaved;
        console.log(`  📦 Custom Group "${group.name?.substring(0, 40)}..." - Saved ${formatSize(groupSaved)}`);
      }
    }
  }

  return { compressed, skipped, errors, savedBytes };
}

async function main() {
  console.log('🗜️  Starting image compression migration...');
  console.log('================================================\n');

  const activityStats = await compressActivitiesImages();
  const orgStats = await compressOrganizationsImages();
  const groupStats = await compressCustomGroupsImages();

  const totalCompressed = activityStats.compressed + orgStats.compressed + groupStats.compressed;
  const totalSkipped = activityStats.skipped + orgStats.skipped + groupStats.skipped;
  const totalErrors = activityStats.errors + orgStats.errors + groupStats.errors;
  const totalSaved = activityStats.savedBytes + orgStats.savedBytes + groupStats.savedBytes;

  console.log('\n================================================');
  console.log('📊 SUMMARY');
  console.log('================================================');
  console.log(`✅ Records compressed: ${totalCompressed}`);
  console.log(`⏭️  Already optimized (skipped): ${totalSkipped}`);
  console.log(`❌ Errors: ${totalErrors}`);
  console.log(`💾 Total space saved: ${formatSize(totalSaved)}`);
  console.log('\n✨ Done!');
}

main().catch(console.error);
