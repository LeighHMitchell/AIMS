"use client"

import { useState, useEffect, useCallback } from 'react'

export type VoteValue = -1 | 0 | 1

interface UseActivityVoteOptions {
  activityId: string
  userId?: string | null
  initialScore?: number
  initialUserVote?: VoteValue
}

interface UseActivityVoteReturn {
  score: number
  upvoteCount: number
  downvoteCount: number
  userVote: VoteValue
  isLoading: boolean
  isVoting: boolean
  error: string | null
  vote: (value: VoteValue) => Promise<void>
  upvote: () => Promise<void>
  downvote: () => Promise<void>
  removeVote: () => Promise<void>
}

/**
 * Hook for managing Reddit-style voting on activities
 * Supports optimistic updates with rollback on error
 */
export function useActivityVote({
  activityId,
  userId,
  initialScore = 0,
  initialUserVote = 0
}: UseActivityVoteOptions): UseActivityVoteReturn {
  const [score, setScore] = useState(initialScore)
  const [upvoteCount, setUpvoteCount] = useState(0)
  const [downvoteCount, setDownvoteCount] = useState(0)
  const [userVote, setUserVote] = useState<VoteValue>(initialUserVote)
  const [isLoading, setIsLoading] = useState(true)
  const [isVoting, setIsVoting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch initial vote data
  useEffect(() => {
    const fetchVoteData = async () => {
      if (!activityId) return

      try {
        setIsLoading(true)
        setError(null)

        const url = userId
          ? `/api/activities/${activityId}/vote?userId=${userId}`
          : `/api/activities/${activityId}/vote`

        const response = await fetch(url)
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch vote data')
        }

        setScore(data.score ?? 0)
        setUpvoteCount(data.upvoteCount ?? 0)
        setDownvoteCount(data.downvoteCount ?? 0)
        setUserVote((data.userVote ?? 0) as VoteValue)
      } catch (err) {
        console.error('[useActivityVote] Error fetching vote data:', err)
        setError(err instanceof Error ? err.message : 'Failed to load vote data')
      } finally {
        setIsLoading(false)
      }
    }

    fetchVoteData()
  }, [activityId, userId])

  /**
   * Submit a vote with optimistic updates
   */
  const vote = useCallback(async (newVote: VoteValue) => {
    if (!activityId || !userId) {
      setError('You must be logged in to vote')
      return
    }

    if (isVoting) return

    // Store previous state for rollback
    const prevScore = score
    const prevUpvoteCount = upvoteCount
    const prevDownvoteCount = downvoteCount
    const prevUserVote = userVote

    // Calculate optimistic updates
    let newScore = score
    let newUpvoteCount = upvoteCount
    let newDownvoteCount = downvoteCount

    // Remove previous vote effect
    if (prevUserVote === 1) {
      newScore -= 1
      newUpvoteCount -= 1
    } else if (prevUserVote === -1) {
      newScore += 1
      newDownvoteCount -= 1
    }

    // Add new vote effect
    if (newVote === 1) {
      newScore += 1
      newUpvoteCount += 1
    } else if (newVote === -1) {
      newScore -= 1
      newDownvoteCount += 1
    }

    // Apply optimistic update
    setScore(newScore)
    setUpvoteCount(Math.max(0, newUpvoteCount))
    setDownvoteCount(Math.max(0, newDownvoteCount))
    setUserVote(newVote)
    setIsVoting(true)
    setError(null)

    try {
      const response = await fetch(`/api/activities/${activityId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, vote: newVote })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit vote')
      }

      // Update with server response (may differ slightly due to race conditions)
      setScore(data.score ?? newScore)
      setUpvoteCount(data.upvoteCount ?? newUpvoteCount)
      setDownvoteCount(data.downvoteCount ?? newDownvoteCount)
      setUserVote((data.userVote ?? newVote) as VoteValue)
    } catch (err) {
      // Rollback on error
      console.error('[useActivityVote] Error submitting vote:', err)
      setScore(prevScore)
      setUpvoteCount(prevUpvoteCount)
      setDownvoteCount(prevDownvoteCount)
      setUserVote(prevUserVote)
      setError(err instanceof Error ? err.message : 'Failed to submit vote')
    } finally {
      setIsVoting(false)
    }
  }, [activityId, userId, score, upvoteCount, downvoteCount, userVote, isVoting])

  /**
   * Toggle upvote: if already upvoted, remove vote; otherwise upvote
   */
  const upvote = useCallback(async () => {
    const newVote: VoteValue = userVote === 1 ? 0 : 1
    await vote(newVote)
  }, [userVote, vote])

  /**
   * Toggle downvote: if already downvoted, remove vote; otherwise downvote
   */
  const downvote = useCallback(async () => {
    const newVote: VoteValue = userVote === -1 ? 0 : -1
    await vote(newVote)
  }, [userVote, vote])

  /**
   * Remove vote (set to neutral)
   */
  const removeVote = useCallback(async () => {
    await vote(0)
  }, [vote])

  return {
    score,
    upvoteCount,
    downvoteCount,
    userVote,
    isLoading,
    isVoting,
    error,
    vote,
    upvote,
    downvote,
    removeVote
  }
}
