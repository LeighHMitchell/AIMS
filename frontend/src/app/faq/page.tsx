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
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  ChevronDown, 
  ChevronUp,
  HelpCircle,
  Clock,
  ChevronsUpDown
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUser } from '@/hooks/useUser'
import { HelpTextTooltip } from '@/components/ui/help-text-tooltip'
import { USER_ROLES } from '@/types/user'
import { toast } from 'sonner'

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
      const response = await fetch('/api/faq')
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
        response = await fetch(`/api/faq/${editingFAQ.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
      } else {
        response = await fetch('/api/faq', {
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
    try {
      const response = await fetch(`/api/faq/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete FAQ')
      }

      toast.success('FAQ deleted successfully')
      fetchFAQs()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete FAQ')
    }
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="border-b bg-white">
          <div className="flex items-center justify-between p-6">
            <div className="flex items-center space-x-3">
              <HelpCircle className="h-8 w-8 text-gray-600" />
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-2xl font-bold text-gray-900">Frequently Asked Questions</h1>
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
                        {submitting ? 'Saving...' : editingFAQ ? 'Update FAQ' : 'Create FAQ'}
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
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
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
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No FAQs found</h3>
                  <p className="text-gray-500 mb-4">
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
              filteredFAQs.map((faq) => (
                <Card key={faq.id} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <button
                          onClick={() => toggleExpanded(faq.id)}
                          className="text-left w-full group"
                        >
                          <CardTitle className="text-lg font-semibold text-gray-900 group-hover:text-gray-700 transition-colors flex items-center justify-between">
                            {faq.question}
                            {expandedItems.has(faq.id) ? (
                              <ChevronUp className="h-5 w-5 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-muted-foreground" />
                            )}
                          </CardTitle>
                        </button>
                        
                        <div className="flex items-center space-x-2 mt-2">
                          <Badge variant="secondary">{faq.category}</Badge>
                          <div className="flex items-center text-xs text-gray-500">
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
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(faq.id)}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  
                  {expandedItems.has(faq.id) && (
                    <CardContent className="pt-0">
                      <div className="prose prose-sm max-w-none">
                        <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                          {faq.answer}
                        </p>
                      </div>
                      
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
                    </CardContent>
                  )}
                </Card>
              ))
            )}
          </div>

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
    </MainLayout>
  )
}