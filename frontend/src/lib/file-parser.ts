import { FileColumn } from '@/types/import';

export async function parseFile(file: File): Promise<{
  data: any[];
  columns: FileColumn[];
}> {
  const fileExtension = file.name.split('.').pop()?.toLowerCase();
  
  if (fileExtension === 'csv') {
    return parseCSV(file);
  } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
    throw new Error('Excel file support temporarily disabled for security. Please convert to CSV format.');
  } else {
    throw new Error('Unsupported file type. Please upload a CSV file.');
  }
}

async function parseCSV(file: File): Promise<{
  data: any[];
  columns: FileColumn[];
}> {
  const text = await file.text();
  const lines = text.split('\n').filter(line => line.trim());
  
  if (lines.length === 0) {
    throw new Error('The file is empty');
  }
  
  // Parse headers
  const headers = parseCSVLine(lines[0]);
  
  // Parse data rows
  const data: any[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: any = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    data.push(row);
  }
  
  // Extract columns with sample values (first 3 rows)
  const columns: FileColumn[] = headers.map((header, index) => {
    const sampleValues = data.slice(0, 3).map(row => row[header] || '');
    return {
      index,
      name: header,
      sampleValues
    };
  });
  
  return { data, columns };
}

function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // Skip the next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  values.push(current.trim());
  return values;
}

/*
async function parseExcel(file: File): Promise<{
  data: any[];
  columns: FileColumn[];
}> {
  // For Excel parsing, we'll use the XLSX library - DISABLED FOR SECURITY
  // This needs to be dynamically imported to avoid SSR issues
  const XLSX = await import('xlsx');
  
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  
  // Get the first sheet
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  // Convert to JSON
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
  
  if (jsonData.length === 0) {
    throw new Error('The file is empty');
  }
  
  // First row is headers
  const headers = jsonData[0].map(h => String(h || '').trim()).filter(h => h);
  
  // Convert to object format
  const data: any[] = [];
  for (let i = 1; i < jsonData.length; i++) {
    const row: any = {};
    headers.forEach((header, index) => {
      const value = jsonData[i][index];
      row[header] = value !== undefined && value !== null ? String(value) : '';
    });
    data.push(row);
  }
  
  // Extract columns with sample values
  const columns: FileColumn[] = headers.map((header, index) => {
    const sampleValues = data.slice(0, 3).map(row => row[header] || '');
    return {
      index,
      name: header,
      sampleValues
    };
  });
  
  return { data, columns };
}
*/

// Fuzzy matching for auto-mapping
export function calculateSimilarity(str1: string, str2: string): number {
  str1 = str1.toLowerCase().replace(/[_-]/g, ' ').trim();
  str2 = str2.toLowerCase().replace(/[_-]/g, ' ').trim();
  
  if (str1 === str2) return 1;
  
  // Check if one contains the other
  if (str1.includes(str2) || str2.includes(str1)) return 0.8;
  
  // Simple Levenshtein distance
  const matrix: number[][] = [];
  const len1 = str1.length;
  const len2 = str2.length;
  
  for (let i = 0; i <= len2; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= len1; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= len2; i++) {
    for (let j = 1; j <= len1; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  const distance = matrix[len2][len1];
  const maxLen = Math.max(len1, len2);
  return maxLen === 0 ? 1 : 1 - distance / maxLen;
}

export function suggestMappings(
  systemFields: { id: string; name: string }[],
  fileColumns: FileColumn[]
): Map<string, number> {
  const suggestions = new Map<string, number>();
  
  systemFields.forEach(field => {
    let bestMatch = -1;
    let bestScore = 0;
    
    fileColumns.forEach(column => {
      const score = calculateSimilarity(field.name, column.name);
      if (score > bestScore && score > 0.6) { // 60% threshold
        bestScore = score;
        bestMatch = column.index;
      }
    });
    
    if (bestMatch !== -1) {
      suggestions.set(field.id, bestMatch);
    }
  });
  
  return suggestions;
}