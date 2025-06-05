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
} from '@dnd-kit/sortable';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info, AlertCircle, Sparkles, Check, X } from 'lucide-react';
import { SystemField, FileColumn, FieldMapping } from '@/types/import';
import { suggestMappings } from '@/lib/file-parser';
import { SystemFieldItem } from './SystemFieldItem';
import { FileColumnItem } from './FileColumnItem';
import { cn } from '@/lib/utils';

interface FieldMapperProps {
  systemFields: SystemField[];
  fileColumns: FileColumn[];
  mappings: FieldMapping[];
  onMappingsChange: (mappings: FieldMapping[]) => void;
  onSaveTemplate?: (name: string) => void;
}

export function FieldMapper({
  systemFields,
  fileColumns,
  mappings,
  onMappingsChange,
  onSaveTemplate,
}: FieldMapperProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showUnmappedWarning, setShowUnmappedWarning] = useState(false);
  const [hoveredField, setHoveredField] = useState<string | null>(null);

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

    const draggedColumnIndex = parseInt(String(active.id));
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

  const getMappedColumn = (fieldId: string): FileColumn | null => {
    const mapping = mappings.find(m => m.systemFieldId === fieldId);
    if (mapping && mapping.fileColumnIndex !== null) {
      return fileColumns.find(col => col.index === mapping.fileColumnIndex) || null;
    }
    return null;
  };

  const activeColumn = activeId ? fileColumns.find(col => col.index === parseInt(activeId)) : null;

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
            <Button
              variant="outline"
              size="sm"
              onClick={handleAutoMap}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Auto-Match
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
          {/* System Fields (Left) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium">Internal AIMS Fields</h4>
              <Badge variant="outline" className="text-xs">
                <span>{mappings.filter(m => m.fileColumnIndex !== null).length}/{systemFields.length} mapped</span>
              </Badge>
            </div>
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
                <SortableContext
                  items={fileColumns.map(col => col.index)}
                  strategy={verticalListSortingStrategy}
                >
                  {fileColumns.map((column) => {
                    const isMapped = mappedColumnIndices.has(column.index);
                    return (
                      <FileColumnItem
                        key={column.index}
                        column={column}
                        isMapped={isMapped}
                        isDraggable={!isMapped}
                      />
                    );
                  })}
                </SortableContext>
              </div>
            </Card>
          </div>
        </div>

        {/* Save Template Option */}
        {onSaveTemplate && (
          <div className="flex items-center justify-end pt-4 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const name = prompt('Enter a name for this mapping template:');
                if (name) {
                  onSaveTemplate(name);
                }
              }}
            >
              Save Mapping Template
            </Button>
          </div>
        )}
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeColumn && (
          <FileColumnItem
            column={activeColumn}
            isMapped={false}
            isDraggable={false}
            isDragging={true}
          />
        )}
      </DragOverlay>
    </DndContext>
  );
}