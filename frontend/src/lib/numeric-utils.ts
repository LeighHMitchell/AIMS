/**
 * Utility functions for safe numeric operations
 * Prevents NaN and Infinity values from causing errors in charts and calculations
 */

/**
 * Safely convert any value to a number, returning 0 for invalid values
 */
export function toNumberSafe(value: any): number {
  if (value === null || value === undefined) return 0
  
  const num = Number(value)
  if (isNaN(num) || !isFinite(num)) return 0
  
  return num
}

/**
 * Safely parse a float value, returning 0 for invalid values
 */
export function parseFloatSafe(value: any): number {
  if (value === null || value === undefined) return 0
  
  const num = parseFloat(value)
  if (isNaN(num) || !isFinite(num)) return 0
  
  return num
}

/**
 * Safely calculate a percentage, returning 0 for invalid results
 */
export function calculatePercentageSafe(numerator: number, denominator: number): number {
  if (denominator === 0 || isNaN(denominator) || !isFinite(denominator)) return 0
  if (isNaN(numerator) || !isFinite(numerator)) return 0
  
  const percentage = (numerator / denominator) * 100
  if (isNaN(percentage) || !isFinite(percentage)) return 0
  
  return percentage
}

/**
 * Safely divide two numbers, returning 0 for invalid results
 */
export function divideSafe(numerator: number, denominator: number): number {
  if (denominator === 0 || isNaN(denominator) || !isFinite(denominator)) return 0
  if (isNaN(numerator) || !isFinite(numerator)) return 0
  
  const result = numerator / denominator
  if (isNaN(result) || !isFinite(result)) return 0
  
  return result
}

/**
 * Ensure a value is a valid number for charting (no NaN or Infinity)
 */
export function ensureValidChartValue(value: any): number {
  const num = toNumberSafe(value)
  return isNaN(num) || !isFinite(num) ? 0 : num
}

/**
 * Clean an entire data object for charting, ensuring all numeric fields are valid
 */
export function cleanChartData<T extends Record<string, any>>(data: T[], numericFields: (keyof T)[]): T[] {
  return data.map(item => {
    const cleaned = { ...item }
    
    numericFields.forEach(field => {
      cleaned[field] = ensureValidChartValue(item[field]) as T[keyof T]
    })
    
    return cleaned
  })
} 