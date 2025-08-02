import { useEffect, useState } from 'react'
// Remove supabase import - we'll use API routes instead
import { useUser } from '@/hooks/useUser'

interface ActivitySummary {
  totalActivities: number
  totalBudget: number
  totalPlannedDisbursements: number
  totalCommitments: number
  totalDisbursements: number
  totalExpenditure: number
}

interface PipelineActivity {
  id: string
  title: string
  expectedStart: string
  status: string
}

interface InactiveActivity {
  id: string
  title: string
  lastUpdated: string
}

interface MissingDataActivity {
  sector: string[]
  dates: string[]
  budget: string[]
  reportingOrg: string[]
  iatiId: string[]
}

interface ValidationStatus {
  validated: number
  pending: number
  rejected: number
}

interface ParticipatingOrgActivity {
  id: string
  title: string
  role: string
  reportedBy: string
}

interface MyPortfolioData {
  summary: ActivitySummary
  pipelinePastStart: PipelineActivity[]
  inactive90Days: InactiveActivity[]
  missingData: MissingDataActivity
  validationStatus: ValidationStatus
  participatingOrgActivities: ParticipatingOrgActivity[]
  sectorDistribution: Record<string, number>
  activityTimeline: Array<{
    id: string
    title: string
    startDate: string | null
    endDate: string | null
  }>
}

export function useMyPortfolioData() {
  const { user } = useUser()
  const [data, setData] = useState<MyPortfolioData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    console.log('[MyPortfolio] Hook mounted, user:', user)
    
    if (!user?.id) {
      console.log('[MyPortfolio] No user ID, skipping fetch')
      setLoading(false)
      return
    }

    const fetchPortfolioData = async () => {
      try {
        console.log('[MyPortfolio] Fetching data for user ID:', user.id)
        
        const response = await fetch('/api/my-portfolio')
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to fetch portfolio data')
        }
        
        const data = await response.json()
        console.log('[MyPortfolio] API response:', data)
        
        setData(data)
      } catch (err) {
        console.error('[MyPortfolio] Error fetching portfolio data:', err)
        const errorMessage = err instanceof Error ? err.message : 'Failed to load portfolio data'
        setError(errorMessage)
      } finally {
        setLoading(false)
      }
    }

    fetchPortfolioData()
  }, [user?.id])

  return { data, loading, error }
}