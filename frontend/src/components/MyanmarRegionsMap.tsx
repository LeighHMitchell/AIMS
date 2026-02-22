"use client"

import React, { useState, useEffect, useMemo, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MapPin, Download, Maximize2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { HelpTextTooltip } from "@/components/ui/help-text-tooltip"
import { toast } from "sonner"

interface ActivityInfo {
  id: string
  title: string
}

interface RegionData {
  percentage: number
  value?: number
  activityCount?: number
  activities?: ActivityInfo[]
}

interface MyanmarRegionsMapProps {
  breakdowns: Record<string, number | RegionData>
  onRegionClick?: (regionName: string) => void
}

interface GeoJSONFeature {
  type: string
  properties: {
    ST: string
    ST_RG: string
    ST_PCODE: string
    [key: string]: any
  }
  geometry: {
    type: string
    coordinates: number[][][] | number[][][][]
  }
}

interface GeoJSONData {
  type: string
  features: GeoJSONFeature[]
}

export default function MyanmarRegionsMap({ 
  breakdowns = {}, 
  onRegionClick 
}: MyanmarRegionsMapProps) {
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null)
  const [hoveredCentroid, setHoveredCentroid] = useState<{ x: number, y: number } | null>(null)
  const [mousePosition, setMousePosition] = useState<{ x: number, y: number } | null>(null)
  const [geoData, setGeoData] = useState<GeoJSONData | null>(null)
  const [loading, setLoading] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const mapContainerRef = useRef<HTMLDivElement>(null)

  // Map GeoJSON names to full names used in the system
  const nameMapping = useMemo(() => ({
    'Ayeyarwady': 'Ayeyarwady Region',
    'Bago': 'Bago Region',
    'Chin': 'Chin State',
    'Kachin': 'Kachin State',
    'Kayah': 'Kayah State',
    'Kayin': 'Kayin State',
    'Magway': 'Magway Region',
    'Mandalay': 'Mandalay Region',
    'Mon': 'Mon State',
    'Nay Pyi Taw': 'Naypyidaw Union Territory',
    'Rakhine': 'Rakhine State',
    'Sagaing': 'Sagaing Region',
    'Shan': 'Shan State',
    'Tanintharyi': 'Tanintharyi Region',
    'Yangon': 'Yangon Region'
  }), [])

  // Function to get shade based on percentage (0-100)
  // Uses brand color palette: Platinum → Pale Slate → Cool Steel → Blue Slate → Primary Scarlet
  const getShade = (percentage: number): string => {
    if (percentage === 0) return '#f1f4f8'  // Platinum (lightest)
    if (percentage <= 5) return '#e8eaed'   // Between Platinum and Pale Slate
    if (percentage <= 10) return '#cfd0d5'  // Pale Slate
    if (percentage <= 20) return '#b3bcc5'  // Between Pale Slate and Cool Steel
    if (percentage <= 30) return '#7b95a7'  // Cool Steel
    if (percentage <= 50) return '#647a8c'  // Between Cool Steel and Blue Slate
    if (percentage <= 70) return '#4c5568'  // Blue Slate
    if (percentage <= 90) return '#3d4555'  // Darker Blue Slate
    return '#dc2625'  // Primary Scarlet for >90%
  }

  // Format currency helper
  const formatCurrency = (value: number): string => {
    if (value >= 1_000_000_000) {
      return `$${(value / 1_000_000_000).toFixed(1)}B`
    } else if (value >= 1_000_000) {
      return `$${(value / 1_000_000).toFixed(1)}M`
    } else if (value >= 1_000) {
      return `$${(value / 1_000).toFixed(0)}K`
    }
    return `$${value.toFixed(0)}`
  }

  // Get hovered region data
  const getHoveredRegionData = () => {
    if (!hoveredRegion) return null
    const region = paths.find(p => p.fullName === hoveredRegion)
    return region || null
  }

  // Load GeoJSON data
  useEffect(() => {
    fetch('/myanmar-states-simplified.geojson')
      .then(response => response.json())
      .then(data => {
        setGeoData(data)
        setLoading(false)
      })
      .catch(error => {
        console.error('Error loading GeoJSON:', error)
        setLoading(false)
      })
  }, [])

  // Calculate SVG viewBox and paths from GeoJSON
  const { viewBox, paths } = useMemo(() => {
    if (!geoData) return { viewBox: '0 0 800 1000', paths: [] }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity

    // Convert GeoJSON coordinates to SVG paths
    const svgPaths = geoData.features.map(feature => {
      const regionName = feature.properties.ST
      const fullName = Object.prototype.hasOwnProperty.call(nameMapping, regionName)
        ? nameMapping[regionName as keyof typeof nameMapping]
        : regionName

      // Handle both number and RegionData types
      const rawData = Object.prototype.hasOwnProperty.call(breakdowns, fullName)
        ? breakdowns[fullName as keyof typeof breakdowns]
        : 0

      const isRegionData = typeof rawData === 'object' && rawData !== null
      const percentage = isRegionData ? (rawData as RegionData).percentage : (rawData as number)
      const value = isRegionData ? (rawData as RegionData).value : undefined
      const activityCount = isRegionData ? (rawData as RegionData).activityCount : undefined
      const activities = isRegionData ? (rawData as RegionData).activities : undefined

      let pathData = ''
      const coords = feature.geometry.coordinates

      // Handle MultiPolygon
      if (feature.geometry.type === 'MultiPolygon') {
        coords.forEach((polygon: number[][][]) => {
          polygon.forEach((ring: number[][]) => {
            ring.forEach((point: number[], index: number) => {
              const x = point[0]
              const y = -point[1] // Flip Y coordinate for SVG

              minX = Math.min(minX, x)
              minY = Math.min(minY, y)
              maxX = Math.max(maxX, x)
              maxY = Math.max(maxY, y)

              if (index === 0) {
                pathData += ` M ${x} ${y}`
              } else {
                pathData += ` L ${x} ${y}`
              }
            })
            pathData += ' Z'
          })
        })
      }

      return {
        regionName,
        fullName,
        percentage,
        value,
        activityCount,
        activities,
        pathData,
        stateType: feature.properties.ST_RG
      }
    })

    // Add padding to viewBox
    const padding = 0.5
    const viewBoxString = `${minX - padding} ${minY - padding} ${maxX - minX + padding * 2} ${maxY - minY + padding * 2}`

    return { viewBox: viewBoxString, paths: svgPaths }
  }, [geoData, breakdowns, nameMapping])

  // Calculate center points for percentage labels
  const calculateCentroid = (pathData: string): { x: number, y: number } => {
    // Simple approximation - find the average of all points
    const points = pathData.match(/([ML])\s*([\d.-]+)\s+([\d.-]+)/g) || []
    if (points.length === 0) return { x: 0, y: 0 }

    let sumX = 0, sumY = 0, count = 0
    points.forEach(point => {
      const match = point.match(/([ML])\s*([\d.-]+)\s+([\d.-]+)/)
      if (match) {
        sumX += parseFloat(match[2])
        sumY += parseFloat(match[3])
        count++
      }
    })

    return { x: sumX / count, y: sumY / count }
  }

  // Export map to JPEG
  const exportToJPEG = async () => {
    if (!mapContainerRef.current) {
      toast.error('Map not ready for export')
      return
    }

    setIsExporting(true)
    try {
      // Dynamically import html2canvas to avoid SSR issues
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(mapContainerRef.current, {
        backgroundColor: '#ffffff',
        scale: 2, // Higher quality
        logging: false,
        useCORS: true
      })

      // Convert to JPEG
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.download = `myanmar-subnational-allocation-map-${new Date().toISOString().split('T')[0]}.jpg`
          link.href = url
          link.click()
          URL.revokeObjectURL(url)
          toast.success('Map exported successfully')
        } else {
          toast.error('Failed to generate image')
        }
      }, 'image/jpeg', 0.95)
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Failed to export map')
    } finally {
      setIsExporting(false)
    }
  }

  if (loading) {
    return (
      <Card className="w-full h-full">
        <CardContent className="p-4 h-full flex items-center justify-center">
          <div className="text-muted-foreground">Loading map...</div>
        </CardContent>
      </Card>
    )
  }

  if (!geoData) {
    return (
      <Card className="w-full h-full">
        <CardContent className="p-4 h-full flex items-center justify-center">
          <div className="text-muted-foreground">Failed to load map data</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Subnational Allocation Map
            <HelpTextTooltip content="Click on regions to add them to the breakdown. Colors show allocation percentages." />
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setIsExpanded(true)}
            title="Expand"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4 flex-1">

        <div ref={mapContainerRef} className="w-full h-full flex items-center justify-center relative">
            <svg 
              viewBox={viewBox}
              className="w-full h-full max-w-[600px] max-h-[700px]"
              style={{ backgroundColor: 'white' }}
            >
              {/* Draw regions */}
              {paths.map(region => {
                const fillColor = getShade(region.percentage)
                const isHovered = hoveredRegion === region.fullName
                const centroid = calculateCentroid(region.pathData)

                return (
                  <g key={region.fullName}>
                    <path
                      d={region.pathData}
                      fill={fillColor}
                      stroke={isHovered ? "#4C5568" : "#64748b"}
                      strokeWidth={isHovered ? "0.08" : "0.04"}
                      className="cursor-pointer transition-all"
                      onClick={() => onRegionClick?.(region.fullName)}
                      onMouseEnter={(e) => {
                        setHoveredRegion(region.fullName)
                        setHoveredCentroid(centroid)
                        const rect = mapContainerRef.current?.getBoundingClientRect()
                        if (rect) {
                          setMousePosition({ x: e.clientX - rect.left, y: e.clientY - rect.top })
                        }
                      }}
                      onMouseMove={(e) => {
                        const rect = mapContainerRef.current?.getBoundingClientRect()
                        if (rect) {
                          setMousePosition({ x: e.clientX - rect.left, y: e.clientY - rect.top })
                        }
                      }}
                      onMouseLeave={() => {
                        setHoveredRegion(null)
                        setHoveredCentroid(null)
                        setMousePosition(null)
                      }}
                      style={{
                        filter: isHovered ? 'brightness(0.95)' : undefined,
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <title>{`${region.fullName}: ${region.percentage.toFixed(1)}%`}</title>
                    </path>
                  </g>
                )
              })}
              

            </svg>

            {/* HTML Hover Tooltip */}
            {hoveredRegion && mousePosition && (() => {
              const regionData = getHoveredRegionData()
              return (
                <div
                  className="absolute bg-card border border-border rounded-lg shadow-lg p-3 pointer-events-none z-50"
                  style={{
                    left: mousePosition.x + 15,
                    top: mousePosition.y - 10,
                    maxWidth: 280,
                  }}
                >
                  <h4 className="font-semibold text-foreground text-sm mb-2">{hoveredRegion}</h4>
                  <table className="w-full text-xs">
                    <tbody>
                      <tr className="border-b border-border">
                        <td className="py-1 text-muted-foreground">Allocation</td>
                        <td className="py-1 text-right font-medium text-foreground">
                          {regionData?.percentage.toFixed(1) ?? '0'}%
                        </td>
                      </tr>
                      {regionData?.value !== undefined && (
                        <tr className="border-b border-border">
                          <td className="py-1 text-muted-foreground">Value</td>
                          <td className="py-1 text-right font-medium text-foreground">
                            {formatCurrency(regionData.value)}
                          </td>
                        </tr>
                      )}
                      <tr>
                        <td className="py-1 text-muted-foreground">Activities</td>
                        <td className="py-1 text-right font-medium text-foreground">
                          {regionData?.activityCount ?? 0}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )
            })()}
        </div>
      </CardContent>

      {/* Expanded Dialog View */}
      <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
        <DialogContent className="max-w-4xl w-[90vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-2xl font-bold">
                  Subnational Allocation Map
                </DialogTitle>
                <DialogDescription className="text-base mt-1">
                  Myanmar States & Regions allocation percentages
                </DialogDescription>
              </div>
              <Button
                onClick={exportToJPEG}
                disabled={isExporting || loading}
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                title={isExporting ? 'Exporting...' : 'Export JPEG'}
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          <div className="mt-4 flex items-center justify-center">
            <svg
              viewBox={viewBox}
              className="w-full h-full max-w-[700px] max-h-[600px]"
              style={{ backgroundColor: 'white' }}
            >
              {paths.map(region => {
                const fillColor = getShade(region.percentage)
                const isHovered = hoveredRegion === region.fullName
                const centroid = calculateCentroid(region.pathData)

                return (
                  <g key={`expanded-${region.fullName}`}>
                    <path
                      d={region.pathData}
                      fill={fillColor}
                      stroke={isHovered ? "#4C5568" : "#64748b"}
                      strokeWidth={isHovered ? "0.08" : "0.04"}
                      className="cursor-pointer transition-all"
                      onClick={() => onRegionClick?.(region.fullName)}
                      onMouseEnter={() => {
                        setHoveredRegion(region.fullName)
                        setHoveredCentroid(centroid)
                      }}
                      onMouseLeave={() => {
                        setHoveredRegion(null)
                        setHoveredCentroid(null)
                      }}
                      style={{
                        filter: isHovered ? 'brightness(0.95)' : undefined,
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <title>{`${region.fullName}: ${region.percentage.toFixed(1)}%`}</title>
                    </path>
                  </g>
                )
              })}

              {/* Hover info box in expanded view */}
              {hoveredRegion && hoveredCentroid && (() => {
                const regionData = getHoveredRegionData()
                const hasDetailedData = regionData?.value !== undefined
                const boxHeight = hasDetailedData ? 2.4 : 1.2
                const boxWidth = hasDetailedData ? 5 : 4

                return (
                  <g transform={`translate(${hoveredCentroid.x - boxWidth / 2}, ${hoveredCentroid.y - boxHeight / 2})`} style={{ pointerEvents: 'none' }}>
                    <rect
                      x="0"
                      y="0"
                      width={boxWidth}
                      height={boxHeight}
                      fill="white"
                      stroke="#cbd5e1"
                      strokeWidth="0.02"
                      rx="0.1"
                      style={{ filter: 'drop-shadow(0 0.05px 0.1px rgba(0,0,0,0.1))' }}
                    />
                    {/* Region name header */}
                    <text x="0.2" y="0.45" style={{ fontSize: '0.35px', fontWeight: 'bold' }} fill="#1e293b">
                      {hoveredRegion}
                    </text>
                    {/* Divider line */}
                    <line x1="0.1" y1="0.65" x2={boxWidth - 0.1} y2="0.65" stroke="#e2e8f0" strokeWidth="0.015" />

                    {hasDetailedData ? (
                      <>
                        {/* Allocation row */}
                        <text x="0.2" y="1.0" style={{ fontSize: '0.28px' }} fill="#64748b">Allocation</text>
                        <text x={boxWidth - 0.2} y="1.0" style={{ fontSize: '0.28px', fontWeight: 500 }} fill="#1e293b" textAnchor="end">
                          {regionData?.percentage.toFixed(1)}%
                        </text>

                        {/* Value row */}
                        <text x="0.2" y="1.45" style={{ fontSize: '0.28px' }} fill="#64748b">Value</text>
                        <text x={boxWidth - 0.2} y="1.45" style={{ fontSize: '0.28px', fontWeight: 500 }} fill="#1e293b" textAnchor="end">
                          {regionData?.value ? formatCurrency(regionData.value) : '-'}
                        </text>

                        {/* Activities row */}
                        <text x="0.2" y="1.9" style={{ fontSize: '0.28px' }} fill="#64748b">Activities</text>
                        <text x={boxWidth - 0.2} y="1.9" style={{ fontSize: '0.28px', fontWeight: 500 }} fill="#1e293b" textAnchor="end">
                          {regionData?.activityCount ?? '-'}
                        </text>
                      </>
                    ) : (
                      <text x="0.2" y="0.95" style={{ fontSize: '0.3px' }} fill="#64748b">
                        Allocation: {regionData?.percentage.toFixed(1) ?? '0'}%
                      </text>
                    )}
                  </g>
                )
              })()}
            </svg>
          </div>

          <p className="text-sm text-muted-foreground mt-4">
            This interactive map provides a geographic visualization of aid distribution across Myanmar.
            Darker shading indicates higher allocation percentages, making it easy to identify regional
            concentrations and gaps at a glance. Hover over regions to see exact percentages, helping
            stakeholders understand spatial patterns in development assistance and inform decisions
            about geographic targeting of future interventions.
          </p>
        </DialogContent>
      </Dialog>
    </Card>
  )
}