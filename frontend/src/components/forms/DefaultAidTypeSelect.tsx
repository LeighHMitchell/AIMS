"use client"

// Re-export from the new AidTypeSelect component
export { AidTypeSelect as DefaultAidTypeSelect } from './AidTypeSelect'

// Re-export helper function
import aidTypesData from "@/data/aid-types.json"

interface AidType {
  code: string
  name: string
  description?: string
  children?: AidType[]
}

// Helper function to get aid type label from code
export const getAidTypeLabel = (code: string): string => {
  const findInTree = (items: AidType[]): AidType | undefined => {
    for (const item of items) {
      if (item.code === code) return item
      if (item.children) {
        const found = findInTree(item.children)
        if (found) return found
      }
    }
    return undefined
  }
  
  const aidType = findInTree(aidTypesData as AidType[])
  return aidType ? `${aidType.code} – ${aidType.name}` : code
}