import { NextResponse, NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

interface SectorData {
  sectorCode: string;
  sectorName: string;
  activityCount: number;
  totalPercentage: number;
  averagePercentage: number;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const topN = parseInt(searchParams.get('topN') || '10');

    const supabaseAdmin = getSupabaseAdmin();


    


    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database connection not initialized' },
        { status: 500 }
      );
    }

    // Get all activity sectors
    const { data: activitySectors, error } = await supabaseAdmin
      .from('activity_sectors')
      .select('sector_code, sector_name, sector_percentage, activity_id');

    if (error) {
      console.error('Error fetching activity sectors:', error);
      return NextResponse.json(
        { error: 'Failed to fetch activity sectors data' },
        { status: 500 }
      );
    }

    if (!activitySectors || activitySectors.length === 0) {
      return NextResponse.json({
        data: []
      });
    }

    // Process sector data
    const sectorMap = new Map<string, {
      sectorName: string;
      activityIds: Set<string>;
      percentages: number[];
      totalPercentage: number;
    }>();

    activitySectors.forEach((sector: any) => {
      const sectorCode = sector.sector_code || 'Unknown';
      const sectorName = sector.sector_name || sectorCode;
      const percentage = sector.sector_percentage || 0;
      const activityId = sector.activity_id;

      if (!sectorMap.has(sectorCode)) {
        sectorMap.set(sectorCode, {
          sectorName,
          activityIds: new Set(),
          percentages: [],
          totalPercentage: 0
        });
      }

      const sectorData = sectorMap.get(sectorCode)!;
      sectorData.activityIds.add(activityId);
      sectorData.percentages.push(percentage);
      sectorData.totalPercentage += percentage;
    });

    // Convert to result format
    const result: SectorData[] = Array.from(sectorMap.entries())
      .map(([sectorCode, data]) => ({
        sectorCode,
        sectorName: data.sectorName,
        activityCount: data.activityIds.size,
        totalPercentage: data.totalPercentage,
        averagePercentage: data.percentages.length > 0 ? data.totalPercentage / data.percentages.length : 0
      }))
      .sort((a, b) => b.activityCount - a.activityCount) // Sort by activity count descending
      .slice(0, topN); // Apply top N limit

    return NextResponse.json({
      data: result,
      summary: {
        totalSectors: sectorMap.size,
        showing: result.length,
        totalActivities: new Set(activitySectors.map((s: any) => s.activity_id)).size
      }
    });

  } catch (error) {
    console.error('Error in sectors API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}