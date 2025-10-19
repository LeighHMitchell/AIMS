"use client"

import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MapPin } from 'lucide-react'
import { HelpTextTooltip } from "@/components/ui/help-text-tooltip"

interface MyanmarRegionsMapProps {
  breakdowns: Record<string, number>
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
  const [geoData, setGeoData] = useState<GeoJSONData | null>(null)
  const [loading, setLoading] = useState(true)

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

  // Function to get blue shade based on percentage (0-100)
  const getBlueShade = (percentage: number): string => {
    if (percentage === 0) return '#f0f9ff'  // blue-50
    if (percentage <= 10) return '#dbeafe'  // blue-100
    if (percentage <= 20) return '#bfdbfe'  // blue-200
    if (percentage <= 30) return '#93c5fd'  // blue-300
    if (percentage <= 40) return '#60a5fa'  // blue-400
    if (percentage <= 50) return '#3b82f6'  // blue-500
    if (percentage <= 60) return '#2563eb'  // blue-600
    if (percentage <= 80) return '#1d4ed8'  // blue-700
    return '#1e40af'  // blue-800 for >80%
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
      const percentage = Object.prototype.hasOwnProperty.call(breakdowns, fullName) 
        ? breakdowns[fullName as keyof typeof breakdowns] 
        : 0

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

  if (loading) {
    return (
      <Card className="w-full h-full">
        <CardContent className="p-4 h-full flex items-center justify-center">
          <div className="text-gray-500">Loading map...</div>
        </CardContent>
      </Card>
    )
  }

  if (!geoData) {
    return (
      <Card className="w-full h-full">
        <CardContent className="p-4 h-full flex items-center justify-center">
          <div className="text-gray-500">Failed to load map data</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Subnational Allocation Map
          <HelpTextTooltip content="Click on regions to add them to the breakdown. Colors show allocation percentages." />
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 flex-1">

        <div className="w-full h-full flex items-center justify-center">
            <svg 
              viewBox={viewBox}
              className="w-full h-full max-w-[600px] max-h-[700px]"
              style={{ backgroundColor: '#fafbfc' }}
            >
              {/* Draw regions */}
              {paths.map(region => {
                const fillColor = getBlueShade(region.percentage)
                const isHovered = hoveredRegion === region.fullName
                const centroid = calculateCentroid(region.pathData)
                
                return (
                  <g key={region.fullName}>
                    <path
                      d={region.pathData}
                      fill={fillColor}
                      stroke={isHovered ? "#1e40af" : "#64748b"}
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
              

              {/* Hover info box */}
              {hoveredRegion && hoveredCentroid && (
                <g transform={`translate(${hoveredCentroid.x - 2}, ${hoveredCentroid.y - 2})`}>
                  <rect
                    x="0"
                    y="0"
                    width="4"
                    height="1.2"
                    fill="white"
                    stroke="#cbd5e1"
                    strokeWidth="0.02"
                    rx="0.1"
                    style={{ filter: 'drop-shadow(0 0.05px 0.1px rgba(0,0,0,0.1))' }}
                  />
                  <text x="0.2" y="0.5" style={{ fontSize: '0.35px', fontWeight: 'bold' }} fill="#1e293b">
                    {hoveredRegion}
                  </text>
                  <text x="0.2" y="0.9" style={{ fontSize: '0.3px' }} fill="#64748b">
                    Allocation: {(() => {
                      const val = Object.prototype.hasOwnProperty.call(breakdowns, hoveredRegion) 
                        ? breakdowns[hoveredRegion as keyof typeof breakdowns] 
                        : 0
                      return val.toFixed(1)
                    })()}%
                  </text>
                </g>
              )}
            </svg>
        </div>
      </CardContent>
    </Card>
  )
}