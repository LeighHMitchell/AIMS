import { NextResponse, NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { startOfDay, subMonths, format } from 'date-fns';

export interface ContributionData {
  date: string;
  count: number;
}

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const userRole = searchParams.get('userRole');
    const filterType = searchParams.get('filter'); // 'all' | 'user'
    
    // Calculate date range (past 12 months)
    const endDate = new Date();
    const startDate = subMonths(startOfDay(endDate), 12);
    
    // Build query
    let query = supabaseAdmin
      .from('activity_logs')
      .select('created_at, action')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());
    
    // Apply filters based on user role and filter type
    if (filterType === 'user' && userId) {
      query = query.eq('user_id', userId);
    } else if (userRole !== 'super_user') {
      // For non-super users, show only certain types of actions
      const visibleActions = [
        'create', 'edit', 'publish', 'add_partner', 
        'update_partner', 'add_transaction', 'edit_transaction',
        'submit_validation', 'validate'
      ];
      query = query.in('action', visibleActions);
    }
    
    const { data: logs, error } = await query;
    
    if (error) {
      console.error('[AIMS] Error fetching contribution data:', error);
      return NextResponse.json(
        { error: 'Failed to fetch contribution data' },
        { status: 500 }
      );
    }
    
    // Aggregate contributions by date
    const contributionMap = new Map<string, number>();
    
    logs?.forEach((log: any) => {
      const date = format(new Date(log.created_at), 'yyyy-MM-dd');
      contributionMap.set(date, (contributionMap.get(date) || 0) + 1);
    });
    
    // Convert to array format expected by the heatmap
    const contributions: ContributionData[] = Array.from(contributionMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
    
    // Calculate summary statistics
    const totalContributions = contributions.reduce((sum, day) => sum + day.count, 0);
    const activeDays = contributions.length;
    const maxStreak = calculateMaxStreak(contributions);
    const currentStreak = calculateCurrentStreak(contributions);
    
    return NextResponse.json({
      contributions,
      summary: {
        total: totalContributions,
        activeDays,
        maxStreak,
        currentStreak,
        startDate: format(startDate, 'yyyy-MM-dd'),
        endDate: format(endDate, 'yyyy-MM-dd'),
      }
    });
  } catch (error) {
    console.error('[AIMS] Error fetching contribution data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contribution data' },
      { status: 500 }
    );
  }
}

// Helper function to calculate maximum streak
function calculateMaxStreak(contributions: ContributionData[]): number {
  if (contributions.length === 0) return 0;
  
  let maxStreak = 0;
  let currentStreak = 0;
  let lastDate: Date | null = null;
  
  contributions.forEach(({ date }) => {
    const currentDate = new Date(date);
    
    if (lastDate) {
      const diffDays = Math.floor((currentDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        currentStreak++;
      } else {
        maxStreak = Math.max(maxStreak, currentStreak);
        currentStreak = 1;
      }
    } else {
      currentStreak = 1;
    }
    
    lastDate = currentDate;
  });
  
  return Math.max(maxStreak, currentStreak);
}

// Helper function to calculate current streak
function calculateCurrentStreak(contributions: ContributionData[]): number {
  if (contributions.length === 0) return 0;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let streak = 0;
  let checkDate = new Date(today);
  
  // Start from today and go backwards
  for (let i = contributions.length - 1; i >= 0; i--) {
    const contributionDate = new Date(contributions[i].date);
    contributionDate.setHours(0, 0, 0, 0);
    
    const diffDays = Math.floor((checkDate.getTime() - contributionDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else if (diffDays === 1 && streak === 0) {
      // If no contribution today, check yesterday
      streak++;
      checkDate = new Date(contributionDate);
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }
  
  return streak;
}