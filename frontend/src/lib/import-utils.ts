import { MappingTemplate, FieldMapping, ImportEntityType } from '@/types/import';
import { apiFetch } from '@/lib/api-fetch';

const MAPPING_TEMPLATES_KEY = 'aims_import_mapping_templates';

export class MappingTemplateManager {
  static async saveTemplate(
    name: string,
    entityType: ImportEntityType,
    mappings: FieldMapping[]
  ): Promise<MappingTemplate> {
    const template: MappingTemplate = {
      id: `template-${Date.now()}`,
      name,
      entityType,
      mappings,
      createdAt: new Date(),
    };

    const templates = this.getAllTemplates();
    templates.push(template);
    localStorage.setItem(MAPPING_TEMPLATES_KEY, JSON.stringify(templates));

    return template;
  }

  static getAllTemplates(): MappingTemplate[] {
    try {
      const stored = localStorage.getItem(MAPPING_TEMPLATES_KEY);
      if (!stored) return [];
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }

  static getTemplatesForEntity(entityType: ImportEntityType): MappingTemplate[] {
    return this.getAllTemplates().filter(t => t.entityType === entityType);
  }

  static deleteTemplate(id: string): void {
    const templates = this.getAllTemplates().filter(t => t.id !== id);
    localStorage.setItem(MAPPING_TEMPLATES_KEY, JSON.stringify(templates));
  }

  static applyTemplate(templateId: string): FieldMapping[] | null {
    const template = this.getAllTemplates().find(t => t.id === templateId);
    return template ? template.mappings : null;
  }
}

export class ImportLogger {
  static async logImport(
    entityType: ImportEntityType,
    totalRows: number,
    successCount: number,
    failureCount: number,
    userId: string,
    fileName: string
  ): Promise<void> {
    try {
      await apiFetch('/api/import-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType,
          totalRows,
          successCount,
          failureCount,
          userId,
          fileName,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (error) {
      console.error('Failed to log import:', error);
    }
  }
}

export function generateTemplateCSV(entityType: ImportEntityType, fields: any[]): string {
  const headers = fields.map(f => f.name).join(',');
  const sampleRow = fields.map(f => {
    switch (f.type) {
      case 'date':
        return '2024-01-01';
      case 'number':
        return '100000';
      case 'select':
        return f.options?.[0]?.value || 'sample';
      default:
        return 'Sample ' + f.name;
    }
  }).join(',');
  
  return `${headers}\n${sampleRow}`;
}

export function downloadTemplate(entityType: ImportEntityType, fields: any[]): void {
  const csv = generateTemplateCSV(entityType, fields);
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${entityType}_import_template.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}