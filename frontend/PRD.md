# æther — Product Requirements Document

## 1. Product Overview

### What is æther?

æther is an **Aid Information Management System (AIMS)** — a web-based platform for tracking, coordinating, and reporting on development aid activities. It serves as the central registry for a country's aid portfolio, enabling government ministries, development partners, and the public to view and manage development cooperation data in compliance with the **IATI v2.03 standard**.

### Problem Statement

Development aid coordination suffers from fragmented data across multiple donors and government agencies. Without a unified system, governments cannot effectively track incoming aid flows, identify funding gaps, avoid duplication, or report transparently to citizens and the international community.

### Target Users

| Role | Description |
|------|-------------|
| **Super User** | System administrators with full access to all features, user management, and system configuration |
| **Government Partner Tier 1** | Senior government officials who can create, validate, and publish activities; manage users |
| **Government Partner Tier 2** | Government staff who can create and edit activities but cannot validate or publish |
| **Development Partner Tier 1** | Senior donor/NGO representatives who can create and manage their organization's activities |
| **Development Partner Tier 2** | Donor/NGO staff with limited editing permissions on their organization's activities |
| **Public User** | Read-only access to published activity data and analytics dashboards |

### Permission Matrix

| Capability | Super User | Gov T1 | Gov T2 | Dev T1 | Dev T2 | Public |
|-----------|:---:|:---:|:---:|:---:|:---:|:---:|
| Create activities | Yes | Yes | Yes | Yes | No | No |
| Edit all activities | Yes | Yes | No | No | No | No |
| Edit own org activities | Yes | Yes | Yes | Yes | Yes | No |
| Validate activities | Yes | Yes | No | No | No | No |
| Publish activities | Yes | Yes | No | No | No | No |
| Manage users | Yes | Yes | No | No | No | No |
| View analytics | Yes | Yes | Yes | Yes | Yes | Yes |
| Import IATI data | Yes | Yes | No | Yes | No | No |

---

## 2. Core Modules

### 2.1 DFMIS (Development Finance Management Information System)

The primary module — manages the full lifecycle of aid activities from creation to publication.

**Key Features:**
- Activity CRUD with multi-tab editor (Overview, Finance, Sectors, Locations, Results, Documents, Stakeholders)
- Transaction management with 13 IATI-compliant types (Incoming Funds, Disbursements, Expenditure, Commitments, Loan Repayment, etc.)
- Budget tracking with Original/Revised status and Indicative/Committed types
- Results framework (Outputs, Outcomes, Impacts) with indicators, baselines, targets, and actuals
- Multi-contributor collaboration with permission levels (nominated, accepted, declined)
- SDG alignment mapping to 17 goals and 169 targets
- Sector allocation at both activity-level and transaction-level (DAC 3-digit and 5-digit codes)
- Policy markers tracking
- Humanitarian scope classification
- Conditions management for aid conditionality
- Activity matching for duplicate detection
- Readiness assessment scoring
- IATI XML import and export

### 2.2 Project Bank

A project pipeline management module for tracking development projects from concept to implementation.

**Key Features:**
- Project lifecycle management (concept → appraisal → approved → implementation → completed)
- Gap analysis to identify funding shortfalls
- Project monitoring dashboards
- Review workflow with multi-stage approval
- Transfer management between projects
- Appraisal wizard for structured project evaluation
- National priorities alignment

### 2.3 Land Bank

A parcel management module for tracking land assets associated with development projects.

**Key Features:**
- Parcel registration with geospatial coordinates
- Parcel detail views with associated activity links
- Map-based parcel visualization
- Parcel listing with search and filter

---

## 3. Data Model

### Core Entities

```
Activity (Central Entity)
├── title, description, acronym
├── status: draft → pending_validation → validated → rejected → published
├── IATI identifier, reporting organization
├── activity_dates (planned/actual start/end)
├── contact_info (email, phone, website)
│
├── Transactions (1:many)
│   ├── 13 types: Incoming Funds, Outgoing Commitment, Disbursement,
│   │   Expenditure, Interest Payment, Loan Repayment, Reimbursement,
│   │   Equity Purchase/Sale, Credit Guarantee, Pledges/Commitments
│   ├── value, currency, transaction_date
│   ├── provider_org, receiver_org
│   ├── flow_type (ODA, OOF, Private, FDI)
│   ├── finance_type (100+ IATI codes)
│   ├── tied_status (Tied, Partially Tied, Untied)
│   └── USD conversion
│
├── Budgets (1:many)
│   ├── type: Original / Revised
│   ├── status: Indicative / Committed
│   └── period (start_date, end_date), value, currency
│
├── Results (1:many)
│   ├── type: Output, Outcome, Impact, Other
│   ├── Indicators (1:many per result)
│   │   ├── measure: Unit, Percentage, Currency, Qualitative
│   │   ├── baseline (year, value)
│   │   └── periods with target and actual values
│   └── Document links
│
├── Sectors (many:many)
│   ├── DAC 3-digit and 5-digit hierarchical codes
│   └── percentage allocation (must sum to 100%)
│
├── Locations (many:many)
│   ├── name, coordinates (lat/lng)
│   ├── administrative level
│   └── location class and reach
│
├── Organizations (many:many)
│   ├── roles: funder, implementer, coordinator, partner
│   ├── types: Government, NGO, Multilateral, Private Sector, etc.
│   └── IATI organization codes
│
├── SDG Goals & Targets (many:many)
│   └── contribution percentage
│
├── Contributors (many:many)
│   ├── permission levels
│   └── status: nominated, accepted, declined, requested
│
└── Documents, Comments, Activity Logs (audit trail)

Organization
├── name, acronym, type (11 IATI types)
├── IATI organization code
├── headquarters, website, contact details
└── relationships to activities (funder, implementer, etc.)

User
├── email, name, role (6 tiers)
├── organization affiliation
└── bookmarks, tasks, notifications
```

### Reference Data

The system includes 40+ reference data files for IATI compliance:
- **240+ DAC sector codes** with 3-digit/5-digit hierarchy
- **180+ currency codes** with exchange rates
- **250+ country codes** (ISO 3166-1 with IATI mappings)
- **100+ finance type codes**
- **13 transaction type codes**
- **11 organization type codes**
- **Flow types** (ODA, OOF, Private grants, FDI, etc.)
- **Aid type codes** (A01–C10+: budget support, project-type, commodity aid, etc.)
- **Disbursement channel codes**
- **Tied status codes**
- **Humanitarian scope codes**
- **Language codes** (ISO)
- **Policy marker codes**

---

## 4. IATI v2.03 Compliance

æther implements the International Aid Transparency Initiative (IATI) standard v2.03 for development cooperation data exchange.

### Import Capabilities
- IATI-XML file import with validation
- Bulk import from IATI Datastore API
- Enhanced import with conflict resolution (skip/overwrite/merge strategies)
- Organization IATI data import with relationship mapping

### Export Capabilities
- Full IATI-XML export for each activity
- Batch export of activity portfolios
- Aid effectiveness data export
- Budget and transaction CSV exports

### Standard Coverage
- Activity identifiers, dates, status
- Participating organizations with roles
- Sector classifications (DAC 3/5-digit)
- Geographic locations with coordinates
- Transaction types and financial data
- Results framework
- Document links
- Conditions and policy markers
- Humanitarian scope

---

## 5. Design System

### Technology Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v3 |
| Component Library | shadcn/ui (128 components) |
| Primitives | Radix UI |
| Forms | React Hook Form v7 + Zod |
| Charts | Recharts v2 |
| Maps | Leaflet + MapLibre GL + Mapbox GL + Google Maps |
| Icons | Lucide React + Radix Icons + Custom set |
| Notifications | Sonner (toast) |
| Onboarding | React Joyride (guided tours) |
| Loading | NProgress (page transitions) |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth with RLS |

### Color System

HSL-based CSS custom properties with full dark mode support via `.dark` class selector.

**Semantic Tokens:**
```
--background       Light: 0 0% 100%       Dark: 20 14.3% 3.9%
--foreground       Light: 20 14.3% 3.9%   Dark: 60 9.1% 97.8%
--primary          Light: 24 9.8% 10%     Dark: 60 9.1% 97.8%
--secondary        Light: 60 4.8% 95.9%   Dark: 12 6.5% 15.1%
--destructive      Light: 0 84.2% 60.2%   Dark: 0 62.8% 30.6%
--muted            Light: 60 4.8% 95.9%   Dark: 12 6.5% 15.1%
--accent           Light: 60 4.8% 95.9%   Dark: 12 6.5% 15.1%
```

**Brand Palette:**
| Name | Hex | Usage |
|------|-----|-------|
| Scarlet | `#dc2625` | Alerts, destructive actions |
| Pale Slate | `#cfd0d5` | Borders, subtle backgrounds |
| Blue Slate | `#4c5568` | Secondary text, icons |
| Cool Steel | `#7b95a7` | Muted elements |
| Platinum | `#f1f4f8` | Page backgrounds |

**Chart Colors:** 5 dedicated chart color tokens for consistent data visualization.

### Typography

- **Primary Font:** Inter (Google Fonts via next/font)
- **Rendering:** Antialiased, optimizeLegibility
- **Numbers:** Tabular numbers enabled on body for aligned financial figures
- **Headings:** Text wrapping set to `balance` to prevent orphaned words (h1–h6)

### Border Radius

```
--radius: 0.5rem (lg)
md: calc(var(--radius) - 2px)
sm: calc(var(--radius) - 4px)
```

### Container

- Max width: 1400px
- Centered with 2rem horizontal padding

---

## 6. Layout & Navigation

### App Shell

```
┌──────────────────────────────────────────────────┐
│ ┌─────────┐ ┌──────────────────────────────────┐ │
│ │         │ │         Top Navigation            │ │
│ │         │ │  [Search] [Notifications] [User]  │ │
│ │         │ ├──────────────────────────────────┤ │
│ │ Sidebar │ │                                    │ │
│ │  288px  │ │        Main Content Area           │ │
│ │  Fixed  │ │        (scrollable)                │ │
│ │         │ │                                    │ │
│ │  Logo   │ │                                    │ │
│ │  Nav    │ │                                    │ │
│ │  Groups │ │                                    │ │
│ │         │ │                                    │ │
│ └─────────┘ └──────────────────────────────────┘ │
└──────────────────────────────────────────────────┘
```

**Sidebar (288px fixed):**
- Fixed position, left-aligned, z-40
- Logo section with 48x48px app logo + title + version badge
- Collapsible navigation groups (Radix Collapsible)
- Permission-based menu visibility (role-driven)
- Quick-add action buttons (+ icons) for creating new items
- Hover tooltips on navigation items
- Active state detection via `usePathname()`
- Badge counters for quick stats

**Top Navigation:**
- User menu dropdown
- Settings access
- Search bar integration
- Notification center

**Main Content:**
- Left margin offset of 288px (`ml-72`)
- Full height flex layout (`h-screen overflow-hidden`)
- Scrollable content area

### Responsive Behavior

- **Desktop (1024px+):** Full sidebar + content layout
- **Tablet/Mobile (<1024px):** Sheet-based slide-in sidebar replaces fixed sidebar
- Safe area insets for notched devices
- Dynamic viewport height (100dvh) for mobile address bar handling

---

## 7. Page Inventory

### Activities Module
| Route | Description |
|-------|-------------|
| `/activities` | Activity list with search, filter, sort |
| `/activities/new` | Multi-step activity creation form |
| `/activities/[id]` | Activity detail view with tabbed editor |
| `/activities/[id]/sectors` | Sector allocation management |

### Organizations Module
| Route | Description |
|-------|-------------|
| `/organizations` | Organization directory with search |
| `/organizations/[id]` | Organization detail and edit |
| `/organizations/new` | Create new organization |

### Finance Module
| Route | Description |
|-------|-------------|
| `/budgets` | Budget overview and management |
| `/planned-disbursements` | Disbursement planning timeline |
| `/transactions` | Transaction list with filters |
| `/transactions/[id]` | Transaction detail view |

### Project Bank Module
| Route | Description |
|-------|-------------|
| `/project-bank` | Project Bank hub/dashboard |
| `/project-bank/[id]` | Project detail view |
| `/project-bank/new` | Create new project |
| `/project-bank/projects` | Project list |
| `/project-bank/gaps` | Gap analysis dashboard |
| `/project-bank/monitoring` | Project monitoring |
| `/project-bank/review` | Review workflow |
| `/project-bank/transfers` | Transfer management |

### Land Bank Module
| Route | Description |
|-------|-------------|
| `/land-bank/parcels` | Parcel list with map view |
| `/land-bank/[id]` | Parcel detail |
| `/land-bank/new` | Register new parcel |

### Analytics & Dashboards
| Route | Description |
|-------|-------------|
| `/dashboard` | Main overview dashboard |
| `/analytics-dashboard` | Detailed analytics |
| `/analytics/sectors` | Sector-level analytics |
| `/aid-effectiveness-dashboard` | Aid effectiveness metrics |
| `/aid-flow-map` | Geographic aid flow visualization |
| `/transparency-index` | Donor transparency scoring |
| `/partner-summary` | Partner overview dashboard |
| `/reports` | Report generation |

### Data Management
| Route | Description |
|-------|-------------|
| `/import` | Import hub |
| `/import/activities` | Activity CSV import |
| `/import/organizations` | Organization import |
| `/import/transactions` | Transaction import |
| `/iati-import` | IATI XML import |
| `/iati-import-enhanced` | Enhanced IATI import with conflict resolution |
| `/data-clinic` | Data quality analysis |
| `/data-clinic/financial-completeness` | Financial completeness audit |

### Reference Data
| Route | Description |
|-------|-------------|
| `/sectors` | Sector code browser |
| `/sectors/[code]` | Sector detail with linked activities |
| `/sdgs` | SDG goal browser |
| `/sdgs/[id]` | SDG detail with linked activities |
| `/policy-markers` | Policy marker management |
| `/policy-markers/[id]` | Marker detail |

### Collaboration & Coordination
| Route | Description |
|-------|-------------|
| `/partners` | Partner directory |
| `/partners/[id]` | Partner detail |
| `/partners/groups` | Partner groupings |
| `/working-groups` | Working group management |
| `/working-groups/[id]` | Group detail |
| `/coordination` | Coordination tools |
| `/rolodex` | Contact directory |
| `/calendar` | Activity calendar |

### Administration
| Route | Description |
|-------|-------------|
| `/admin/users` | User management |
| `/admin/calendar-events` | System event management |
| `/admin/project-bank` | Admin project bank controls |

### User & Auth
| Route | Description |
|-------|-------------|
| `/login` | Authentication |
| `/register` | User registration |
| `/profile` | User profile |
| `/settings` | User settings |
| `/notifications` | Notification center |

### Support
| Route | Description |
|-------|-------------|
| `/atlas` | Geographic map explorer |
| `/library` | Resource/document library |
| `/faq` | Help center |
| `/help` | Help section |
| `/privacy-policy` | Privacy policy |
| `/terms-of-service` | Terms of service |

---

## 8. Component Architecture

### Form System

**Stack:** React Hook Form v7 + Zod validation + custom autosave pattern

**Autosave Components:**
- `AutosaveInput` — text fields with debounced auto-save
- `AutosaveSelect` — dropdown selects with auto-save on change
- `AutosaveUpload` — file uploads with auto-save
- Save state indicator: `LabelSaveIndicator` (isSaving, isPersistentlySaved, error)
- `saveOnBlur` option for blur-triggered persistence

**Specialized Selectors (60+):**
- `SearchableSelect` — combobox pattern with async search
- Country, Currency, Organization, User, Activity selectors
- `HierarchySectorSelect` — hierarchical DAC sector picker (3-digit → 5-digit)
- Multi-select variants (RecipientCountriesMultiSelect, OECDCRSFlagsMultiSelect)
- `EnhancedDatePicker` — date picker with calendar integration

**Validation:**
- Zod schemas for type-safe validation
- Field-level error display (`form-error-alert.tsx`)
- Real-time field save status indicators
- Help text tooltips for guidance

### Tables

- Horizontal scroll wrapper for overflow on narrow viewports
- `SortableTableHeader` with ascending/descending icons
- Row hover states with muted background
- Checkbox column for bulk actions
- Column selector for customizable visible columns
- `full-pagination` component for page navigation
- `TableSkeleton` for loading states
- Specialized tables: `finance-table`, `activities-table`, `OrganizationTable`

### Modals & Sheets

**Dialogs (centered overlays):**
- `Dialog` — general purpose modal (Radix Dialog)
- `AlertDialog` — destructive action confirmation
- `ConfirmationDialog` — user confirmation prompts
- Body scroll lock when modal is open
- Z-index hierarchy: overlay (999), content (1000)

**Sheets (slide-in panels):**
- Left/Right variants (w-3/4, sm:max-w-sm)
- Top/Bottom variants
- Used for mobile navigation and detail panels
- Animated slide-in/slide-out (300–500ms)

**Activity-Specific Modals:**
- QuickAddActivityModal, CreateActivityModal
- AddLinkedActivityModal, LinkExternalActivityModal
- HumanitarianScopeModal, ParticipatingOrgModal
- BudgetMappingModal, ImportActivityModal

### Data Visualization

**24+ Chart Types (Recharts v2):**
- Bar charts: ActivityStatusChart, AidTypeChart, TransactionTypeChart
- Pie/Donut: SectorAllocationPieChart, FinanceTypeDonut, OrgTypeChart
- Sunburst: SectorSunburstChart (hierarchical sector breakdown)
- Sankey: FundFlowSankey, SectorSankeyVisualization (aid flow analysis)
- Line/Area: ActivitySpendTrajectoryChart, BudgetVsSpendingChart
- Heatmaps: ActivityCalendarHeatmap, ActivityTimelineHeatmap

**Geospatial Maps:**
- Leaflet + MapLibre GL for primary map rendering
- Mapbox GL for advanced tile layers
- Google Maps for fallback/alternative views
- Custom light/dark map themes
- Location markers with tooltips and popups
- Administrative boundary overlays
- Myanmar-focused administrative styling
- Crosshair cursor for coordinate selection ("drop pin" mode)

### Notifications

- **Sonner** toast notifications for success/error/info messages
- In-app notification center (`/notifications`)
- Email notification support for task assignments

---

## 9. Key User Flows

### Activity Creation & Lifecycle

```
1. User clicks "+ New Activity" in sidebar
2. CreateActivityModal opens → basic info (title, description, org)
3. Activity created in DRAFT status
4. User fills tabs: Overview → Finance → Sectors → Locations → Results → Documents
5. Each field auto-saves via AutosaveInput/Select components
6. User submits for validation → status: PENDING_VALIDATION
7. Gov Partner T1 reviews → VALIDATED or REJECTED
8. Validated activity can be PUBLISHED for public access
```

### IATI XML Import

```
1. User navigates to /iati-import or /iati-import-enhanced
2. Uploads IATI-XML file or enters IATI Datastore URL
3. System parses XML, extracts activities
4. Preview screen shows parsed activities with field mapping
5. User selects import strategy per field: Skip / Overwrite / Merge
6. System creates/updates activities with conflict resolution
7. Import log shows results (created, updated, skipped, errors)
```

### Financial Tracking

```
1. User opens activity → Finance tab
2. Views budget summary (original vs revised, indicative vs committed)
3. Adds transactions with type, amount, currency, date
4. System auto-converts to USD via exchange rates
5. Sector allocation validated (percentages must sum to 100%)
6. Budget vs Spending chart shows variance analysis
7. Planned disbursement timeline shows upcoming payments
```

### Analytics & Reporting

```
1. User navigates to /dashboard for overview
2. Sees activity counts by status, sector breakdown, funding summary
3. Drills into /analytics-dashboard for detailed charts
4. Views Sankey diagrams for fund flow analysis
5. Opens /aid-flow-map for geographic distribution
6. Checks /transparency-index for donor scoring
7. Generates reports via /reports page
```

---

## 10. Performance & Accessibility

### Loading States

- **NProgress bar:** 3px slate-500 bar at top of page during route transitions
- **Skeleton components:** text, circular, rectangular, rounded variants
- **Shimmer animations:** pulse (default), shimmer (1.5s ease-in-out), shimmer-blush
- **TableSkeleton:** table-specific skeleton rows
- **Suspense boundaries:** at root layout level

### Performance Patterns

- Tabular numbers on body for aligned financial display
- Debounced search inputs
- Lazy-loaded map components
- Request cancellation for abandoned searches
- Image optimization via next/image

### Accessibility

- **Radix UI primitives:** provide ARIA attributes, keyboard navigation, and focus management out of the box
- **Focus rings:** ring-2 ring-ring ring-offset-2 ring-offset-background
- **Keyboard navigation:** focus-visible styling for keyboard users
- **Reduced motion:** all animations collapse to 0.01ms when `prefers-reduced-motion` is active
- **Semantic HTML:** proper heading hierarchy, table elements, form labels
- **Tooltip provider:** at layout root for consistent tooltip behavior

### Animations

- Accordion expand/collapse: 0.2s ease-out
- Fade-in: 0.3s ease-out with 4px translateY
- Slide-up: 10px translateY, 0.3s
- Sheet slide-in/out: 300–500ms with cubic-bezier easing
- SDG icon hover: circular color reveal via clip-path animation

---

## 11. API Surface

The backend exposes **576 API endpoints** across 122 categories:

### Core CRUD (REST)
- `GET/POST /api/activities` — List and create activities
- `GET/PUT/DELETE /api/activities/[id]` — Read, update, delete activity
- `GET/POST /api/transactions` — Transaction management
- `GET/POST /api/budgets` — Budget management
- `GET/POST /api/organizations` — Organization management
- `GET/POST /api/results` — Results framework management
- `GET/POST /api/contacts` — Focal point management

### Analytics (Read-only)
- `/api/analytics/*` — 45+ analytics endpoints
- `/api/aid-effectiveness/*` — Aid effectiveness analysis
- `/api/transparency-scores/*` — Transparency scoring
- `/api/dashboard/*` — Dashboard summary data

### Import/Export
- `/api/iati/import` — IATI-XML import
- `/api/iati/import-enhanced` — Enhanced import with conflict resolution
- `/api/iati/bulk-import` — Bulk import from IATI Datastore
- `/api/budgets/export` — Budget data export
- `/api/aid-effectiveness/export` — Aid effectiveness export

### System
- `/api/admin/*` — User management, system config
- `/api/tasks/*` — Task assignment and workflow
- `/api/validation-rules` — Custom validation rules
- `/api/currency` — Exchange rate management
- `/api/activity-logs` — Audit trail

---

## 12. Task & Workflow System

### Task Management
- Task lifecycle: draft → scheduled → sent → completed / cancelled
- Assignment types: individual, organization, role-based
- Priority levels: high, medium, low
- Recurrence: daily, weekly, monthly, quarterly, yearly
- Reminder system with configurable advance notification
- Parent-child task relationships
- Email and in-app notifications

### Activity Workflow
- Multi-stage: Draft → Pending Validation → Validated → Published (or Rejected)
- Multi-contributor acceptance process
- Permission changes at each workflow stage
- Audit log for all state transitions

---

## 13. Tech Stack Summary

| Category | Technology | Version |
|----------|-----------|---------|
| Framework | Next.js | 14 |
| Language | TypeScript | 5.x |
| Styling | Tailwind CSS | 3.x |
| UI Components | shadcn/ui | Latest |
| Primitives | Radix UI | Latest |
| Forms | React Hook Form | 7.63 |
| Validation | Zod | 3.25 |
| Charts | Recharts | 2.15 |
| Maps | Leaflet + MapLibre GL | 5.16 |
| Maps (alt) | Mapbox GL | 3.18 |
| Maps (alt) | Google Maps API | 2.20 |
| Database | Supabase (PostgreSQL) | - |
| Auth | Supabase Auth + RLS | - |
| Icons | Lucide React | Latest |
| Toast | Sonner | Latest |
| Loading | NProgress | Latest |
| Tours | React Joyride | Latest |
| Hosting | Vercel | - |
