/**
 * Utility functions for exporting chart data to CSV
 */

/**
 * Convert an array of objects to CSV format
 */
export function convertToCSV(data: any[], filename?: string): string {
  if (!data || data.length === 0) {
    return ''
  }

  // Get headers from the first object
  const headers = Object.keys(data[0])

  // Create CSV header row
  const headerRow = headers.map(header => `"${header}"`).join(',')

  // Create CSV data rows
  const dataRows = data.map(row => {
    return headers.map(header => {
      const value = row[header]

      // Handle different data types
      if (value === null || value === undefined) {
        return '""'
      }

      if (typeof value === 'object') {
        return `"${JSON.stringify(value).replace(/"/g, '""')}"`
      }

      // Escape quotes and wrap in quotes
      const stringValue = String(value).replace(/"/g, '""')
      return `"${stringValue}"`
    }).join(',')
  })

  return [headerRow, ...dataRows].join('\n')
}

/**
 * Download CSV data as a file
 */
export function downloadCSV(csvContent: string, filename: string): void {
  // Add BOM for Excel compatibility with UTF-8
  const BOM = '\uFEFF'
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })

  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)

  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  // Clean up the URL
  URL.revokeObjectURL(url)
}

/**
 * Export chart data to CSV
 */
export function exportChartToCSV(data: any[], chartTitle: string): void {
  if (!data || data.length === 0) {
    console.warn('No data to export')
    return
  }

  const csvContent = convertToCSV(data, chartTitle)
  const timestamp = new Date().toISOString().split('T')[0]
  const filename = `${chartTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${timestamp}.csv`

  downloadCSV(csvContent, filename)
}

/**
 * Flatten nested objects for CSV export
 * Converts objects like { name: "John", address: { city: "NYC" } }
 * to { name: "John", "address.city": "NYC" }
 */
export function flattenObject(obj: any, prefix = ''): any {
  const flattened: any = {}

  Object.keys(obj).forEach(key => {
    const value = obj[key]
    const newKey = prefix ? `${prefix}.${key}` : key

    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(flattened, flattenObject(value, newKey))
    } else if (Array.isArray(value)) {
      flattened[newKey] = value.join('; ')
    } else {
      flattened[newKey] = value
    }
  })

  return flattened
}

/**
 * Export chart data with flattened nested objects
 */
export function exportChartToCSVFlattened(data: any[], chartTitle: string): void {
  if (!data || data.length === 0) {
    console.warn('No data to export')
    return
  }

  // Flatten nested objects
  const flattenedData = data.map(item => flattenObject(item))

  const csvContent = convertToCSV(flattenedData, chartTitle)
  const timestamp = new Date().toISOString().split('T')[0]
  const filename = `${chartTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${timestamp}.csv`

  downloadCSV(csvContent, filename)
}

/**
 * Export Recharts data (handles common Recharts data structures)
 */
export function exportRechartsDataToCSV(data: any[], chartTitle: string, customHeaders?: Record<string, string>): void {
  if (!data || data.length === 0) {
    console.warn('No data to export')
    return
  }

  // Transform data if custom headers are provided
  let exportData = data

  if (customHeaders) {
    exportData = data.map(item => {
      const transformed: any = {}
      Object.keys(customHeaders).forEach(key => {
        if (item.hasOwnProperty(key)) {
          transformed[customHeaders[key]] = item[key]
        }
      })
      // Include any other fields not in customHeaders
      Object.keys(item).forEach(key => {
        if (!customHeaders.hasOwnProperty(key)) {
          transformed[key] = item[key]
        }
      })
      return transformed
    })
  }

  exportChartToCSV(exportData, chartTitle)
}

/**
 * Export chart/visualization element to JPG
 */
export function exportChartToJPG(element: HTMLElement, filename: string): void {
  if (!element) {
    console.warn('No element provided for JPG export')
    return
  }

  // Use html2canvas to convert the element to an image
  import('html2canvas').then(({ default: html2canvas }) => {
    html2canvas(element, {
      backgroundColor: '#ffffff',
      scale: 2, // Higher quality
      logging: false,
      useCORS: true,
    }).then(canvas => {
      // Convert canvas to JPG
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob)
          const link = document.createElement('a')
          const timestamp = new Date().toISOString().split('T')[0]
          const safeFilename = `${filename.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${timestamp}.jpg`

          link.href = url
          link.download = safeFilename
          link.style.visibility = 'hidden'

          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)

          // Clean up
          URL.revokeObjectURL(url)
        }
      }, 'image/jpeg', 0.95) // 95% quality
    }).catch(error => {
      console.error('Error exporting chart to JPG:', error)
    })
  }).catch(error => {
    console.error('Error loading html2canvas:', error)
  })
}
