export interface LocationTypeOption {
  value: string;
  label: string;
  category: string;
  description?: string;
}

export interface LocationTypeCategory {
  label: string;
  options: LocationTypeOption[];
}

export const LOCATION_TYPE_CATEGORIES: LocationTypeCategory[] = [
  {
    label: "A. Organisational Offices",
    options: [
      { value: "OF1", label: "OF1 - Head Office", category: "organisational_offices" },
      { value: "OF2", label: "OF2 - Field Office", category: "organisational_offices" },
      { value: "OF3", label: "OF3 - Provincial / District Office", category: "organisational_offices" },
      { value: "OF4", label: "OF4 - Regional Hub / Coordination Office", category: "organisational_offices" },
      { value: "OF5", label: "OF5 - Partner Office", category: "organisational_offices" }
    ]
  },
  {
    label: "B. Operational & Support Bases",
    options: [
      { value: "OP1", label: "OP1 - Embedded TA Location", category: "operational_support" },
      { value: "OP2", label: "OP2 - Temporary Field Base / Mobile Unit", category: "operational_support" },
      { value: "OP3", label: "OP3 - Monitoring & Evaluation Field Station", category: "operational_support" },
      { value: "OP4", label: "OP4 - Logistics Base", category: "operational_support" },
      { value: "OP5", label: "OP5 - Warehouse / Storage Facility", category: "operational_support" }
    ]
  },
  {
    label: "C. Service Delivery Sites",
    options: [
      { value: "SD1", label: "SD1 - Project Site / Facility", category: "service_delivery" },
      { value: "SD2", label: "SD2 - Health Facility", category: "service_delivery" },
      { value: "SD3", label: "SD3 - Education Facility", category: "service_delivery" },
      { value: "SD4", label: "SD4 - Safe House / Shelter", category: "service_delivery" },
      { value: "SD5", label: "SD5 - Community Resource Centre", category: "service_delivery" },
      { value: "SD6", label: "SD6 - Community Meeting Point / Local Venue", category: "service_delivery" }
    ]
  },
  {
    label: "D. Specialised / Contextual Sites",
    options: [
      { value: "SC1", label: "SC1 - Training or Resource Centre", category: "specialised_contextual" },
      { value: "SC2", label: "SC2 - Refugee / IDP Camp", category: "specialised_contextual" },
      { value: "SC3", label: "SC3 - Border Post / Crossing Point", category: "specialised_contextual" },
      { value: "SC4", label: "SC4 - Agricultural Demonstration Site", category: "specialised_contextual" }
    ]
  },
  {
    label: "E. Other",
    options: [
      { 
        value: "OT1", 
        label: "OT1 - Other Location", 
        category: "other",
        description: "Use only when the location does not fit any of the above categories (requires a short description)"
      }
    ]
  }
];

// Helper function to get all location types as a flat array
export function getAllLocationTypes(): LocationTypeOption[] {
  return LOCATION_TYPE_CATEGORIES.flatMap(category => category.options);
}

// Helper function to get location type label by value
export function getLocationTypeLabel(value: string): string {
  const allTypes = getAllLocationTypes();
  const type = allTypes.find(t => t.value === value);
  return type?.label || value;
}

// Helper function to get location type category by value
export function getLocationTypeCategory(value: string): string {
  const allTypes = getAllLocationTypes();
  const type = allTypes.find(t => t.value === value);
  return type?.category || '';
}
