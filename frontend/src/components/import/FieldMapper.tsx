"use client"

import React, { useState, useEffect } from 'react';
import { 
  DndContext, 
  DragEndEvent, 
  DragOverlay, 
  DragStartEvent,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Info, AlertCircle, Sparkles, Check, X, Save, FileDown, GripVertical } from 'lucide-react';
import { SystemField, FileColumn, FieldMapping, ImportEntityType } from '@/types/import';
import { suggestMappings } from '@/lib/file-parser';
import { MappingTemplateManager } from '@/lib/import-utils';
import { SystemFieldItem } from './SystemFieldItem';
import { FileColumnItem } from './FileColumnItem';
import { cn } from '@/lib/utils';

interface FieldMapperProps {
  systemFields: SystemField[];
  fileColumns: FileColumn[];
  mappings: FieldMapping[];
  onMappingsChange: (mappings: FieldMapping[]) => void;
  entityType: ImportEntityType;
  onFieldsReorder?: (fields: SystemField[]) => void;
}

export function FieldMapper({
  systemFields: initialSystemFields,
  fileColumns,
  mappings,
  onMappingsChange,
  entityType,
  onFieldsReorder,
}: FieldMapperProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showUnmappedWarning, setShowUnmappedWarning] = useState(false);
  const [hoveredField, setHoveredField] = useState<string | null>(null);
  const [systemFields, setSystemFields] = useState(initialSystemFields);
  const [savedTemplates, setSavedTemplates] = useState(MappingTemplateManager.getTemplatesForEntity(entityType));
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  );

  // Check for required fields that are not mapped
  const unmappedRequiredFields = systemFields.filter(
    field => field.required && !mappings.find(m => m.systemFieldId === field.id && m.fileColumnIndex !== null)
  );

  // Check for unmapped file columns
  const mappedColumnIndices = new Set(mappings.map(m => m.fileColumnIndex).filter(i => i !== null));
  const unmappedColumns = fileColumns.filter(col => !mappedColumnIndices.has(col.index));

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) {
      setActiveId(null);
      return;
    }

    // Check if we're dragging a column to a field
    if (active.id.toString().includes('column-')) {
      const draggedColumnIndex = parseInt(active.id.toString().replace('column-', ''));
      const targetFieldId = String(over.id);

      // Update mappings
      const newMappings = mappings.map(mapping => {
        if (mapping.systemFieldId === targetFieldId) {
          return { ...mapping, fileColumnIndex: draggedColumnIndex };
        }
        // Remove mapping if column was already mapped elsewhere
        if (mapping.fileColumnIndex === draggedColumnIndex) {
          return { ...mapping, fileColumnIndex: null };
        }
        return mapping;
      });

      onMappingsChange(newMappings);
    } 
    // Check if we're reordering system fields
    else if (active.id.toString().includes('field-') && over.id.toString().includes('field-')) {
      const oldIndex = systemFields.findIndex(f => f.id === active.id.toString().replace('field-', ''));
      const newIndex = systemFields.findIndex(f => f.id === over.id.toString().replace('field-', ''));
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const newFields = arrayMove(systemFields, oldIndex, newIndex);
        setSystemFields(newFields);
        if (onFieldsReorder) {
          onFieldsReorder(newFields);
        }
      }
    }

    setActiveId(null);
  };

  const handleRemoveMapping = (fieldId: string) => {
    const newMappings = mappings.map(mapping => {
      if (mapping.systemFieldId === fieldId) {
        return { ...mapping, fileColumnIndex: null };
      }
      return mapping;
    });
    onMappingsChange(newMappings);
  };

  const handleAutoMap = () => {
    const suggestions = suggestMappings(systemFields, fileColumns);
    const newMappings = systemFields.map(field => ({
      systemFieldId: field.id,
      fileColumnIndex: suggestions.get(field.id) ?? null,
    }));
    onMappingsChange(newMappings);
  };

  const handleSaveTemplate = async () => {
    const name = prompt('Enter a name for this mapping template:');
    if (name) {
      await MappingTemplateManager.saveTemplate(name, entityType, mappings);
      setSavedTemplates(MappingTemplateManager.getTemplatesForEntity(entityType));
      alert('Template saved successfully!');
    }
  };

  const handleLoadTemplate = (templateId: string) => {
    const templateMappings = MappingTemplateManager.applyTemplate(templateId);
    if (templateMappings) {
      onMappingsChange(templateMappings);
      setSelectedTemplate(templateId);
    }
  };

  const getMappedColumn = (fieldId: string): FileColumn | null => {
    const mapping = mappings.find(m => m.systemFieldId === fieldId);
    if (mapping && mapping.fileColumnIndex !== null) {
      return fileColumns.find(col => col.index === mapping.fileColumnIndex) || null;
    }
    return null;
  };

  const activeColumn = activeId && activeId.includes('column-') 
    ? fileColumns.find(col => col.index === parseInt(activeId.replace('column-', ''))) 
    : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-4">
        {/* Header with actions */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Map Fields</h3>
          <div className="flex items-center gap-2">
            {savedTemplates.length > 0 && (
              <Select value={selectedTemplate} onValueChange={handleLoadTemplate}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Load template..." />
                </SelectTrigger>
                <SelectContent>
                  {savedTemplates.map(template => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleAutoMap}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Auto-Match
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveTemplate}
              disabled={mappings.filter(m => m.fileColumnIndex !== null).length === 0}
            >
              <Save className="h-4 w-4 mr-2" />
              Save Template
            </Button>
          </div>
        </div>

        {/* Warnings */}
        {unmappedRequiredFields.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {unmappedRequiredFields.length} required field{unmappedRequiredFields.length > 1 ? 's are' : ' is'} not mapped:
              {' '}{unmappedRequiredFields.map(f => f.name).join(', ')}
            </AlertDescription>
          </Alert>
        )}

        {showUnmappedWarning && unmappedColumns.length > 0 && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              {unmappedColumns.length} column{unmappedColumns.length > 1 ? 's' : ''} will not be imported:
              {' '}{unmappedColumns.map(c => c.name).join(', ')}
            </AlertDescription>
          </Alert>
        )}

        {/* Mapping Interface */}
        <div className="grid grid-cols-2 gap-6">
          {/* System Fields (Left) - Now Sortable */}
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium">Internal AIMS Fields</h4>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  <span>{mappings.filter(m => m.fileColumnIndex !== null).length}/{systemFields.length} mapped</span>
                </Badge>
                <Tooltip>
                  <TooltipTrigger>
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Drag fields to reorder</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
            <SortableContext
              items={systemFields.map(f => `field-${f.id}`)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {systemFields.map((field) => {
                  const mappedColumn = getMappedColumn(field.id);
                  const isMapped = mappedColumn !== null;
                  const isRequired = field.required;
                  const isHovered = hoveredField === field.id;

                  return (
                    <TooltipProvider key={field.id}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            onMouseEnter={() => setHoveredField(field.id)}
                            onMouseLeave={() => setHoveredField(null)}
                          >
                            <SystemFieldItem
                              field={field}
                              mappedColumn={mappedColumn}
                              onRemoveMapping={handleRemoveMapping}
                              isDropTarget={true}
                              isDraggable={true}
                            />
                          </div>
                        </TooltipTrigger>
                        {field.description && (
                          <TooltipContent>
                            <p className="max-w-xs">{field.description}</p>
                            {field.format && (
                              <p className="text-xs text-muted-foreground mt-1">Format: {field.format}</p>
                            )}
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                  );
                })}
              </div>
            </SortableContext>
          </div>

          {/* File Columns (Right) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium">File Columns</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowUnmappedWarning(!showUnmappedWarning)}
              >
                <Info className="h-4 w-4" />
              </Button>
            </div>
            <Card className="p-4 bg-muted/50">
              <div className="space-y-2">
                {fileColumns.map((column) => {
                  const isMapped = mappedColumnIndices.has(column.index);
                  return (
                    <FileColumnItem
                      key={column.index}
                      column={column}
                      isMapped={isMapped}
                      isDraggable={!isMapped}
                      id={`column-${column.index}`}
                    />
                  );
                })}
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeColumn && (
          <FileColumnItem
            column={activeColumn}
            isMapped={false}
            isDraggable={false}
            isDragging={true}
            id={`column-${activeColumn.index}`}
          />
        )}
      </DragOverlay>
    </DndContext>
  );
}