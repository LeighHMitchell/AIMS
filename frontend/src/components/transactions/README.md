# TransactionTable Component

A professional, compact React component for displaying IATI-compliant aid transactions with icons, tooltips, and sortable columns.

## Features

### 8 Key Data Fields

1. **Date** - Transaction date formatted as `dd MMM yyyy`
2. **Type** - Transaction type with icon and label
3. **Status** - Single-letter pill ("A" = Actual, "D" = Draft) with tooltip
4. **Provider → Receiver** - Organization flow in one line with arrow
5. **Value** - Currency value with thousands separator
6. **Aid Type** - Compact badge with full description tooltip
7. **Flow Type** - ODA/OOF badge with tooltip
8. **Finance Type** - Grant/Loan badge with tooltip

### Visual Features

- **Transaction Type Icons**: Each transaction type has a unique lucide-react icon
- **Status Pills**: Color-coded circular badges (green for Actual, grey for Draft)
- **Tooltips**: Hover over any badge to see full descriptions with IATI codes
- **Sortable Columns**: Click column headers to sort (Date, Type, Provider, Value)
- **Responsive Layout**: Table scrolls horizontally on small screens
- **Row Click Handler**: Optional callback for row selection

## Usage

```tsx
import { TransactionTable } from "@/components/transactions/TransactionTable";

const transactions = [
  {
    id: "txn-001",
    provider_org_name: "USAID",
    receiver_org_name: "Save the Children",
    transaction_type: "3", // Disbursement
    aid_type: "C01",       // Project-type interventions
    flow_type: "10",       // ODA
    finance_type: "110",   // Grant
    value: 250000,
    currency: "USD",
    transaction_date: "2025-06-22",
    status: "actual",
  },
  // ... more transactions
];

function MyComponent() {
  const [sortField, setSortField] = useState("transaction_date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  return (
    <TransactionTable
      transactions={transactions}
      loading={false}
      error={null}
      sortField={sortField}
      sortOrder={sortOrder}
      onSort={handleSort}
      onRowClick={(id) => console.log("Clicked:", id)}
    />
  );
}
```

## IATI Code Mappings

### Transaction Types
- `1` - Incoming Commitment (ArrowDownLeft icon)
- `2` - Outgoing Commitment (HandCoins icon)
- `3` - Disbursement (Banknote icon)
- `4` - Expenditure (CreditCard icon)
- `5` - Interest Repayment (TrendingDown icon)
- `6` - Loan Repayment (Coins icon)
- `7` - Reimbursement (RefreshCw icon)
- `8` - Purchase of Equity (TrendingUp icon)
- `9` - Sale of Equity (PiggyBank icon)
- `11` - Credit Guarantee (FileText icon)
- `12` - Incoming Funds (ArrowDownLeft icon)
- `13` - Commitment Cancellation (AlertCircle icon)

### Aid Types (Examples)
- `A01` - General budget support
- `B02` - Core contributions to multilateral institutions
- `C01` - Project-type interventions
- `D02` - Other technical assistance

### Flow Types
- `10` - ODA (Official Development Assistance)
- `20` - OOF (Other Official Flows)
- `30` - Private grants

### Finance Types (Examples)
- `110` - Standard grant
- `410` - Aid loan
- `700` - Foreign direct investment

## Demo

View the live demo at `/demo/transactions` to see the component in action with sample data.

## Dependencies

- `lucide-react` - For transaction type icons
- `date-fns` - For date formatting
- `@radix-ui/react-tooltip` - For tooltip functionality
- TailwindCSS - For styling 