import sectorGroupData from './SectorGroup.json'

// Extract the data array from the JSON structure
const sectors = sectorGroupData.data

// Export the sectors data and utility functions
export const sectorHierarchy = sectors

// Create hierarchical structure for easier component use
export const createHierarchicalSectors = () => {
  const groups = new Map()
  
  sectors.forEach((sector: any) => {
    const groupCode = sector['codeforiati:group-code']
    const groupName = sector['codeforiati:group-name']
    const categoryCode = sector['codeforiati:category-code']
    const categoryName = sector['codeforiati:category-name']
    
    if (!groups.has(groupCode)) {
      groups.set(groupCode, {
        code: groupCode,
        name: groupName,
        categories: new Map()
      })
    }
    
    const group = groups.get(groupCode)
    if (!group.categories.has(categoryCode)) {
      group.categories.set(categoryCode, {
        code: categoryCode,
        name: categoryName,
        sectors: []
      })
    }
    
    group.categories.get(categoryCode).sectors.push({
      code: sector.code,
      name: sector.name,
      status: sector.status
    })
  })
  
  // Convert Maps to arrays for easier iteration
  const result = Array.from(groups.values()).map(group => ({
    ...group,
    categories: Array.from(group.categories.values())
  }))
  
  return result
}

export default sectorHierarchy