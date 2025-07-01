'use client';

import React from 'react';
import ActivityBudgetsTab from '@/components/activities/ActivityBudgetsTab';

// Demo activity ID - you can replace this with a real one from your database
const DEMO_ACTIVITY_ID = '8e4cd436-a26a-4af0-8857-c45733ccc72f';

export default function ActivityBudgetsDemoPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Activity Budgets Demo
          </h1>
          <p className="text-gray-600">
            IATI-compliant budget management interface for activities
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">
            Budget Information
          </h2>
          <ActivityBudgetsTab 
            activityId={DEMO_ACTIVITY_ID}
            startDate="2024-01-01"
            endDate="2026-12-31"
            defaultCurrency="USD"
          />
        </div>

        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-medium text-blue-900 mb-2">
            Component Features
          </h3>
          <ul className="space-y-2 text-blue-800">
            <li className="flex items-start">
              <span className="mr-2">✓</span>
              <span>Toggle for "Budget not provided" with reason field</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">✓</span>
              <span>Add, edit, and delete budget periods</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">✓</span>
              <span>Validation for overlapping periods and date ranges</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">✓</span>
              <span>Automatic total calculation (uses revised values if available)</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">✓</span>
              <span>Split year into quarters functionality</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">✓</span>
              <span>Duplicate budget row feature</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">✓</span>
              <span>IATI Standard 2.03 compliant</span>
            </li>
          </ul>
        </div>

        <div className="mt-8 bg-gray-100 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            IATI Budget Types
          </h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-700">
            <div>
              <h4 className="font-medium mb-1">Type</h4>
              <p>• Original (1): Initial budget estimate</p>
              <p>• Revised (2): Updated budget amount</p>
            </div>
            <div>
              <h4 className="font-medium mb-1">Status</h4>
              <p>• Indicative (1): Estimated amount</p>
              <p>• Committed (2): Confirmed funding</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 