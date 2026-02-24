"use client"

import React, { useState, useEffect } from 'react'
import { MainLayout } from '@/components/layout/main-layout'
import { FAQSkeleton } from '@/components/ui/skeleton-loader'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Clock,
  ChevronsUpDown,
  MessageCircle,
  Send,
  Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUser } from '@/hooks/useUser'
import { HelpTextTooltip } from '@/components/ui/help-text-tooltip'
import { USER_ROLES } from '@/types/user'
import { LoadingText } from '@/components/ui/loading-text'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api-fetch';

interface FAQItem {
  id: string
  question: string
  answer: string
  category: string
  tags: string[]
  created_at: string
  updated_at: string
  created_by?: string
  updated_by?: string
  followUps?: FollowUpQuestion[]
}

interface FollowUpQuestion {
  id: string
  question: string
  status: string
  created_at: string
  user?: {
    first_name?: string
    last_name?: string
    email?: string
  }
}

export default function FAQPage() {
  const { user } = useUser()
  const [faqs, setFaqs] = useState<FAQItem[]>([])
  const [isClient, setIsClient] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingFAQ, setEditingFAQ] = useState<FAQItem | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageLimit, setPageLimit] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('faq-page-limit')
      return saved ? Number(saved) : 10
    }
    return 10
  })

  // Follow-up question state
  const [followUpFAQ, setFollowUpFAQ] = useState<FAQItem | null>(null)
  const [followUpQuestion, setFollowUpQuestion] = useState('')
  const [submittingFollowUp, setSubmittingFollowUp] = useState(false)

  // Form state for create/edit
  const [formData, setFormData] = useState({
    question: '',
    answer: '',
    category: '',
    tags: ''
  })

  // Fix hydration error by ensuring client-side rendering
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Fetch FAQs from API
  const fetchFAQs = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiFetch('/api/faq?includeFollowUps=true')
      if (!response.ok) {
        throw new Error('Failed to fetch FAQs')
      }
      const data = await response.json()
      setFaqs(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load FAQs')
      console.error('Error fetching FAQs:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFAQs()
  }, [])

  // Check if user is super user
  const isSuperUser = user?.role === USER_ROLES.SUPER_USER

  // Get unique categories
  const categories = ['All', ...Array.from(new Set(faqs.map(faq => faq.category)))]

  // Filter FAQs based on search and category
  const filteredFAQs = faqs.filter(faq => {
    const matchesSearch =
      faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      faq.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesCategory = selectedCategory === 'All' || faq.category === selectedCategory

    return matchesSearch && matchesCategory
  })

  // Pagination calculations
  const totalFAQs = filteredFAQs.length
  const totalPages = Math.ceil(totalFAQs / pageLimit)
  const startIndex = (currentPage - 1) * pageLimit
  const endIndex = Math.min(startIndex + pageLimit, totalFAQs)
  const paginatedFAQs = filteredFAQs.slice(startIndex, endIndex)

  // Reset to page 1 when search or filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, selectedCategory])

  const handlePageLimitChange = (newLimit: number) => {
    setPageLimit(newLimit)
    setCurrentPage(1)
    if (typeof window !== 'undefined') {
      localStorage.setItem('faq-page-limit', newLimit.toString())
    }
  }

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedItems(newExpanded)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const payload = {
        question: formData.question,
        answer: formData.answer,
        category: formData.category,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
      }

      let response
      if (editingFAQ) {
        response = await apiFetch(`/api/faq/${editingFAQ.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
      } else {
        response = await apiFetch('/api/faq', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
      }

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save FAQ')
      }

      toast.success(editingFAQ ? 'FAQ updated successfully' : 'FAQ created successfully')

      // Reset form and refresh data
      setFormData({ question: '', answer: '', category: '', tags: '' })
      setIsCreateModalOpen(false)
      setEditingFAQ(null)
      fetchFAQs()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save FAQ')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (faq: FAQItem) => {
    setEditingFAQ(faq)
    setFormData({
      question: faq.question,
      answer: faq.answer,
      category: faq.category,
      tags: faq.tags.join(', ')
    })
    setIsCreateModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    // Confirm before deleting
    if (!window.confirm('Are you sure you want to delete this FAQ? This action cannot be undone.')) {
      return
    }

    // Optimistically remove from UI
    const previousFaqs = [...faqs]
    setFaqs(faqs.filter(faq => faq.id !== id))

    try {
      const response = await apiFetch(`/api/faq/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete FAQ')
      }

      toast.success('FAQ deleted successfully')
      // Optionally refresh in background to sync any other changes
      fetchFAQs().catch(() => {
        // Ignore refresh errors - the delete succeeded
      })
    } catch (err) {
      // Restore the FAQ if delete failed
      setFaqs(previousFaqs)
      toast.error(err instanceof Error ? err.message : 'Failed to delete FAQ')
    }
  }

  // Handle follow-up question submission
  const handleFollowUpSubmit = async () => {
    if (!followUpQuestion.trim() || !followUpFAQ || !user?.id) {
      toast.error('Please enter your follow-up question')
      return
    }

    setSubmittingFollowUp(true)
    try {
      const response = await apiFetch('/api/faq/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          question: followUpQuestion.trim(),
          context: `Follow-up to FAQ: "${followUpFAQ.question}"`,
          tags: ['follow-up', ...followUpFAQ.tags],
          relatedFaqId: followUpFAQ.id,
        }),
      })

      if (response.ok) {
        toast.success('Your follow-up question has been submitted! A manager will review it.')
        setFollowUpQuestion('')
        setFollowUpFAQ(null)
        // Refresh FAQs to show the new follow-up
        fetchFAQs()
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to submit question')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit follow-up')
    } finally {
      setSubmittingFollowUp(false)
    }
  }

  // Truncate text helper
  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength).trim() + '...'
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="border-b bg-card">
          <div className="flex items-center justify-between p-6">
            <div className="flex items-center space-x-3">
              <HelpCircle className="h-8 w-8 text-muted-foreground" />
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-2xl font-bold text-foreground">Frequently Asked Questions</h1>
                  <HelpTextTooltip content="Find answers to common questions or add new ones. If you cannot find what you are looking for, submit feedback through the User Menu in the top right to request a new FAQ entry." />
                </div>
              </div>
            </div>

            {isSuperUser && (
              <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogTrigger asChild>
                  <Button className="flex items-center space-x-2">
                    <Plus className="h-4 w-4" />
                    <span>Add FAQ</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>{editingFAQ ? 'Edit FAQ' : 'Create New FAQ'}</DialogTitle>
                    <DialogDescription>
                      {editingFAQ ? 'Update the question and answer.' : 'Add a new frequently asked question and its comprehensive answer.'}
                    </DialogDescription>
                  </DialogHeader>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="question">Question</Label>
                      <Input
                        id="question"
                        value={formData.question}
                        onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                        placeholder="Enter your question..."
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="answer">Answer</Label>
                      <Textarea
                        id="answer"
                        value={formData.answer}
                        onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                        placeholder="Provide a comprehensive answer..."
                        rows={6}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="category">Category</Label>
                      <Input
                        id="category"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        placeholder="e.g., Activities, Transactions, Reporting"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="tags">Tags (comma-separated)</Label>
                      <Input
                        id="tags"
                        value={formData.tags}
                        onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                        placeholder="e.g., activities, create, new, getting started"
                      />
                    </div>

                    <div className="flex justify-end space-x-2 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsCreateModalOpen(false)
                          setEditingFAQ(null)
                          setFormData({ question: '', answer: '', category: '', tags: '' })
                        }}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={submitting}>
                        {submitting ? <LoadingText>Saving...</LoadingText> : editingFAQ ? 'Update FAQ' : 'Create FAQ'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Search and Filter Controls */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search FAQs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="relative">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-accent/50 transition-colors appearance-none pr-8 min-w-[140px]"
              >
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
              <ChevronsUpDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 shrink-0 opacity-50 pointer-events-none" />
            </div>
          </div>

          {/* FAQ List */}
          <div className="space-y-4">
            {loading ? (
              <FAQSkeleton />
            ) : error ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <div className="text-red-600 mb-4">
                    <HelpCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">Error Loading FAQs</h3>
                    <p className="text-muted-foreground">{error}</p>
                  </div>
                  <Button onClick={fetchFAQs} variant="outline">
                    Try Again
                  </Button>
                </CardContent>
              </Card>
            ) : filteredFAQs.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <HelpCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No FAQs found</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchTerm || selectedCategory !== 'All'
                      ? 'Try adjusting your search or filter criteria.'
                      : 'No FAQs available yet.'}
                  </p>
                  {isSuperUser && (
                    <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                      <DialogTrigger asChild>
                        <Button>
                          <Plus className="h-4 w-4 mr-2" />
                          Create First FAQ
                        </Button>
                      </DialogTrigger>
                    </Dialog>
                  )}
                </CardContent>
              </Card>
            ) : (
              paginatedFAQs.map((faq) => {
                const isExpanded = expandedItems.has(faq.id)
                const isLongAnswer = faq.answer.length > 800
                const displayAnswer = isExpanded || !isLongAnswer
                  ? faq.answer
                  : truncateText(faq.answer, 800)

                return (
                  <Card key={faq.id} className="overflow-hidden">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg font-semibold text-foreground">
                            {faq.question}
                          </CardTitle>

                          <div className="flex items-center space-x-2 mt-2">
                            <Badge variant="secondary">{faq.category}</Badge>
                            <div className="flex items-center text-xs text-muted-foreground">
                              <Clock className="h-3 w-3 mr-1" />
                              Updated {isClient ? new Date(faq.updated_at).toLocaleDateString() : ''}
                            </div>
                          </div>
                        </div>

                        {isSuperUser && (
                          <div className="flex items-center space-x-2 ml-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(faq)}
                              className="h-8 w-8 p-0"
                            >
                              <Pencil className="h-4 w-4 text-muted-foreground ring-1 ring-slate-300 rounded-sm" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(faq.id)}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardHeader>

                    <CardContent className="pt-0">
                      {/* Answer - always visible */}
                      <div className="prose prose-sm max-w-none">
                        <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                          {displayAnswer}
                        </p>
                      </div>

                      {/* Show more/less button for long answers */}
                      {isLongAnswer && (
                        <button
                          onClick={() => toggleExpanded(faq.id)}
                          className="mt-2 text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="h-4 w-4" />
                              Show less
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-4 w-4" />
                              Read more
                            </>
                          )}
                        </button>
                      )}

                      {/* Tags */}
                      {faq.tags.length > 0 && (
                        <div className="mt-4 pt-4 border-t">
                          <div className="flex flex-wrap gap-2">
                            {faq.tags.map(tag => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Follow-up questions thread */}
                      {faq.followUps && faq.followUps.length > 0 && (
                        <div className="mt-4 pt-4 border-t">
                          <p className="text-xs font-medium text-muted-foreground uppercase mb-3">
                            Follow-up Questions ({faq.followUps.length})
                          </p>
                          <div className="space-y-0">
                            {faq.followUps.map((followUp, index) => {
                              const userName = followUp.user
                                ? `${followUp.user.first_name || ''} ${followUp.user.last_name || ''}`.trim() || followUp.user.email
                                : 'Anonymous'
                              const isLast = index === faq.followUps!.length - 1

                              return (
                                <div key={followUp.id} className="relative">
                                  {/* Connecting line */}
                                  <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-muted"
                                       style={{ height: isLast ? '24px' : '100%' }} />

                                  {/* Branch connector */}
                                  <div className="absolute left-3 top-6 w-4 h-0.5 bg-muted" />

                                  {/* Follow-up content */}
                                  <div className="pl-9 pb-4">
                                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                                      <div className="flex items-start justify-between gap-2">
                                        <p className="text-sm text-foreground">{followUp.question}</p>
                                        <Badge
                                          variant={followUp.status === 'published' ? 'default' : 'secondary'}
                                          className="text-xs flex-shrink-0"
                                        >
                                          {followUp.status === 'pending' ? 'Awaiting answer' :
                                           followUp.status === 'published' ? 'Answered' : followUp.status}
                                        </Badge>
                                      </div>
                                      <p className="text-xs text-muted-foreground mt-2">
                                        Asked by {userName} • {isClient ? new Date(followUp.created_at).toLocaleDateString() : ''}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {/* Follow-up question button */}
                      <div className="mt-4 pt-4 border-t flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                          Need more information?
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setFollowUpFAQ(faq)}
                          disabled={!user}
                          className="flex items-center gap-2"
                        >
                          <MessageCircle className="h-4 w-4" />
                          Ask follow-up
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            )}
          </div>

          {/* Pagination */}
          {!loading && totalFAQs > 0 && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Showing {Math.min(startIndex + 1, totalFAQs)} to {Math.min(endIndex, totalFAQs)} of {totalFAQs} FAQs
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      First
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>

                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }

                        return (
                          <Button
                            key={pageNum}
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(pageNum)}
                            className={`w-8 h-8 p-0 ${currentPage === pageNum ? "bg-slate-200 text-slate-900" : ""}`}
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                    >
                      Last
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-sm text-muted-foreground">Items per page:</label>
                    <Select
                      value={pageLimit.toString()}
                      onValueChange={(value) => handlePageLimitChange(Number(value))}
                    >
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5</SelectItem>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Help Text */}
          <Card className="bg-muted/30 border-muted">
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <HelpCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <h3 className="font-medium text-foreground mb-1">Need more help?</h3>
                  <p className="text-sm text-muted-foreground">
                    Can't find what you're looking for? {isSuperUser && 'Create a new FAQ entry or'} contact your system administrator for additional support.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Follow-up Question Modal */}
      <Dialog open={!!followUpFAQ} onOpenChange={(open) => !open && setFollowUpFAQ(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Ask a Follow-up Question
            </DialogTitle>
            <DialogDescription>
              Need more details about this answer? Submit a follow-up question and our team will respond.
            </DialogDescription>
          </DialogHeader>

          {followUpFAQ && (
            <div className="space-y-4">
              {/* Original FAQ context */}
              <div className="bg-surface-muted rounded-lg p-3 border">
                <p className="text-xs text-muted-foreground uppercase font-medium mb-1">Related to:</p>
                <p className="text-sm font-medium text-foreground">{followUpFAQ.question}</p>
              </div>

              {/* Follow-up question input */}
              <div className="space-y-2">
                <Label htmlFor="followup">Your follow-up question</Label>
                <Textarea
                  id="followup"
                  value={followUpQuestion}
                  onChange={(e) => setFollowUpQuestion(e.target.value)}
                  placeholder="What additional information would you like to know?"
                  rows={4}
                />
              </div>

              {/* Submit buttons */}
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setFollowUpFAQ(null)
                    setFollowUpQuestion('')
                  }}
                  disabled={submittingFollowUp}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleFollowUpSubmit}
                  disabled={!followUpQuestion.trim() || submittingFollowUp}
                >
                  {submittingFollowUp ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      <LoadingText>Submitting...</LoadingText>
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Submit Question
                    </>
                  )}
                </Button>
              </div>

              {!user && (
                <p className="text-sm text-amber-600 text-center">
                  Please log in to submit a follow-up question.
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  )
}
