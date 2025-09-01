// App features and functionalities for feedback targeting
export interface AppFeature {
  code: string;
  name: string;
  description: string;
  group: string;
}

export interface AppFeatureGroup {
  label: string;
  features: AppFeature[];
}

export const APP_FEATURES: AppFeatureGroup[] = [
  {
    label: "Dashboard & Overview",
    features: [
      {
        code: "dashboard_main",
        name: "Main Dashboard",
        description: "Overview page with key metrics and recent activities",
        group: "Dashboard & Overview"
      },
      {
        code: "dashboard_analytics",
        name: "Analytics Dashboard", 
        description: "Data visualization and reporting dashboard",
        group: "Dashboard & Overview"
      },
      {
        code: "dashboard_aid_effectiveness",
        name: "Aid Effectiveness Dashboard",
        description: "Aid effectiveness metrics and indicators",
        group: "Dashboard & Overview"
      }
    ]
  },
  {
    label: "Activities Management",
    features: [
      {
        code: "activities_list",
        name: "Activities List",
        description: "Browse and search all activities",
        group: "Activities Management"
      },
      {
        code: "activities_create",
        name: "Create Activity",
        description: "Add new development activities",
        group: "Activities Management"
      },
      {
        code: "activities_import",
        name: "Import Activities",
        description: "Bulk import activities from files or IATI",
        group: "Activities Management"
      }
    ]
  },
  {
    label: "Activity Editor - Basic Information",
    features: [
      {
        code: "activity_basic_info",
        name: "Basic Information Tab",
        description: "Activity title, description, status, and basic details",
        group: "Activity Editor - Basic Information"
      },
      {
        code: "activity_identifiers",
        name: "Identifiers & References",
        description: "Activity ID, IATI identifier, and other reference numbers",
        group: "Activity Editor - Basic Information"
      },
      {
        code: "activity_dates",
        name: "Dates & Timeline",
        description: "Start date, end date, and activity timeline management",
        group: "Activity Editor - Basic Information"
      },
      {
        code: "activity_status",
        name: "Status Management",
        description: "Activity status selection and lifecycle management",
        group: "Activity Editor - Basic Information"
      }
    ]
  },
  {
    label: "Activity Editor - Financial",
    features: [
      {
        code: "activity_budgets",
        name: "Budgets Tab",
        description: "Activity budget planning and allocation",
        group: "Activity Editor - Financial"
      },
      {
        code: "activity_transactions",
        name: "Transactions Tab", 
        description: "Financial transactions and disbursements",
        group: "Activity Editor - Financial"
      },
      {
        code: "activity_currency",
        name: "Currency Management",
        description: "Currency selection and conversion",
        group: "Activity Editor - Financial"
      },
      {
        code: "activity_finance_types",
        name: "Finance Types",
        description: "IATI finance type classification",
        group: "Activity Editor - Financial"
      }
    ]
  },
  {
    label: "Activity Editor - Classifications",
    features: [
      {
        code: "activity_sectors",
        name: "Sectors Tab",
        description: "Sector classification and percentages",
        group: "Activity Editor - Classifications"
      },
      {
        code: "activity_sdg",
        name: "SDG Goals",
        description: "Sustainable Development Goals mapping",
        group: "Activity Editor - Classifications"
      },
      {
        code: "activity_policy_markers",
        name: "Policy Markers",
        description: "IATI policy marker classifications",
        group: "Activity Editor - Classifications"
      },
      {
        code: "activity_aid_types",
        name: "Aid Types",
        description: "Type of aid and assistance classification",
        group: "Activity Editor - Classifications"
      }
    ]
  },
  {
    label: "Activity Editor - Geographic",
    features: [
      {
        code: "activity_locations",
        name: "Locations Tab",
        description: "Geographic locations and coordinates",
        group: "Activity Editor - Geographic"
      },
      {
        code: "activity_recipient_countries",
        name: "Recipient Countries",
        description: "Target countries and regions",
        group: "Activity Editor - Geographic"
      },
      {
        code: "activity_map_view",
        name: "Map Visualization",
        description: "Interactive map display of activity locations",
        group: "Activity Editor - Geographic"
      }
    ]
  },
  {
    label: "Activity Editor - Partnerships",
    features: [
      {
        code: "activity_organizations",
        name: "Organizations Tab",
        description: "Partner organizations and roles",
        group: "Activity Editor - Partnerships"
      },
      {
        code: "activity_collaboration",
        name: "Collaboration Types",
        description: "Type of collaboration and partnership arrangements",
        group: "Activity Editor - Partnerships"
      },
      {
        code: "activity_contacts",
        name: "Contacts",
        description: "Contact persons and communication details",
        group: "Activity Editor - Partnerships"
      }
    ]
  },
  {
    label: "Activity Editor - Documentation",
    features: [
      {
        code: "activity_documents",
        name: "Documents Tab",
        description: "Attach and manage activity documents",
        group: "Activity Editor - Documentation"
      },
      {
        code: "activity_links",
        name: "Related Links",
        description: "External links and web resources",
        group: "Activity Editor - Documentation"
      },
      {
        code: "activity_comments",
        name: "Comments & Notes",
        description: "Internal comments and collaboration notes",
        group: "Activity Editor - Documentation"
      }
    ]
  },
  {
    label: "Activity Editor - Advanced",
    features: [
      {
        code: "activity_linked_activities",
        name: "Linked Activities",
        description: "Related and connected activities",
        group: "Activity Editor - Advanced"
      },
      {
        code: "activity_conditions",
        name: "Conditions",
        description: "Activity conditions and requirements",
        group: "Activity Editor - Advanced"
      },
      {
        code: "activity_results",
        name: "Results Framework",
        description: "Results, indicators, and outcomes tracking",
        group: "Activity Editor - Advanced"
      },
      {
        code: "activity_validation",
        name: "Data Validation",
        description: "Data quality checks and validation rules",
        group: "Activity Editor - Advanced"
      }
    ]
  },
  {
    label: "Organizations Management",
    features: [
      {
        code: "organizations_list",
        name: "Organizations Directory",
        description: "Browse and manage partner organizations",
        group: "Organizations Management"
      },
      {
        code: "organizations_create",
        name: "Add Organization",
        description: "Register new partner organizations",
        group: "Organizations Management"
      },
      {
        code: "organizations_profiles",
        name: "Organization Profiles",
        description: "Detailed organization information and profiles",
        group: "Organizations Management"
      },
      {
        code: "organizations_roles",
        name: "Organization Roles",
        description: "Define and manage organization roles in activities",
        group: "Organizations Management"
      }
    ]
  },
  {
    label: "Data Management",
    features: [
      {
        code: "data_import_export",
        name: "Import/Export",
        description: "Data import and export functionality",
        group: "Data Management"
      },
      {
        code: "data_iati_import",
        name: "IATI Import",
        description: "Import data from IATI XML files",
        group: "Data Management"
      },
      {
        code: "data_validation",
        name: "Data Validation",
        description: "Data quality checks and validation tools",
        group: "Data Management"
      },
      {
        code: "data_clinic",
        name: "Data Clinic",
        description: "Data quality improvement and cleanup tools",
        group: "Data Management"
      }
    ]
  },
  {
    label: "Reporting & Analytics",
    features: [
      {
        code: "reports_standard",
        name: "Standard Reports",
        description: "Pre-built reports and dashboards",
        group: "Reporting & Analytics"
      },
      {
        code: "reports_custom",
        name: "Custom Reports",
        description: "Create custom reports and visualizations",
        group: "Reporting & Analytics"
      },
      {
        code: "analytics_charts",
        name: "Charts & Graphs",
        description: "Data visualization and charting tools",
        group: "Reporting & Analytics"
      },
      {
        code: "analytics_export",
        name: "Export Analytics",
        description: "Export reports and data for external use",
        group: "Reporting & Analytics"
      }
    ]
  },
  {
    label: "User Management & Settings",
    features: [
      {
        code: "user_profile",
        name: "User Profile",
        description: "Personal profile and account settings",
        group: "User Management & Settings"
      },
      {
        code: "user_roles",
        name: "User Roles & Permissions",
        description: "Role-based access control and permissions",
        group: "User Management & Settings"
      },
      {
        code: "settings_system",
        name: "System Settings",
        description: "Application configuration and preferences",
        group: "User Management & Settings"
      },
      {
        code: "settings_notifications",
        name: "Notifications",
        description: "Notification preferences and alerts",
        group: "User Management & Settings"
      }
    ]
  },
  {
    label: "Search & Navigation",
    features: [
      {
        code: "search_global",
        name: "Global Search",
        description: "Search across all activities and data",
        group: "Search & Navigation"
      },
      {
        code: "search_filters",
        name: "Advanced Filters",
        description: "Filter and refine search results",
        group: "Search & Navigation"
      },
      {
        code: "navigation_sidebar",
        name: "Side Navigation",
        description: "Main navigation menu and sidebar",
        group: "Search & Navigation"
      },
      {
        code: "navigation_breadcrumbs",
        name: "Breadcrumbs",
        description: "Navigation breadcrumbs and page hierarchy",
        group: "Search & Navigation"
      }
    ]
  },
  {
    label: "Collaboration & Communication",
    features: [
      {
        code: "collaboration_comments",
        name: "Comments System",
        description: "Commenting and discussion features",
        group: "Collaboration & Communication"
      },
      {
        code: "collaboration_notifications",
        name: "Notifications",
        description: "System notifications and alerts",
        group: "Collaboration & Communication"
      },
      {
        code: "collaboration_sharing",
        name: "Sharing & Permissions",
        description: "Share activities and manage access permissions",
        group: "Collaboration & Communication"
      },
      {
        code: "collaboration_workflow",
        name: "Workflow Management",
        description: "Approval workflows and review processes",
        group: "Collaboration & Communication"
      }
    ]
  },
  {
    label: "Integration & API",
    features: [
      {
        code: "integration_iati",
        name: "IATI Integration",
        description: "IATI standard compliance and publishing",
        group: "Integration & API"
      },
      {
        code: "integration_external",
        name: "External Systems",
        description: "Integration with external systems and APIs",
        group: "Integration & API"
      },
      {
        code: "api_endpoints",
        name: "API Access",
        description: "REST API endpoints and data access",
        group: "Integration & API"
      },
      {
        code: "integration_sync",
        name: "Data Synchronization",
        description: "Sync data with external databases",
        group: "Integration & API"
      }
    ]
  }
];

// Flatten all features for easy searching
export const ALL_APP_FEATURES: AppFeature[] = APP_FEATURES.flatMap(group =>
  group.features.map(feature => ({
    ...feature,
    group: group.label,
  }))
);
