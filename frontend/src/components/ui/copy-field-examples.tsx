"use client"

import React from "react"
import { CopyField, CopyFieldGroup } from "./copy-field"

/**
 * Example usage scenarios for the CopyField component
 * This file demonstrates different ways to use CopyField in your AIMS application
 */

// Example 1: Basic stacked layout (default)
export function BasicCopyFieldExample() {
  return (
    <div className="space-y-4">
      <CopyField
        label="Activity Partner ID"
        value="ADB-IATI-231131"
      />
      <CopyField
        label="IATI Identifier"
        value="ADB-IATI-231131-001"
      />
      <CopyField
        label="System UUID"
        value="550e8400-e29b-41d4-a716-446655440000"
      />
    </div>
  )
}

// Example 2: Inline layout for compact display
export function InlineCopyFieldExample() {
  return (
    <div className="space-y-3">
      <CopyField
        label="Activity ID"
        value="ADB-IATI-231131"
        variant="inline"
      />
      <CopyField
        label="UUID"
        value="550e8400-e29b-41d4-a716-446655440000"
        variant="inline"
      />
    </div>
  )
}

// Example 3: Grouped fields with title
export function GroupedCopyFieldExample() {
  return (
    <CopyFieldGroup title="Activity Identifiers" variant="grid">
      <CopyField
        label="IATI Identifier"
        value="ADB-IATI-231131-001"
        placeholder="Will be generated when published"
      />
      <CopyField
        label="System UUID"
        value="550e8400-e29b-41d4-a716-446655440000"
        placeholder="Will be generated on save"
      />
      <CopyField
        label="Partner Reference"
        value="REF-2024-001"
        placeholder="Partner-specific reference"
      />
      <CopyField
        label="Transaction Reference"
        value=""
        placeholder="No transactions yet"
      />
    </CopyFieldGroup>
  )
}

// Example 4: Transaction identifiers in modal
export function TransactionIdentifiersExample() {
  const transactionId = "txn_550e8400-e29b-41d4-a716-446655440000"
  const activityId = "act_550e8400-e29b-41d4-a716-446655440001"
  
  return (
    <div className="space-y-4 pb-4 border-b border-gray-200">
      <h3 className="text-sm font-semibold text-gray-900">Transaction Identifiers</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CopyField
          label="Transaction UUID"
          value={transactionId}
          placeholder="System generated"
        />
        <CopyField
          label="Parent Activity UUID"
          value={activityId}
          placeholder="Parent activity ID"
        />
      </div>
    </div>
  )
}

// Example 5: Custom styling and behavior
export function CustomStyledCopyFieldExample() {
  return (
    <div className="space-y-4">
      <CopyField
        label="Custom Styled Field"
        value="ADB-IATI-231131"
        className="bg-blue-50 border-blue-200"
        labelClassName="text-blue-700 font-semibold"
        fieldClassName="bg-blue-50 border-blue-300 focus-within:ring-blue-400"
        toastMessage="Activity ID copied successfully!"
      />
      
      <CopyField
        label="No Toast Field"
        value="550e8400-e29b-41d4-a716-446655440000"
        showToast={false}
      />
      
      <CopyField
        label="Hidden Label Field"
        value="REF-2024-001"
        hideLabel={true}
      />
    </div>
  )
}

// Example 6: Empty/placeholder handling
export function EmptyFieldExample() {
  return (
    <div className="space-y-4">
      <CopyField
        label="Empty IATI ID"
        value=""
        placeholder="Will be generated when published"
      />
      <CopyField
        label="Missing UUID"
        value=""
        placeholder="Will be generated on save"
      />
      <CopyField
        label="No Partner ID"
        value="   "  // Whitespace only
        placeholder="Enter partner ID"
      />
    </div>
  )
}

// Usage in Activity Editor General Tab
export function ActivityEditorIdentifiersExample({ activity }: { activity: any }) {
  return (
    <>
      {/* Editable Partner ID field */}
      <div className="space-y-2">
        <label htmlFor="partnerId" className="text-sm font-medium">
          Activity Partner ID *
        </label>
        <input
          id="partnerId"
          value={activity.partnerId || ''}
          onChange={(e) => {/* handle change */}}
          placeholder="Partner ID"
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
      </div>

      {/* Read-only identifiers with copy functionality */}
      <CopyFieldGroup title="Activity Identifiers" variant="grid">
        <CopyField
          label="IATI Identifier"
          value={activity.iatiId}
          placeholder="Will be generated when published"
        />
        <CopyField
          label="System UUID"
          value={activity.id}
          placeholder="Will be generated on save"
        />
      </CopyFieldGroup>
    </>
  )
}

// Usage in Transaction Modal
export function TransactionModalIdentifiersExample({ 
  transaction, 
  activityId 
}: { 
  transaction?: any
  activityId: string 
}) {
  const isEditing = !!transaction
  
  if (!isEditing) {
    return null // Only show for existing transactions
  }

  return (
    <div className="space-y-4 pb-4 border-b border-gray-200">
      <h3 className="text-sm font-semibold text-gray-900">Transaction Identifiers</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CopyField
          label="Transaction UUID"
          value={transaction?.id || ''}
          placeholder="System generated"
        />
        <CopyField
          label="Activity UUID"
          value={activityId}
          placeholder="Parent activity ID"
        />
      </div>
    </div>
  )
}