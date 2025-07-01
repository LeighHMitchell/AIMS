"use client"

import React from 'react'
import { MainLayout } from '@/components/layout/main-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { 
  getTransactionGroup, 
  groupTransactionsByType, 
  calculateTransactionGroupTotals,
  getTransactionTypeLabel,
  TRANSACTION_COLUMNS,
  TRANSACTION_TYPE_DEFINITIONS
} from '@/utils/transaction-grouping'

export default function TransactionGroupingDemoPage() {
  // Sample transaction data for demonstration
  const sampleTransactions = [
    { id: '1', transaction_type: '2', value: '50000', currency: 'USD', transaction_date: '2024-01-15', description: 'Initial commitment' },
    { id: '2', transaction_type: '3', value: '25000', currency: 'USD', transaction_date: '2024-02-01', description: 'First disbursement' },
    { id: '3', transaction_type: '4', value: '15000', currency: 'USD', transaction_date: '2024-02-15', description: 'Project expenditure' },
    { id: '4', transaction_type: '7', value: '5000', currency: 'USD', transaction_date: '2024-03-01', description: 'Reimbursement' },
    { id: '5', transaction_type: '5', value: '2000', currency: 'USD', transaction_date: '2024-03-15', description: 'Interest repayment' },
    { id: '6', transaction_type: '6', value: '10000', currency: 'USD', transaction_date: '2024-04-01', description: 'Loan repayment' },
    { id: '7', transaction_type: '8', value: '20000', currency: 'USD', transaction_date: '2024-04-15', description: 'Equity purchase' },
    { id: '8', transaction_type: '11', value: '30000', currency: 'USD', transaction_date: '2024-05-01', description: 'Credit guarantee' },
  ]

  const groupedTransactions = groupTransactionsByType(sampleTransactions)
  const totals = calculateTransactionGroupTotals(sampleTransactions)

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const getGroupColor = (group: string) => {
    switch (group) {
      case 'commitments': return 'bg-blue-50 border-blue-200'
      case 'disbursements': return 'bg-green-50 border-green-200'
      case 'returns': return 'bg-orange-50 border-orange-200'
      default: return 'bg-gray-50 border-gray-200'
    }
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">Transaction Grouping Demo</h1>
          <p className="text-muted-foreground mb-8">
            Demonstration of the new three-column transaction grouping system that aligns with international development finance conventions.
          </p>

          {/* Transaction Type Mapping */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>IATI Transaction Type Mapping</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-3">
                {Object.entries(TRANSACTION_COLUMNS).map(([key, column]) => (
                  <div key={key} className={`p-4 rounded-lg border-2 ${getGroupColor(key)}`}>
                    <h3 className="font-semibold mb-2">{column.label}</h3>
                    <p className="text-sm text-muted-foreground mb-3">{column.description}</p>
                    <div className="space-y-1">
                      {column.types.map(typeCode => (
                        <div key={typeCode} className="text-xs">
                          <Badge variant="outline" className="mr-2">Type {typeCode}</Badge>
                          {TRANSACTION_TYPE_DEFINITIONS[typeCode as keyof typeof TRANSACTION_TYPE_DEFINITIONS]}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Sample Data Grouping */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Sample Transaction Grouping</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Transaction ID</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Group</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sampleTransactions.map((transaction) => {
                    const group = getTransactionGroup(transaction.transaction_type)
                    return (
                      <TableRow key={transaction.id}>
                        <TableCell className="font-medium">{transaction.id}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            Type {transaction.transaction_type}
                          </Badge>
                        </TableCell>
                        <TableCell>{transaction.description}</TableCell>
                        <TableCell>{formatCurrency(parseInt(transaction.value))}</TableCell>
                        <TableCell>{transaction.transaction_date}</TableCell>
                        <TableCell>
                          <Badge className={group === 'commitments' ? 'bg-blue-100 text-blue-800' :
                                            group === 'disbursements' ? 'bg-green-100 text-green-800' :
                                            group === 'returns' ? 'bg-orange-100 text-orange-800' :
                                            'bg-gray-100 text-gray-800'}>
                            {group.charAt(0).toUpperCase() + group.slice(1)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Grouped Results */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Three-Column Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-3">
                <div className="p-4 rounded-lg bg-blue-50 border-2 border-blue-200">
                  <h3 className="font-semibold text-lg mb-2">Commitments</h3>
                  <p className="text-3xl font-bold text-blue-700 mb-4">{formatCurrency(totals.commitments)}</p>
                  <div className="space-y-2">
                    {groupedTransactions.commitments.map(t => (
                      <div key={t.id} className="text-sm flex justify-between">
                        <span>{getTransactionTypeLabel(t.transaction_type)}</span>
                        <span className="font-medium">{formatCurrency(parseInt(t.value))}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-green-50 border-2 border-green-200">
                  <h3 className="font-semibold text-lg mb-2">Disbursements & Spending</h3>
                  <p className="text-3xl font-bold text-green-700 mb-4">{formatCurrency(totals.disbursements)}</p>
                  <div className="space-y-2">
                    {groupedTransactions.disbursements.map(t => (
                      <div key={t.id} className="text-sm flex justify-between">
                        <span>{getTransactionTypeLabel(t.transaction_type)}</span>
                        <span className="font-medium">{formatCurrency(parseInt(t.value))}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-orange-50 border-2 border-orange-200">
                  <h3 className="font-semibold text-lg mb-2">Returns & Financial Instruments</h3>
                  <p className="text-3xl font-bold text-orange-700 mb-4">{formatCurrency(totals.returns)}</p>
                  <div className="space-y-2">
                    {groupedTransactions.returns.map(t => (
                      <div key={t.id} className="text-sm flex justify-between">
                        <span>{getTransactionTypeLabel(t.transaction_type)}</span>
                        <span className="font-medium">{formatCurrency(parseInt(t.value))}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Implementation Guide */}
          <Card>
            <CardHeader>
              <CardTitle>Implementation Guide</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Key Functions:</h3>
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
{`import { 
  getTransactionGroup, 
  groupTransactionsByType, 
  calculateTransactionGroupTotals 
} from '@/utils/transaction-grouping'

// Group a single transaction
const group = getTransactionGroup(transactionType) // returns 'commitments' | 'disbursements' | 'returns' | 'other'

// Group all transactions
const grouped = groupTransactionsByType(transactions)

// Calculate totals for each group
const totals = calculateTransactionGroupTotals(transactions)`}
                </pre>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Benefits:</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Aligns with international development finance conventions</li>
                  <li>• Provides clearer understanding of fund flows</li>
                  <li>• Separates commitments from actual spending</li>
                  <li>• Groups related transaction types logically</li>
                  <li>• Maintains compatibility with IATI transaction type codes</li>
                  <li>• Enables better financial analysis and reporting</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Usage in Tables:</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Column headers include helpful tooltips</li>
                  <li>• Sorting works across all three columns</li>
                  <li>• CSV export maintains the three-column structure</li>
                  <li>• Responsive design for mobile devices</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  )
}