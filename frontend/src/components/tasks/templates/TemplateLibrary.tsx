'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Search,
  MoreVertical,
  FileText,
  Building2,
  Globe,
  Pencil,
  Trash2,
  Copy,
  Loader2,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { useTaskTemplates } from '@/hooks/useTaskTemplates';
import type { TaskTemplate, WizardFormData } from '@/types/task';
import { getPriorityLabel, getPriorityColor } from '@/types/task';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface TemplateLibraryProps {
  userId: string;
  onApplyTemplate: (templateData: Partial<WizardFormData>) => void;
  onCreateNew?: () => void;
}

export function TemplateLibrary({ userId, onApplyTemplate, onCreateNew }: TemplateLibraryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'system' | 'organization' | 'personal'>('all');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const {
    templates,
    isLoading,
    error,
    fetchTemplates,
    deleteTemplate,
    applyTemplateDefaults,
  } = useTaskTemplates({ userId });

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleApply = (template: TaskTemplate) => {
    const defaults = applyTemplateDefaults(template);
    onApplyTemplate(defaults as Partial<WizardFormData>);
    toast.success(`Applied template: ${template.name}`);
  };

  const handleDelete = async (id: string) => {
    const success = await deleteTemplate(id);
    if (success) {
      toast.success('Template deleted');
      fetchTemplates();
    } else {
      toast.error('Failed to delete template');
    }
    setDeleteConfirmId(null);
  };

  const handleDuplicate = (template: TaskTemplate) => {
    const defaults = applyTemplateDefaults(template);
    onApplyTemplate({
      ...defaults,
      title: `${template.default_title || template.name} (Copy)`,
    } as Partial<WizardFormData>);
    toast.success('Template duplicated - customize and save as new template');
  };

  // Filter templates based on search and tab
  const filteredTemplates = templates.filter((template) => {
    const matchesSearch =
      searchQuery === '' ||
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesTab =
      activeTab === 'all' ||
      (activeTab === 'system' && template.is_system_template) ||
      (activeTab === 'organization' && !template.is_system_template && template.created_by_org_id) ||
      (activeTab === 'personal' && !template.is_system_template && !template.created_by_org_id);

    return matchesSearch && matchesTab;
  });

  const getTemplateIcon = (template: TaskTemplate) => {
    if (template.is_system_template) return <Globe className="h-4 w-4 text-blue-500" />;
    if (template.created_by_org_id) return <Building2 className="h-4 w-4 text-purple-500" />;
    return <FileText className="h-4 w-4 text-muted-foreground" />;
  };

  const getTemplateTypeBadge = (template: TaskTemplate) => {
    if (template.is_system_template) {
      return <Badge variant="secondary" className="text-xs">System</Badge>;
    }
    if (template.created_by_org_id) {
      return <Badge variant="outline" className="text-xs">Organization</Badge>;
    }
    return <Badge variant="outline" className="text-xs text-muted-foreground">Personal</Badge>;
  };

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <p className="text-red-500 mb-4">{error}</p>
          <Button variant="outline" onClick={() => fetchTemplates()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Task Templates</h3>
          <p className="text-sm text-muted-foreground">
            Reusable task blueprints for common workflows
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => fetchTemplates()} disabled={isLoading}>
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          </Button>
          {onCreateNew && (
            <Button onClick={onCreateNew}>
              <Plus className="h-4 w-4 mr-2" />
              Create Task
            </Button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search templates..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
          <TabsTrigger value="organization">Organization</TabsTrigger>
          <TabsTrigger value="personal">Personal</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredTemplates.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h4 className="font-medium">No templates found</h4>
                <p className="text-sm text-muted-foreground text-center mt-1">
                  {searchQuery
                    ? 'Try a different search term'
                    : 'Create a task and save it as a template to get started'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredTemplates.map((template) => (
                <Card key={template.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        {getTemplateIcon(template)}
                        <div className="min-w-0">
                          <CardTitle className="text-sm font-medium truncate">
                            {template.name}
                          </CardTitle>
                          {template.description && (
                            <CardDescription className="text-xs line-clamp-2 mt-1">
                              {template.description}
                            </CardDescription>
                          )}
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleApply(template)}>
                            <FileText className="h-4 w-4 mr-2" />
                            Use Template
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicate(template)}>
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          {!template.is_system_template && (
                            <>
                              <DropdownMenuItem disabled>
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => setDeleteConfirmId(template.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {getTemplateTypeBadge(template)}
                      {template.default_priority && (
                        <Badge
                          variant="outline"
                          className={cn('text-xs', getPriorityColor(template.default_priority))}
                        >
                          {getPriorityLabel(template.default_priority)}
                        </Badge>
                      )}
                      {template.default_task_type && (
                        <Badge variant="outline" className="text-xs capitalize">
                          {template.default_task_type}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t">
                      <span className="text-xs text-muted-foreground">
                        {template.created_at &&
                          `Created ${formatDistanceToNow(new Date(template.created_at), { addSuffix: true })}`}
                      </span>
                      <Button size="sm" variant="outline" onClick={() => handleApply(template)}>
                        Use
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this template? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
