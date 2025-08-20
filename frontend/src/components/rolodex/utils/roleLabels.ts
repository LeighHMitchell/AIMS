export const ROLE_CATEGORIES = {
  SYSTEM: 'system',
  ORGANIZATION: 'organization', 
  ACTIVITY: 'activity',
} as const;

export const ROLE_LABELS: Record<string, { label: string; color: string; category: string }> = {
  // System roles
  'super_user': { label: 'Super User', color: 'bg-red-100 text-red-800', category: ROLE_CATEGORIES.SYSTEM },
  'government_partner_tier_1': { label: 'Government Partner tier 1', color: 'bg-green-800 text-white', category: ROLE_CATEGORIES.SYSTEM },
  'government_partner_tier_2': { label: 'Government partner tier 2', color: 'bg-green-100 text-green-700', category: ROLE_CATEGORIES.SYSTEM },
  'development_partner_tier_1': { label: 'Data Submission', color: 'bg-blue-100 text-blue-700', category: ROLE_CATEGORIES.SYSTEM },
  'development_partner_tier_2': { label: 'Review & Approval', color: 'bg-blue-800 text-white', category: ROLE_CATEGORIES.SYSTEM },
  'orphan': { label: 'Unassigned User', color: 'bg-gray-100 text-gray-800', category: ROLE_CATEGORIES.SYSTEM },

  // Organization roles
  'ceo': { label: 'CEO', color: 'bg-indigo-100 text-indigo-800', category: ROLE_CATEGORIES.ORGANIZATION },
  'director': { label: 'Director', color: 'bg-indigo-100 text-indigo-700', category: ROLE_CATEGORIES.ORGANIZATION },
  'manager': { label: 'Manager', color: 'bg-cyan-100 text-cyan-800', category: ROLE_CATEGORIES.ORGANIZATION },
  'coordinator': { label: 'Coordinator', color: 'bg-cyan-100 text-cyan-700', category: ROLE_CATEGORIES.ORGANIZATION },
  'officer': { label: 'Officer', color: 'bg-teal-100 text-teal-800', category: ROLE_CATEGORIES.ORGANIZATION },
  'focal_point': { label: 'Focal Point', color: 'bg-orange-100 text-orange-800', category: ROLE_CATEGORIES.ORGANIZATION },
  'contact_person': { label: 'Contact Person', color: 'bg-amber-100 text-amber-800', category: ROLE_CATEGORIES.ORGANIZATION },

  // Activity roles
  'project_manager': { label: 'Project Manager', color: 'bg-rose-100 text-rose-800', category: ROLE_CATEGORIES.ACTIVITY },
  'project_lead': { label: 'Project Lead', color: 'bg-rose-100 text-rose-700', category: ROLE_CATEGORIES.ACTIVITY },
  'technical_lead': { label: 'Technical Lead', color: 'bg-pink-100 text-pink-800', category: ROLE_CATEGORIES.ACTIVITY },
  'me_officer': { label: 'M&E Officer', color: 'bg-violet-100 text-violet-800', category: ROLE_CATEGORIES.ACTIVITY },
  'finance_officer': { label: 'Finance Officer', color: 'bg-emerald-100 text-emerald-800', category: ROLE_CATEGORIES.ACTIVITY },
  'implementing_partner': { label: 'Implementing Partner', color: 'bg-lime-100 text-lime-800', category: ROLE_CATEGORIES.ACTIVITY },
  'beneficiary_contact': { label: 'Beneficiary Contact', color: 'bg-yellow-100 text-yellow-800', category: ROLE_CATEGORIES.ACTIVITY },

  // Default/fallback
  'default': { label: 'Contact', color: 'bg-slate-100 text-slate-800', category: 'other' },
};

export const SOURCE_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  'user': { label: 'System User', color: 'bg-blue-100 text-blue-800', icon: '' },
  'activity_contact': { label: 'Activity Contact', color: 'bg-purple-100 text-purple-800', icon: '' },
  'organization_contact': { label: 'Organization Contact', color: 'bg-green-100 text-green-800', icon: '' },
};

// Contact type categories for better filtering
export const CONTACT_TYPE_CATEGORIES = {
  SYSTEM_USERS: {
    key: 'system_users',
    label: 'Users',
    description: 'Users with system access',
    icon: '',
    color: 'bg-blue-100 text-blue-800'
  },
  ACTIVITY_CONTACTS: {
    key: 'activity_contacts', 
    label: 'Contacts',
    description: 'Contacts from activity reporting',
    icon: '',
    color: 'bg-purple-100 text-purple-800'
  },
  ORGANIZATION_CONTACTS: {
    key: 'organization_contacts',
    label: 'Organization Contacts', 
    description: 'Organization-level contacts',
    icon: '',
    color: 'bg-green-100 text-green-800'
  }
} as const;

export function getRoleLabel(role: string): { label: string; color: string; category: string } {
  if (!role || role === '') {
    return { label: '', color: '', category: '' };
  }
  const normalizedRole = role.toLowerCase().replace(/\s+/g, '_');
  return ROLE_LABELS[normalizedRole] || { label: '', color: '', category: '' };
}

export function getSourceLabel(source: string): { label: string; color: string; icon: string } {
  return SOURCE_LABELS[source] || SOURCE_LABELS['user'];
}

export function getRolesByCategory(category: string): Array<{ key: string; label: string; color: string }> {
  return Object.entries(ROLE_LABELS)
    .filter(([, config]) => config.category === category)
    .map(([key, config]) => ({ key, label: config.label, color: config.color }));
}

export function getAllRoles(): Array<{ key: string; label: string; color: string; category: string }> {
  return Object.entries(ROLE_LABELS).map(([key, config]) => ({ 
    key, 
    label: config.label, 
    color: config.color, 
    category: config.category 
  }));
}

// Country code to name mapping (common countries in aid/development context)
export const COUNTRY_NAMES: Record<string, string> = {
  'MM': 'Myanmar',
  'US': 'United States',
  'GB': 'United Kingdom', 
  'JP': 'Japan',
  'CN': 'China',
  'IN': 'India',
  'TH': 'Thailand',
  'SG': 'Singapore',
  'AU': 'Australia',
  'DE': 'Germany',
  'FR': 'France',
  'CA': 'Canada',
  'KR': 'South Korea',
  'NL': 'Netherlands',
  'CH': 'Switzerland',
  'SE': 'Sweden',
  'NO': 'Norway',
  'DK': 'Denmark',
  'IT': 'Italy',
  'ES': 'Spain',
  'BE': 'Belgium',
  'AT': 'Austria',
  'FI': 'Finland',
  'NZ': 'New Zealand',
  'ID': 'Indonesia',
  'MY': 'Malaysia',
  'PH': 'Philippines',
  'VN': 'Vietnam',
  'BD': 'Bangladesh',
  'LK': 'Sri Lanka',
};

export function getCountryName(countryCode: string): string {
  return COUNTRY_NAMES[countryCode?.toUpperCase()] || countryCode;
}

// Utility functions for contact type categories
export function getContactTypeCategories(): Array<{ key: string; label: string; description: string; icon: string; color: string }> {
  return Object.values(CONTACT_TYPE_CATEGORIES);
}

export function getContactTypeCategoryBySource(source: string): { key: string; label: string; description: string; icon: string; color: string } {
  switch (source) {
    case 'user':
      return CONTACT_TYPE_CATEGORIES.SYSTEM_USERS;
    case 'activity_contact':
      return CONTACT_TYPE_CATEGORIES.ACTIVITY_CONTACTS;
    case 'organization_contact':
      return CONTACT_TYPE_CATEGORIES.ORGANIZATION_CONTACTS;
    default:
      return CONTACT_TYPE_CATEGORIES.ACTIVITY_CONTACTS; // Default fallback
  }
}