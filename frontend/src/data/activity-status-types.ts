/**
 * IATI Activity Status Types
 * Based on IATI Activity Status codelist
 */

export interface ActivityStatusType {
  code: string;
  name: string;
  description: string;
}

export interface ActivityStatusGroup {
  label: string;
  options: ActivityStatusType[];
}

export const ACTIVITY_STATUS_GROUPS: ActivityStatusGroup[] = [
  {
    label: "Planning",
    options: [
      {
        code: "1",
        name: "Pipeline",
        description: "The activity is being scoped or planned."
      }
    ]
  },
  {
    label: "Ongoing",
    options: [
      {
        code: "2",
        name: "Implementation",
        description: "The activity is currently being implemented."
      },
      {
        code: "6",
        name: "Suspended",
        description: "The activity is temporarily suspended."
      },
      {
        code: "3",
        name: "Finalisation",
        description: "Delivery is complete, but financial or M&E closure is pending."
      }
    ]
  },
  {
    label: "Completed",
    options: [
      {
        code: "4",
        name: "Closed",
        description: "Physical activity is complete and fully closed."
      },
      {
        code: "5",
        name: "Cancelled",
        description: "The activity has been cancelled before completion."
      }
    ]
  }
];

// Keep the original for backward compatibility
export const ACTIVITY_STATUS_TYPES: ActivityStatusGroup[] = ACTIVITY_STATUS_GROUPS;

// Flattened list of all activity status types
export const ALL_ACTIVITY_STATUS_TYPES = ACTIVITY_STATUS_GROUPS.flatMap(group => group.options);

// Helper to get activity status by code
export function getActivityStatusByCode(code: string): ActivityStatusType | undefined {
  return ALL_ACTIVITY_STATUS_TYPES.find(type => type.code === code);
}

// Valid activity status codes
export const VALID_ACTIVITY_STATUS_CODES = ["1", "2", "3", "4", "5", "6"] as const;
export type ActivityStatusCode = typeof VALID_ACTIVITY_STATUS_CODES[number]; 