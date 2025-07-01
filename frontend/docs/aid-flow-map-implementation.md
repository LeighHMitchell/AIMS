# Aid Flow Map Implementation Guide

## Overview

The Aid Flow Map feature provides a dynamic visualization of financial flows between organizations using a force-directed graph powered by D3.js. Users can filter transactions by date range to analyze aid flows over specific time periods.

## Features Implemented

### 1. Backend API Endpoints

#### Main Graph Endpoint
- **Location**: `/frontend/src/app/api/aid-flows/graph/route.ts`
- **Endpoint**: `GET /api/aid-flows/graph?start=YYYY-MM-DD&end=YYYY-MM-DD&status=STATUS`
- **Parameters**:
  - `start` (required): Start date in YYYY-MM-DD format
  - `end` (required): End date in YYYY-MM-DD format
  - `status` (optional): Transaction status filter - 'actual', 'draft', or 'both' (default: 'both')
- **Functionality**:
  - Accepts date range parameters (required)
  - Filters transactions by status (actual, draft, or both)
  - Fetches transactions within the specified date range
  - Filters by transaction types (Commitments, Disbursements, Expenditures)
  - Excludes self-transactions
  - Groups flows by provider and receiver organizations
  - Returns graph data with nodes (organizations) and links (financial flows)
  - Includes metadata about the query results

#### Organization Transactions Endpoint
- **Location**: `/frontend/src/app/api/aid-flows/org-transactions/[orgId]/route.ts`
- **Endpoint**: `GET /api/aid-flows/org-transactions/[orgId]?start=YYYY-MM-DD&end=YYYY-MM-DD`
- **Parameters**:
  - `orgId` (required): Organization UUID
  - `start` (optional): Start date filter
  - `end` (optional): End date filter
- **Functionality**:
  - Fetches all transactions where the organization is either provider or receiver
  - Returns transaction details with activity information
  - Includes summary statistics (total inflow, outflow, transaction count, unique partners)
  - Supports date range filtering

### 2. Frontend Components

#### EnhancedAidFlowGraph Component
- **Location**: `/frontend/src/components/analytics/EnhancedAidFlowGraph.tsx`
- **Enhanced Features**:
  - **Scalable Link Width & Color**: Links use color gradients and width based on transaction value
  - **Enhanced Node Labels**: Labels that move with nodes during drag operations
  - **Advanced Node Sizing**: Node radius scales with total flow volume (inflow + outflow)
  - **Search Functionality**: Real-time search to find and highlight organizations
  - **Transaction Sidebar**: Click on any node to view detailed transactions
  - **Improved Tooltips**: Rich tooltips showing inflow/outflow values
  - **Auto-focus**: Automatically zooms to highlighted/searched nodes

#### AidFlowMap Component (Updated)
- **Location**: `/frontend/src/components/analytics/AidFlowMap.tsx`
- **Features**:
  - Date range picker with calendar UI
  - Quick date presets (Last 3/6/12 months, This year, Last year, All time)
  - Real-time data fetching based on selected dates
  - Loading states and error handling
  - Export functionality (JSON format)
  - Summary statistics display
  - Integration with EnhancedAidFlowGraph component
  - Search bar integration

### 3. Enhanced Visualization Features

#### Force-Directed Graph Enhancements
- **Color Scales**: Blue gradient based on transaction values
- **Node Colors**:
  - Donors: Blue (#3b82f6)
  - Recipients: Green (#10b981)
  - Implementers: Amber (#f59e0b)
  - Sectors: Purple (#8b5cf6)
  - Highlighted/Searched: Orange (#f97316)
- **Link Styling**:
  - Width: 1-10px based on transaction value
  - Color: Gradient from light to dark blue
  - Opacity: Changes on hover to show connections
- **Interactions**:
  - Drag nodes to reposition
  - Zoom and pan the canvas
  - Click nodes to open transaction sidebar
  - Hover for quick tooltips
  - Search to find and highlight organizations

#### Transaction Sidebar
- **Organization Details**: Name, type, and summary statistics
- **Transaction List**: Scrollable list of all transactions
- **Transaction Details**:
  - Activity title and reference
  - Transaction type with human-readable labels
  - Date formatting
  - Partner organization information
  - Value with currency formatting
  - Direction indicator (incoming/outgoing)
  - Description when available

### 4. Data Processing
- Uses enhanced `buildAidFlowGraphData` function from `/frontend/src/lib/analytics-helpers.ts`
- Filters:
  - Minimum transaction value: $10,000
  - Organization limit: Top 100 by total flow
  - Transaction status: Configurable (actual/draft/both)

## Usage

### Accessing the Feature

1. **Via Analytics Dashboard**:
   - Navigate to Analytics Dashboard
   - Click on "Aid Flow Map" tab
   - The date range will inherit from the dashboard's global filters

2. **Standalone Page**:
   - Navigate to `/aid-flow-map`
   - Full-page view with larger visualization area

### Using the Search Feature

1. **Search Bar**:
   - Located at the top-left of the visualization
   - Type organization name to search
   - The matching node will be highlighted in orange
   - The graph will auto-zoom to the highlighted node
   - Connected nodes remain visible while others are dimmed

### Using Date Filters

1. **Quick Presets**:
   - Use the dropdown to select common date ranges
   - Options: Last 3/6/12 months, This year, Last year, All time

2. **Custom Date Range**:
   - Click on the start date button to open calendar
   - Select desired start date
   - Click on the end date button
   - Select desired end date
   - The graph will automatically update

### Using Status Filter

The Aid Flow Map includes a transaction status filter that allows you to view:

1. **All Transactions** (default): Shows both actual and draft transactions
2. **Actual Only**: Shows only transactions marked as 'actual' (confirmed/finalized)
3. **Draft Only**: Shows only transactions marked as 'draft' (pending/unconfirmed)

The status filter dropdown appears next to the date range controls. When you change the status filter, the graph will automatically update to show only the selected transaction types.

### Interacting with the Graph

- **Search**: Use the search bar to find specific organizations
- **Drag nodes**: Reposition organizations
- **Zoom**: Scroll to zoom in/out
- **Pan**: Click and drag on empty space
- **Node details**: Click on a node to open transaction sidebar
- **Hover**: See quick information about organizations and flows
- **Close sidebar**: Click the X button in the sidebar

### Understanding the Visualization

- **Node Size**: Larger nodes indicate higher transaction volumes
- **Node Color**: Indicates organization type (see legend)
- **Link Width**: Thicker links represent larger transaction values
- **Link Color**: Darker blue indicates higher values
- **Arrows**: Show direction of fund flow

### Exporting Data

- Click the Export button to download the current view as JSON
- Includes all nodes, links, and metadata
- File naming: `aid-flow-YYYY-MM-DD-to-YYYY-MM-DD.json`

## Technical Details

### API Response Formats

#### Graph Data Response
```json
{
  "nodes": [
    {
      "id": "org-123",
      "name": "Organization Name",
      "type": "donor|recipient|implementer",
      "totalIn": 1000000,
      "totalOut": 500000
    }
  ],
  "links": [
    {
      "source": "org-123",
      "target": "org-456",
      "value": 250000,
      "flowType": "commitment|disbursement|expenditure"
    }
  ],
  "metadata": {
    "dateRange": {
      "start": "2023-01-01",
      "end": "2023-12-31"
    },
    "transactionCount": 1500,
    "totalValue": 10000000,
    "organizationCount": 50,
    "flowCount": 120
  }
}
```

#### Organization Transactions Response
```json
{
  "organization": {
    "id": "org-123",
    "name": "Organization Name",
    "organization_type": "donor",
    "country": "US"
  },
  "transactions": [
    {
      "id": "tx-123",
      "activityTitle": "Health Program",
      "activityRef": "US-GOV-1-2023-001",
      "transactionType": "3",
      "date": "2023-06-15",
      "value": 250000,
      "currency": "USD",
      "status": "actual",
      "isIncoming": false,
      "partnerOrg": {
        "id": "org-456",
        "name": "Partner Org",
        "ref": "XM-DAC-12345"
      },
      "flowType": "10",
      "aidType": "C01"
    }
  ],
  "summary": {
    "totalInflow": 1500000,
    "totalOutflow": 2500000,
    "transactionCount": 45,
    "uniquePartners": 12
  }
}
```

### Performance Considerations

- Transaction limit: 5,000 per query
- Organization limit: 100 nodes
- Minimum flow value: $10,000
- Search is client-side for instant feedback
- Sidebar transactions limited to 500 per organization

## Testing

A test page is available at `/test-aid-flow-api` to verify the API endpoint functionality:
- Tests the endpoint with last 12 months of data
- Displays response statistics
- Shows raw JSON response for debugging

## Future Enhancements

1. **Additional Filters**:
   - Filter by sector
   - Filter by country/region
   - Filter by organization type

2. **Advanced Search**:
   - Multi-select organizations
   - Search by organization reference
   - Regex pattern matching

3. **Export Options**:
   - CSV format with transaction details
   - PNG/SVG image export
   - PDF report generation
   - GraphML format for network analysis tools

4. **Performance**:
   - Server-side caching for frequently requested date ranges
   - Progressive loading for very large datasets
   - WebGL rendering for massive graphs
   - Virtual scrolling in transaction sidebar

5. **Analytics**:
   - Network centrality metrics
   - Flow pattern detection
   - Time-series animation
   - Comparative analysis between periods

## Troubleshooting

### No Data Displayed
- Check if transactions exist in the selected date range
- Verify transaction values exceed $10,000 minimum
- Ensure organizations have proper ID linkages

### Search Not Working
- Search is case-insensitive partial match
- Try searching with partial organization names
- Check if the organization exists in the current date range

### Slow Performance
- Try reducing the date range
- The system limits results to prevent overload
- Check browser console for any errors
- Consider using a modern browser with good D3.js support

### Sidebar Not Loading
- Verify the organization has transactions in the date range
- Check browser console for API errors
- Ensure organization ID is valid

### API Errors
- Verify date format is YYYY-MM-DD
- Check that start date is before end date
- Ensure organization ID is a valid UUID
- Review server logs for detailed error messages 