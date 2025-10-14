'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, ExternalLink, FileText, X } from 'lucide-react';
import { useDocumentLinks } from '@/hooks/use-results';
import { DocumentLink } from '@/types/results';

interface DocumentLinksManagerProps {
  entityType: 'result' | 'indicator' | 'baseline' | 'period';
  entityId: string;
  documents: DocumentLink[];
  linkType?: 'target' | 'actual'; // For periods only
  onUpdate: () => void;
  readOnly?: boolean;
  defaultLanguage?: string;
}

export function DocumentLinksManager({
  entityType,
  entityId,
  documents = [],
  linkType,
  onUpdate,
  readOnly = false,
  defaultLanguage = 'en'
}: DocumentLinksManagerProps) {
  const { createDocumentLink, deleteDocumentLink, loading } = useDocumentLinks();
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    url: '',
    title: '',
    description: '',
    format: '',
    category_code: '',
    language_code: defaultLanguage,
    document_date: ''
  });

  // Filter documents by link_type if specified (for periods)
  const filteredDocuments = linkType
    ? documents.filter(doc => doc.link_type === linkType)
    : documents;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.url || !formData.title) {
      return;
    }

    const data = {
      ...formData,
      link_type: linkType
    };

    const success = await createDocumentLink(entityType, entityId, data);
    
    if (success) {
      setFormData({
        url: '',
        title: '',
        description: '',
        format: '',
        category_code: '',
        language_code: defaultLanguage,
        document_date: ''
      });
      setShowAddForm(false);
      onUpdate();
    }
  };

  const handleDelete = async (documentId: string) => {
    if (window.confirm('Delete this document link?')) {
      const success = await deleteDocumentLink(entityType, entityId, documentId);
      if (success) {
        onUpdate();
      }
    }
  };

  const getCategoryName = (code: string) => {
    const categoryNames: Record<string, string> = {
      'A01': 'Activity Report',
      'A02': 'Annual Report',
      'A03': 'Quarterly Report',
      'A04': 'Mid-term Review',
      'A05': 'End of Project Review',
      'A06': 'Impact Evaluation',
      'A07': 'Baseline Survey',
      'A08': 'Mid-term Survey',
      'A09': 'End of Project Survey',
      'A10': 'Other Report',
      'A11': 'Progress Report',
      'A12': 'Final Report',
      'A13': 'Project Proposal',
      'A14': 'Project Design Document',
      'A15': 'Logical Framework',
      'A16': 'Risk Assessment',
      'A17': 'Environmental Impact Assessment',
      'A18': 'Social Impact Assessment',
      'A19': 'Financial Report',
      'A20': 'Audit Report'
    };
    return categoryNames[code] || 'Unknown Category';
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium text-gray-900 flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Document Links {linkType && `(${linkType})`}
        </Label>
        {!readOnly && !showAddForm && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowAddForm(true)}
            className="text-xs"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Document
          </Button>
        )}
      </div>

      {/* Add Document Form */}
      {showAddForm && !readOnly && (
        <form onSubmit={handleSubmit} className="bg-gray-50 p-4 rounded border space-y-3">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-900">Add Document Link</h4>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowAddForm(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-gray-700">URL *</Label>
            <Input
              type="url"
              value={formData.url}
              onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
              placeholder="https://example.com/document.pdf"
              required
              className="text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-gray-700">Title *</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Document title"
              required
              className="text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-gray-700">Description (optional)</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Brief description of the document"
              rows={2}
              className="text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs text-gray-700">Format</Label>
              <Input
                value={formData.format}
                onChange={(e) => setFormData(prev => ({ ...prev, format: e.target.value }))}
                placeholder="application/pdf"
                className="text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-gray-700">Category Code</Label>
              <Input
                value={formData.category_code}
                onChange={(e) => setFormData(prev => ({ ...prev, category_code: e.target.value }))}
                placeholder="A01"
                className="text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs text-gray-700">Language</Label>
              <Input
                value={formData.language_code}
                onChange={(e) => setFormData(prev => ({ ...prev, language_code: e.target.value }))}
                placeholder="en"
                className="text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-gray-700">Document Date</Label>
              <Input
                type="date"
                value={formData.document_date}
                onChange={(e) => setFormData(prev => ({ ...prev, document_date: e.target.value }))}
                className="text-sm"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Button
              type="submit"
              size="sm"
              disabled={loading || !formData.url || !formData.title}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 border border-gray-400"
            >
              Add Document
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowAddForm(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      {/* Document List */}
      {filteredDocuments.length > 0 && (
        <div className="space-y-2">
          {filteredDocuments.map((doc) => (
            <div key={doc.id} className="flex items-start justify-between bg-white p-3 rounded border text-sm">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="h-4 w-4 text-gray-500 flex-shrink-0" />
                  <span className="font-medium text-gray-900 truncate">
                    {typeof doc.title === 'string' ? doc.title : doc.title[defaultLanguage] || Object.values(doc.title)[0]}
                  </span>
                </div>
                
                {doc.description && (
                  <p className="text-xs text-gray-600 ml-6 mb-2">
                    {typeof doc.description === 'string' ? doc.description : doc.description[defaultLanguage] || ''}
                  </p>
                )}
                
                <div className="flex flex-wrap items-center gap-2 ml-6">
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Open Link
                  </a>
                  
                  {doc.format && (
                    <span className="text-xs font-mono text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded">
                      {doc.format.replace('application/', '').replace('text/', '').toUpperCase()}
                    </span>
                  )}
                  
                  {doc.category_code && (
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-mono text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded">
                        {doc.category_code}
                      </span>
                      <span className="text-xs text-gray-600">
                        - {getCategoryName(doc.category_code)}
                      </span>
                    </div>
                  )}
                  
                  {doc.document_date && (
                    <span className="text-xs text-gray-500">
                      {new Date(doc.document_date).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              
              {!readOnly && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(doc.id)}
                  className="text-red-600 hover:text-red-800 ml-2"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {filteredDocuments.length === 0 && !showAddForm && (
        <p className="text-xs text-gray-500 italic">No documents attached</p>
      )}
    </div>
  );
}

