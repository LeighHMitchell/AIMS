/**
 * Utility functions for computing field statistics from pivot table data
 * Used for field preview tooltips to help users understand data before using fields
 */

export interface FieldStats {
  fieldName: string
  dataType: 'text' | 'number' | 'date' | 'boolean' | 'unknown'
  uniqueCount: number
  nullCount: number
  totalCount: number
  topValues: Array<{ value: string; count: number; percentage: number }>
}

export type FieldStatsMap = Map<string, FieldStats>

/**
 * Detect the data type of a field based on sample values
 */
function detectDataType(values: unknown[]): FieldStats['dataType'] {
  // Get non-null sample values
  const samples = values.filter(v => v !== null && v !== undefined && v !== '').slice(0, 100)
  
  if (samples.length === 0) return 'unknown'
  
  // Check if all are booleans
  const allBooleans = samples.every(v => 
    typeof v === 'boolean' || v === 'true' || v === 'false' || v === true || v === false
  )
  if (allBooleans) return 'boolean'
  
  // Check if all are numbers
  const allNumbers = samples.every(v => {
    if (typeof v === 'number') return true
    if (typeof v === 'string') {
      const num = parseFloat(v)
      return !isNaN(num) && isFinite(num)
    }
    return false
  })
  if (allNumbers) return 'number'
  
  // Check if values look like dates (ISO format or common date patterns)
  const datePatterns = [
    /^\d{4}-\d{2}-\d{2}/, // ISO date
    /^\d{2}\/\d{2}\/\d{4}/, // MM/DD/YYYY
    /^\d{2}-\d{2}-\d{4}/, // DD-MM-YYYY
  ]
  const allDates = samples.every(v => {
    if (v instanceof Date) return true
    if (typeof v === 'string') {
      return datePatterns.some(pattern => pattern.test(v))
    }
    return false
  })
  if (allDates) return 'date'
  
  return 'text'
}

/**
 * Compute statistics for a single field
 */
export function computeFieldStats(
  data: Record<string, unknown>[],
  fieldName: string,
  topN: number = 5
): FieldStats {
  const values = data.map(row => row[fieldName])
  const totalCount = values.length
  
  // Count nulls and empty values
  const nullCount = values.filter(v => 
    v === null || v === undefined || v === '' || v === 'null' || v === 'undefined'
  ).length
  
  // Count unique values
  const valueCounts = new Map<string, number>()
  values.forEach(v => {
    if (v === null || v === undefined || v === '') return
    const key = String(v)
    valueCounts.set(key, (valueCounts.get(key) || 0) + 1)
  })
  
  const uniqueCount = valueCounts.size
  
  // Get top values sorted by count
  const sortedValues = Array.from(valueCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
  
  const topValues = sortedValues.map(([value, count]) => ({
    value,
    count,
    percentage: totalCount > 0 ? (count / totalCount) * 100 : 0,
  }))
  
  // Detect data type
  const dataType = detectDataType(values)
  
  return {
    fieldName,
    dataType,
    uniqueCount,
    nullCount,
    totalCount,
    topValues,
  }
}

/**
 * Compute statistics for all fields in the data
 * Returns a Map for O(1) lookup by field name
 */
export function computeAllFieldStats(
  data: Record<string, unknown>[],
  topN: number = 5
): FieldStatsMap {
  if (data.length === 0) {
    return new Map()
  }
  
  // Get all field names from first row
  const fieldNames = Object.keys(data[0])
  
  const statsMap = new Map<string, FieldStats>()
  
  fieldNames.forEach(fieldName => {
    statsMap.set(fieldName, computeFieldStats(data, fieldName, topN))
  })
  
  return statsMap
}

/**
 * Get a human-readable data type label
 */
export function getDataTypeLabel(dataType: FieldStats['dataType']): string {
  switch (dataType) {
    case 'text': return 'Text'
    case 'number': return 'Number'
    case 'date': return 'Date'
    case 'boolean': return 'Yes/No'
    default: return 'Mixed'
  }
}

/**
 * Format a value for display based on its data type
 */
export function formatValueForDisplay(value: string, dataType: FieldStats['dataType']): string {
  if (dataType === 'number') {
    const num = parseFloat(value)
    if (!isNaN(num)) {
      return num.toLocaleString('en-US', { maximumFractionDigits: 2 })
    }
  }
  
  if (dataType === 'date' && value.match(/^\d{4}-\d{2}-\d{2}/)) {
    try {
      const date = new Date(value)
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      })
    } catch {
      return value
    }
  }
  
  // Truncate long text values
  if (value.length > 40) {
    return value.substring(0, 37) + '...'
  }
  
  return value
}
