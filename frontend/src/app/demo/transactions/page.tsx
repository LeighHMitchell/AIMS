"use client";

import React, { useState, useMemo } from "react";
import { TransactionTable } from "@/components/transactions/TransactionTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Mock transaction data with all required fields
const mockTransactions = [
  {
    id: "txn-001",
    activity_id: "act-001",
    provider_org_name: "Ministry of Foreign Affairs",
    receiver_org_name: "World Health Organization",
    transaction_type: "2", // Outgoing Commitment
    aid_type: "B02",
    flow_type: "10",
    finance_type: "110",
    value: 1500000,
    currency: "USD",
    transaction_date: "2025-06-22",
    status: "actual",
  },
  {
    id: "txn-002",
    activity_id: "act-001",
    provider_org_name: "USAID",
    receiver_org_name: "Save the Children International",
    transaction_type: "3", // Disbursement
    aid_type: "C01",
    flow_type: "10",
    finance_type: "110",
    value: 250000,
    currency: "USD",
    transaction_date: "2025-05-15",
    status: "actual",
  },
  {
    id: "txn-003",
    activity_id: "act-001",
    provider_org_name: "European Commission",
    receiver_org_name: "Ministry of Health Myanmar",
    transaction_type: "4", // Expenditure
    aid_type: "A02",
    flow_type: "10",
    finance_type: "110",
    value: 75000,
    currency: "EUR",
    transaction_date: "2025-04-10",
    status: "draft",
  },
  {
    id: "txn-004",
    activity_id: "act-002",
    provider_org_name: "World Bank",
    receiver_org_name: "Government of Myanmar",
    transaction_type: "3", // Disbursement
    aid_type: "D02",
    flow_type: "20",
    finance_type: "410",
    value: 5000000,
    currency: "USD",
    transaction_date: "2025-03-20",
    status: "actual",
  },
  {
    id: "txn-005",
    activity_id: "act-002",
    provider_org_name: "Asian Development Bank",
    receiver_org_name: "Ministry of Agriculture",
    transaction_type: "1", // Incoming Commitment
    aid_type: "C01",
    flow_type: "10",
    finance_type: "110",
    value: 2000000,
    currency: "USD",
    transaction_date: "2025-02-28",
    status: "actual",
  },
  {
    id: "txn-006",
    activity_id: "act-003",
    provider_org_name: "Japan International Cooperation Agency",
    receiver_org_name: "Myanmar Red Cross Society",
    transaction_type: "3", // Disbursement
    aid_type: "B01",
    flow_type: "10",
    finance_type: "110",
    value: 300000,
    currency: "JPY",
    transaction_date: "2025-01-15",
    status: "actual",
  },
  {
    id: "txn-007",
    activity_id: "act-003",
    provider_org_name: "Department for International Development",
    receiver_org_name: "UNICEF Myanmar",
    transaction_type: "2", // Outgoing Commitment
    aid_type: "E01",
    flow_type: "10",
    finance_type: "110",
    value: 450000,
    currency: "GBP",
    transaction_date: "2024-12-10",
    status: "draft",
  },
  {
    id: "txn-008",
    activity_id: "act-004",
    provider_org_name: "Australian Aid",
    receiver_org_name: "WaterAid Myanmar",
    transaction_type: "4", // Expenditure
    aid_type: "C01",
    flow_type: "10",
    finance_type: "110",
    value: 125000,
    currency: "AUD",
    transaction_date: "2024-11-20",
    status: "actual",
  },
];

export default function TransactionDemoPage() {
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

  // Sort transactions based on current sort field and order
  const sortedTransactions = useMemo(() => {
    const sorted = [...mockTransactions].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case "transaction_date":
          aValue = new Date(a.transaction_date).getTime();
          bValue = new Date(b.transaction_date).getTime();
          break;
        case "transaction_type":
          aValue = a.transaction_type;
          bValue = b.transaction_type;
          break;
        case "provider_org_name":
          aValue = a.provider_org_name.toLowerCase();
          bValue = b.provider_org_name.toLowerCase();
          break;
        case "value":
          aValue = a.value;
          bValue = b.value;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
      if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [sortField, sortOrder]);

  const handleRowClick = (transactionId: string) => {
    console.log("Transaction clicked:", transactionId);
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">
            IATI Transaction Table Demo
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Professional, compact transaction table displaying 8 key IATI-compliant data fields
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <TransactionTable
            transactions={sortedTransactions}
            loading={false}
            error={null}
            sortField={sortField}
            sortOrder={sortOrder}
            onSort={handleSort}
            onRowClick={handleRowClick}
          />
        </CardContent>
      </Card>

      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              Transaction Types
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Icons represent different transaction types like Disbursement, 
              Expenditure, and Commitments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              Status Pills
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Green "A" = Actual transaction<br />
              Grey "D" = Draft transaction
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              Aid/Flow/Finance Types
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Hover over badges to see full descriptions with IATI codes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              Provider → Receiver
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Organization flow displayed in one line with hover tooltips for full names
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 