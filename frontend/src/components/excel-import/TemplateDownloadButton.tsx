"use client";

import React, { useCallback, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ExcelFieldDefinition, ImportArea } from '@/lib/excel-import/types';
import { generateTemplate, downloadWorkbook } from '@/lib/excel-import/template-generator';

interface TemplateDownloadButtonProps {
  fieldDefs: ExcelFieldDefinition[];
  area: ImportArea;
  label?: string;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg';
}

const AREA_FILENAMES: Record<ImportArea, string> = {
  activity: 'Activity_Import_Template',
  transaction: 'Transaction_Import_Template',
  budget: 'Budget_Import_Template',
  planned_disbursement: 'Planned_Disbursement_Import_Template',
  organization: 'Organization_Import_Template',
};

const AREA_SHEET_NAMES: Record<ImportArea, string> = {
  activity: 'Activity',
  transaction: 'Transactions',
  budget: 'Budgets',
  planned_disbursement: 'Planned Disbursements',
  organization: 'Organization',
};

export function TemplateDownloadButton({
  fieldDefs,
  area,
  label = 'Download Template',
  variant = 'outline',
  size = 'default',
}: TemplateDownloadButtonProps) {
  const [generating, setGenerating] = useState(false);

  const handleDownload = useCallback(() => {
    setGenerating(true);
    try {
      const wb = generateTemplate(fieldDefs, {
        filename: AREA_FILENAMES[area],
        sheetName: AREA_SHEET_NAMES[area],
        includeSampleRow: true,
      });
      downloadWorkbook(wb, AREA_FILENAMES[area]);
    } finally {
      setGenerating(false);
    }
  }, [fieldDefs, area]);

  return (
    <Button variant={variant} size={size} onClick={handleDownload} disabled={generating}>
      {generating ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <Download className="h-4 w-4 mr-2" />
      )}
      {label}
    </Button>
  );
}
