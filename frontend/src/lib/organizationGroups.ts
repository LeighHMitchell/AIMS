import fs from 'fs';
import path from 'path';

// Use a simpler path resolution that works when Next.js runs from frontend/
const DATA_FILE_PATH = path.join(process.cwd(), 'data', 'organization-groups.json');

export interface OrganizationGroup {
  id: string;
  name: string;
  description: string;
  organizationIds: string[];
  createdBy: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
  updatedBy?: string;
  updatedByName?: string;
  isPublic: boolean;
}

// Ensure data directory exists
export function ensureDataDirectory() {
  const dataDir = path.dirname(DATA_FILE_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

// Load organization groups from file
export function loadOrganizationGroups(): OrganizationGroup[] {
  try {
    ensureDataDirectory();
    console.log('[OrganizationGroups] Loading from path:', DATA_FILE_PATH);
    console.log('[OrganizationGroups] File exists:', fs.existsSync(DATA_FILE_PATH));
    console.log('[OrganizationGroups] Working directory:', process.cwd());
    
    if (fs.existsSync(DATA_FILE_PATH)) {
      const data = fs.readFileSync(DATA_FILE_PATH, 'utf-8');
      const groups = JSON.parse(data);
      console.log('[OrganizationGroups] Loaded groups:', groups.length);
      return groups;
    }
    console.log('[OrganizationGroups] File not found, returning empty array');
    return [];
  } catch (error) {
    console.error('[OrganizationGroups] Error loading organization groups:', error);
    return [];
  }
}

// Save organization groups to file
export function saveOrganizationGroups(groups: OrganizationGroup[]): void {
  try {
    ensureDataDirectory();
    fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(groups, null, 2));
  } catch (error) {
    console.error('Error saving organization groups:', error);
    throw error;
  }
}

// Get a single organization group by ID
export function getOrganizationGroupById(id: string): OrganizationGroup | null {
  const groups = loadOrganizationGroups();
  return groups.find(group => group.id === id) || null;
}

// Create a new organization group
export function createOrganizationGroup(group: Omit<OrganizationGroup, 'id' | 'createdAt' | 'updatedAt'>): OrganizationGroup {
  const groups = loadOrganizationGroups();
  const newGroup: OrganizationGroup = {
    ...group,
    id: `grp-${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isPublic: group.isPublic ?? false // Default to private if not specified
  };
  groups.push(newGroup);
  saveOrganizationGroups(groups);
  return newGroup;
}

// Update an organization group
export function updateOrganizationGroup(id: string, updates: Partial<OrganizationGroup>, updatedBy: string, updatedByName?: string): OrganizationGroup | null {
  const groups = loadOrganizationGroups();
  const index = groups.findIndex(group => group.id === id);
  
  if (index === -1) {
    return null;
  }
  
  groups[index] = {
    ...groups[index],
    ...updates,
    id: groups[index].id, // Preserve ID
    createdAt: groups[index].createdAt, // Preserve creation date
    createdBy: groups[index].createdBy, // Preserve creator
    updatedAt: new Date().toISOString(),
    updatedBy,
    updatedByName
  };
  
  saveOrganizationGroups(groups);
  return groups[index];
}

// Delete an organization group
export function deleteOrganizationGroup(id: string): boolean {
  const groups = loadOrganizationGroups();
  const filteredGroups = groups.filter(group => group.id !== id);
  
  if (filteredGroups.length === groups.length) {
    return false; // Group not found
  }
  
  saveOrganizationGroups(filteredGroups);
  return true;
} 