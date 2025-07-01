"use client"

import React from 'react'
import { AidFlowMap } from '@/components/analytics/AidFlowMap'

export default function TestEnhancedAidFlowPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900">Enhanced Aid Flow Map Test</h1>
          <p className="text-slate-600 mt-2">
            Testing the enhanced Aid Flow Map with all new features including search, 
            transaction sidebar, and improved visualizations.
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h2 className="text-lg font-semibold mb-4">New Features to Test:</h2>
          <ul className="space-y-2 text-sm text-slate-700 mb-6">
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              <span><strong>Search Bar:</strong> Type an organization name in the search box to highlight and zoom to it</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              <span><strong>Click for Details:</strong> Click any node to open a sidebar with all transactions</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              <span><strong>Enhanced Visuals:</strong> Links now use color gradients and vary in width based on transaction value</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              <span><strong>Node Sizing:</strong> Node size reflects total transaction volume (inflow + outflow)</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              <span><strong>Improved Labels:</strong> Organization names move with nodes when dragged</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              <span><strong>Rich Tooltips:</strong> Hover over nodes to see detailed flow information</span>
            </li>
          </ul>
        </div>
        
        <AidFlowMap height={700} />
      </div>
    </div>
  )
} 