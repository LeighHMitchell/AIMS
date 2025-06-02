"use client"
import React, { useState, useEffect } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { Plus } from "lucide-react"
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { X } from "lucide-react"
import { useParams } from "next/navigation"
import { toast } from "sonner"

const summary = {
  totalCommitment: 100000,
  totalIncoming: 80000,
  totalSpent: 60000,
}

const organisations = ["UNICEF", "World Bank", "DFID", "USAID"]
const activities = ["Education Project", "Health Project", "WASH Project"]
const aidTypes = ["Project-type interventions", "Core contributions", "Other"]
const financeTypes = ["Aid grant excluding debt reorganisation", "Debt relief", "Other"]
const flowTypes = ["ODA", "OOF", "Private"]
const tiedStatuses = ["Untied", "Partially tied", "Tied"]
const currencies = ["USD", "EUR", "GBP", "JPY", "AUD", "CAD"]

// Helper to update activity in localStorage
function updateActivityTransactions(activityId: string | number, transactions: any[]) {
  const activities = JSON.parse(localStorage.getItem("activities") || "[]")
  const idx = activities.findIndex((a: any) => String(a.id) === String(activityId))
  if (idx !== -1) {
    // Update the activity's transactions
    activities[idx].transactions = transactions
    // Update totals
    activities[idx].totalCommitment = transactions
      .filter((t: any) => t.type === "C")
      .reduce((sum: number, t: any) => sum + (parseFloat(t.amount) || 0), 0)
    activities[idx].totalDisbursement = transactions
      .filter((t: any) => t.type === "D")
      .reduce((sum: number, t: any) => sum + (parseFloat(t.amount) || 0), 0)
    // Save to localStorage
    localStorage.setItem("activities", JSON.stringify(activities))
    // Also save transactions separately for the FinancesTab
    localStorage.setItem(`transactions_${activityId}`, JSON.stringify(transactions))
  }
}

export default function FinancesTab({ transactionKey }: { transactionKey: string }) {
  const params = useParams();
  const [tab, setTab] = useState("transactions")
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [showCommitment, setShowCommitment] = useState(false)
  const [commitment, setCommitment] = useState({
    organisation: "",
    activity: "",
    aidType: "",
    financeType: "",
    flowType: "",
    tiedStatus: "",
    amount: "",
    currency: "USD",
    date: new Date().toISOString().split('T')[0],
  })
  const [errors, setErrors] = useState<any>({})
  const [transactions, setTransactions] = useState<any[]>([])

  // Extract activityId from transactionKey
  const activityId = transactionKey.startsWith("transactions_") ? transactionKey.replace("transactions_", "") : null

  // Load transactions from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(transactionKey)
    if (stored) {
      const loadedTransactions = JSON.parse(stored)
      setTransactions(loadedTransactions)
      // If we have an activityId, ensure the activity object is in sync
      if (activityId) {
        updateActivityTransactions(activityId, loadedTransactions)
      }
    }
  }, [transactionKey, activityId])

  // Save transactions to localStorage whenever they change
  useEffect(() => {
    if (transactions.length > 0) {
      localStorage.setItem(transactionKey, JSON.stringify(transactions))
      if (activityId) {
        updateActivityTransactions(activityId, transactions)
      }
    }
  }, [transactions, transactionKey, activityId])

  // Add state for default transaction values
  const [defaultTx, setDefaultTx] = useState<any>(() => {
    const stored = localStorage.getItem(`transaction_defaults_${activityId || 'draft'}`)
    return stored ? JSON.parse(stored) : {
      organisation: "",
      activity: "",
      aidType: "",
      financeType: "",
      flowType: "",
      tiedStatus: "",
      amount: "",
      currency: "USD",
      date: new Date().toISOString().split('T')[0],
    }
  })

  // Save defaults to localStorage
  const saveDefaults = () => {
    localStorage.setItem(`transaction_defaults_${activityId || 'draft'}`, JSON.stringify(defaultTx))
    toast.success("Default values saved", {
      description: "Your default transaction values have been saved",
      duration: 3000,
    })
  }

  // When opening the commitment modal, prefill with defaults
  useEffect(() => {
    if (showCommitment) {
      const stored = localStorage.getItem(`transaction_defaults_${activityId}`)
      if (stored) setCommitment(JSON.parse(stored))
    }
    // eslint-disable-next-line
  }, [showCommitment])

  return (
    <div className="space-y-6">
      {/* Summary Panel */}
      <Card className="shadow-xl rounded-lg">
        <CardContent className="flex flex-col md:flex-row gap-6 p-6 items-center justify-between">
          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="text-muted-foreground text-xs uppercase">Total Commitment</div>
              <div className="text-2xl font-bold text-blue-700">${summary.totalCommitment.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs uppercase">Total Incoming Funds</div>
              <div className="text-2xl font-bold text-green-700">${summary.totalIncoming.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs uppercase">Total Spent</div>
              <div className="text-2xl font-bold text-red-700">${summary.totalSpent.toLocaleString()}</div>
            </div>
          </div>
          {/* Action Menu */}
          <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <Button className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-2 rounded-lg shadow" size="lg">
                <Plus className="w-4 h-4 mr-2" /> Add a transaction
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => { setDropdownOpen(false); setShowCommitment(true) }}>
                Add a commitment
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setDropdownOpen(false); /* open incoming modal */ }}>
                Add incoming funds
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setDropdownOpen(false); /* open outgoing modal */ }}>
                Add outgoing transaction
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardContent>
      </Card>
      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="budgets">Budgets</TabsTrigger>
          <TabsTrigger value="iati">IATI Sync</TabsTrigger>
          <TabsTrigger value="settings">Default Settings</TabsTrigger>
          <TabsTrigger value="default">Default</TabsTrigger>
        </TabsList>
        <TabsContent value="transactions">
          <div className="mb-4">
            <div className="text-muted-foreground">Transactions table</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border rounded-lg">
              <thead>
                <tr className="bg-muted text-muted-foreground">
                  <th className="px-3 py-2 text-left">Type</th>
                  <th className="px-3 py-2 text-left">Organisation</th>
                  <th className="px-3 py-2 text-left">Activity</th>
                  <th className="px-3 py-2 text-left">Aid Type</th>
                  <th className="px-3 py-2 text-left">Finance Type</th>
                  <th className="px-3 py-2 text-left">Flow Type</th>
                  <th className="px-3 py-2 text-left">Tied Status</th>
                  <th className="px-3 py-2 text-left">Date</th>
                  <th className="px-3 py-2 text-left">Amount</th>
                  <th className="px-3 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-4 text-muted-foreground">No transactions yet.</td>
                  </tr>
                ) : (
                  transactions.map((tx, idx) => (
                    <tr key={idx} className="border-b hover:bg-muted/50">
                      <td className="px-3 py-2 font-bold">{tx.type}</td>
                      <td className="px-3 py-2">{tx.organisation}</td>
                      <td className="px-3 py-2">{tx.activity}</td>
                      <td className="px-3 py-2">{tx.aidType}</td>
                      <td className="px-3 py-2">{tx.financeType}</td>
                      <td className="px-3 py-2">{tx.flowType}</td>
                      <td className="px-3 py-2">{tx.tiedStatus}</td>
                      <td className="px-3 py-2">{tx.date ? new Date(tx.date).toLocaleDateString() : ""}</td>
                      <td className="px-3 py-2">{tx.amount ? `${tx.currency} ${parseFloat(tx.amount).toLocaleString()}` : ""}</td>
                      <td className="px-3 py-2">
                        <Button size="sm" variant="outline" className="mr-2">Edit</Button>
                        <Button size="sm" variant="destructive" onClick={() => setTransactions(ts => ts.filter((_, i) => i !== idx))}>Delete</Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>
        <TabsContent value="budgets">
          <div className="text-muted-foreground">Budgets content coming soon…</div>
        </TabsContent>
        <TabsContent value="iati">
          <div className="text-muted-foreground">IATI Sync content coming soon…</div>
        </TabsContent>
        <TabsContent value="settings">
          <div className="text-muted-foreground">Default Settings content coming soon…</div>
        </TabsContent>
        <TabsContent value="default">
          <form className="space-y-4 p-4 max-w-xl" onSubmit={e => { e.preventDefault(); saveDefaults(); }}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Organisation</label>
                <Select value={defaultTx.organisation} onValueChange={v => setDefaultTx((c: any) => ({...c, organisation: v}))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select organisation" />
                  </SelectTrigger>
                  <SelectContent>
                    {organisations.map(org => <SelectItem key={org} value={org}>{org}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Activity</label>
                <Select value={defaultTx.activity} onValueChange={v => setDefaultTx((c: any) => ({...c, activity: v}))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select activity" />
                  </SelectTrigger>
                  <SelectContent>
                    {activities.map(act => <SelectItem key={act} value={act}>{act}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Aid Type</label>
                <Select value={defaultTx.aidType} onValueChange={v => setDefaultTx((c: any) => ({...c, aidType: v}))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select aid type" />
                  </SelectTrigger>
                  <SelectContent>
                    {aidTypes.map(aid => <SelectItem key={aid} value={aid}>{aid}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Finance Type</label>
                <Select value={defaultTx.financeType} onValueChange={v => setDefaultTx((c: any) => ({...c, financeType: v}))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select finance type" />
                  </SelectTrigger>
                  <SelectContent>
                    {financeTypes.map(fin => <SelectItem key={fin} value={fin}>{fin}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Flow Type</label>
                <Select value={defaultTx.flowType} onValueChange={v => setDefaultTx((c: any) => ({...c, flowType: v}))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select flow type" />
                  </SelectTrigger>
                  <SelectContent>
                    {flowTypes.map(flow => <SelectItem key={flow} value={flow}>{flow}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Tied Status</label>
                <Select value={defaultTx.tiedStatus} onValueChange={v => setDefaultTx((c: any) => ({...c, tiedStatus: v}))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select tied status" />
                  </SelectTrigger>
                  <SelectContent>
                    {tiedStatuses.map(tied => <SelectItem key={tied} value={tied}>{tied}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Amount</label>
                <Input type="number" value={defaultTx.amount} onChange={e => setDefaultTx((c: any) => ({...c, amount: e.target.value}))} placeholder="Enter amount" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Currency</label>
                <Select value={defaultTx.currency} onValueChange={v => setDefaultTx((c: any) => ({...c, currency: v}))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map(curr => <SelectItem key={curr} value={curr}>{curr}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Date</label>
                <Input type="date" value={defaultTx.date} onChange={e => setDefaultTx((c: any) => ({...c, date: e.target.value}))} />
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">Save Defaults</Button>
            </div>
          </form>
        </TabsContent>
      </Tabs>
      {/* Commitment Modal */}
      <Dialog open={showCommitment} onOpenChange={setShowCommitment}>
        <DialogContent className="max-w-lg p-0 rounded-lg shadow-xl">
          <form
            onSubmit={e => {
              e.preventDefault()
              const newErrors: any = {}
              if (!commitment.organisation) newErrors.organisation = true
              if (!commitment.activity) newErrors.activity = true
              if (!commitment.aidType) newErrors.aidType = true
              if (!commitment.financeType) newErrors.financeType = true
              if (!commitment.flowType) newErrors.flowType = true
              if (!commitment.tiedStatus) newErrors.tiedStatus = true
              if (!commitment.amount) newErrors.amount = true
              if (!commitment.date) newErrors.date = true
              setErrors(newErrors)
              if (Object.keys(newErrors).length === 0) {
                setTransactions(ts => [
                  ...ts,
                  {
                    ...commitment,
                    type: "C", // Commitment
                    amount: parseFloat(commitment.amount),
                  },
                ])
                setCommitment({
                  organisation: "",
                  activity: "",
                  aidType: "",
                  financeType: "",
                  flowType: "",
                  tiedStatus: "",
                  amount: "",
                  currency: "USD",
                  date: new Date().toISOString().split('T')[0],
                })
                setShowCommitment(false)
              }
            }}
            className="p-6 space-y-4"
          >
            <DialogHeader className="flex flex-row items-center justify-between mb-2">
              <DialogTitle className="text-lg font-semibold">Add Commitment</DialogTitle>
              <button type="button" onClick={() => setShowCommitment(false)} className="text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
            </DialogHeader>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Organisation</label>
                <Select value={commitment.organisation} onValueChange={v => setCommitment(c => ({...c, organisation: v}))}>
                  <SelectTrigger className={errors.organisation ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select organisation" />
                  </SelectTrigger>
                  <SelectContent>
                    {organisations.map(org => <SelectItem key={org} value={org}>{org}</SelectItem>)}
                  </SelectContent>
                </Select>
                {errors.organisation && <div className="text-xs text-red-500 mt-1">Required</div>}
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Activity</label>
                <Select value={commitment.activity} onValueChange={v => setCommitment(c => ({...c, activity: v}))}>
                  <SelectTrigger className={errors.activity ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select activity" />
                  </SelectTrigger>
                  <SelectContent>
                    {activities.map(act => <SelectItem key={act} value={act}>{act}</SelectItem>)}
                  </SelectContent>
                </Select>
                {errors.activity && <div className="text-xs text-red-500 mt-1">Required</div>}
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Aid Type</label>
                <Select value={commitment.aidType} onValueChange={v => setCommitment(c => ({...c, aidType: v}))}>
                  <SelectTrigger className={errors.aidType ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select aid type" />
                  </SelectTrigger>
                  <SelectContent>
                    {aidTypes.map(aid => <SelectItem key={aid} value={aid}>{aid}</SelectItem>)}
                  </SelectContent>
                </Select>
                {errors.aidType && <div className="text-xs text-red-500 mt-1">Required</div>}
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Finance Type</label>
                <Select value={commitment.financeType} onValueChange={v => setCommitment(c => ({...c, financeType: v}))}>
                  <SelectTrigger className={errors.financeType ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select finance type" />
                  </SelectTrigger>
                  <SelectContent>
                    {financeTypes.map(fin => <SelectItem key={fin} value={fin}>{fin}</SelectItem>)}
                  </SelectContent>
                </Select>
                {errors.financeType && <div className="text-xs text-red-500 mt-1">Required</div>}
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Flow Type</label>
                <Select value={commitment.flowType} onValueChange={v => setCommitment(c => ({...c, flowType: v}))}>
                  <SelectTrigger className={errors.flowType ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select flow type" />
                  </SelectTrigger>
                  <SelectContent>
                    {flowTypes.map(flow => <SelectItem key={flow} value={flow}>{flow}</SelectItem>)}
                  </SelectContent>
                </Select>
                {errors.flowType && <div className="text-xs text-red-500 mt-1">Required</div>}
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Tied Status</label>
                <Select value={commitment.tiedStatus} onValueChange={v => setCommitment(c => ({...c, tiedStatus: v}))}>
                  <SelectTrigger className={errors.tiedStatus ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select tied status" />
                  </SelectTrigger>
                  <SelectContent>
                    {tiedStatuses.map(tied => <SelectItem key={tied} value={tied}>{tied}</SelectItem>)}
                  </SelectContent>
                </Select>
                {errors.tiedStatus && <div className="text-xs text-red-500 mt-1">Required</div>}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Amount</label>
                  <Input
                    type="number"
                    value={commitment.amount}
                    onChange={e => setCommitment(c => ({...c, amount: e.target.value}))}
                    placeholder="Enter amount"
                    className={errors.amount ? "border-red-500" : ""}
                  />
                  {errors.amount && <div className="text-xs text-red-500 mt-1">Required</div>}
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Currency</label>
                  <Select value={commitment.currency} onValueChange={v => setCommitment(c => ({...c, currency: v}))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map(curr => <SelectItem key={curr} value={curr}>{curr}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Date</label>
                  <Input
                    type="date"
                    value={commitment.date}
                    onChange={e => setCommitment(c => ({...c, date: e.target.value}))}
                    className={errors.date ? "border-red-500" : ""}
                  />
                  {errors.date && <div className="text-xs text-red-500 mt-1">Required</div>}
                </div>
              </div>
            </div>
            <DialogFooter className="flex justify-end gap-2 mt-6">
              <Button type="button" variant="outline" onClick={() => setShowCommitment(false)}>Close</Button>
              <Button type="submit" className="bg-green-600 hover:bg-green-700 text-white">Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
} 