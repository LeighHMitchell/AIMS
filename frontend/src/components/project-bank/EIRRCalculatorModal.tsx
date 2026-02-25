"use client"

import { useState, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2 } from "lucide-react"
import { calculateIRR, calculateNPV, calculateBCR, buildCashFlows } from "@/lib/eirr-calculator"
import { apiFetch } from "@/lib/api-fetch"

interface EIRRCalculatorModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  onSaved: () => void
}

interface YearRow {
  year: number
  cost: number
  benefit: number
}

export function EIRRCalculatorModal({ open, onOpenChange, projectId, onSaved }: EIRRCalculatorModalProps) {
  const [saving, setSaving] = useState(false)
  const [projectLife, setProjectLife] = useState(20)
  const [constructionYears, setConstructionYears] = useState(3)
  const [sdr, setSdr] = useState(12)
  const [swRate, setSwRate] = useState(0.75)
  const [seRate, setSeRate] = useState(1.0)
  const [scf, setScf] = useState(0.9)
  const [rows, setRows] = useState<YearRow[]>(() => {
    const initial: YearRow[] = []
    for (let i = 0; i < 5; i++) {
      initial.push({
        year: i + 1,
        cost: i < 3 ? 10 : 2,
        benefit: i < 3 ? 0 : 8,
      })
    }
    return initial
  })

  const updateRow = (idx: number, field: 'cost' | 'benefit', value: number) => {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r))
  }

  const addRow = () => {
    const nextYear = rows.length > 0 ? rows[rows.length - 1].year + 1 : 1
    setRows(prev => [...prev, { year: nextYear, cost: 2, benefit: 8 }])
  }

  const removeRow = (idx: number) => {
    setRows(prev => prev.filter((_, i) => i !== idx))
  }

  const results = useMemo(() => {
    if (rows.length < 2) return null

    const costData = rows.map(r => ({ year: r.year, amount: r.cost }))
    const benefitData = rows.map(r => ({ year: r.year, amount: r.benefit }))
    const cashFlows = buildCashFlows(costData, benefitData, swRate, seRate, scf)

    if (cashFlows.length < 2) return null

    const eirr = calculateIRR(cashFlows)
    const npv = calculateNPV(cashFlows, sdr / 100)
    const costs = rows.map(r => r.cost * scf)
    const benefits = rows.map(r => r.benefit)
    const bcr = calculateBCR(benefits, costs, sdr / 100)

    return { eirr, npv, bcr }
  }, [rows, sdr, swRate, seRate, scf])

  const eirrPercent = results?.eirr != null ? (results.eirr * 100) : null

  const handleSave = async () => {
    if (eirrPercent == null) return
    setSaving(true)
    try {
      const res = await apiFetch(`/api/project-bank/${projectId}/appraisals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appraisal_type: "eirr",
          eirr_result: Math.round(eirrPercent * 100) / 100,
          npv: results?.npv ? Math.round(results.npv * 100) / 100 : null,
          benefit_cost_ratio: results?.bcr ? Math.round(results.bcr * 10000) / 10000 : null,
          shadow_wage_rate: swRate,
          shadow_exchange_rate: seRate,
          standard_conversion_factor: scf,
          social_discount_rate: sdr,
          project_life_years: projectLife,
          construction_years: constructionYears,
          cost_data: rows.map(r => ({ year: r.year, amount: r.cost })),
          benefit_data: rows.map(r => ({ year: r.year, amount: r.benefit })),
        }),
      })
      if (res.ok) {
        onSaved()
        onOpenChange(false)
      }
    } catch {} finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>EIRR Calculator</DialogTitle></DialogHeader>

        {/* Parameters */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
          <div>
            <Label className="text-xs">Project Life (years)</Label>
            <Input type="number" value={projectLife} onChange={e => setProjectLife(Number(e.target.value))} />
          </div>
          <div>
            <Label className="text-xs">Construction (years)</Label>
            <Input type="number" value={constructionYears} onChange={e => setConstructionYears(Number(e.target.value))} />
          </div>
          <div>
            <Label className="text-xs">Social Discount Rate (%)</Label>
            <Input type="number" step="0.5" value={sdr} onChange={e => setSdr(Number(e.target.value))} />
          </div>
          <div>
            <Label className="text-xs">Shadow Wage Rate</Label>
            <Input type="number" step="0.01" value={swRate} onChange={e => setSwRate(Number(e.target.value))} />
          </div>
          <div>
            <Label className="text-xs">Shadow Exchange Rate</Label>
            <Input type="number" step="0.01" value={seRate} onChange={e => setSeRate(Number(e.target.value))} />
          </div>
          <div>
            <Label className="text-xs">Standard Conversion Factor</Label>
            <Input type="number" step="0.01" value={scf} onChange={e => setScf(Number(e.target.value))} />
          </div>
        </div>

        {/* Cash flow table */}
        <div className="border rounded-md overflow-hidden mb-4">
          <div className="max-h-[40vh] overflow-y-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/50 sticky top-0 z-10">
                <th className="px-3 py-1.5 text-xs font-semibold text-left w-16">Year</th>
                <th className="px-3 py-1.5 text-xs font-semibold text-right">Costs (M)</th>
                <th className="px-3 py-1.5 text-xs font-semibold text-right">Benefits (M)</th>
                <th className="px-3 py-1.5 text-xs font-semibold text-right">Net</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={idx} className="border-t">
                  <td className="px-3 py-1 text-sm font-mono">{row.year}</td>
                  <td className="px-3 py-1">
                    <Input
                      type="number"
                      step="0.1"
                      value={row.cost}
                      onChange={e => updateRow(idx, 'cost', Number(e.target.value))}
                      className="h-7 text-sm text-right"
                    />
                  </td>
                  <td className="px-3 py-1">
                    <Input
                      type="number"
                      step="0.1"
                      value={row.benefit}
                      onChange={e => updateRow(idx, 'benefit', Number(e.target.value))}
                      className="h-7 text-sm text-right"
                    />
                  </td>
                  <td className={`px-3 py-1 text-sm font-mono text-right ${(row.benefit - row.cost * scf) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {(row.benefit - row.cost * scf).toFixed(1)}
                  </td>
                  <td className="px-1">
                    <button onClick={() => removeRow(idx)} className="p-1 text-muted-foreground hover:text-red-500">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          <div className="p-2 border-t">
            <Button variant="ghost" size="sm" onClick={addRow} className="gap-1 text-xs">
              <Plus className="h-3 w-3" /> Add Year
            </Button>
          </div>
        </div>

        {/* Results */}
        {results && (
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="p-3 bg-muted/50 rounded-lg text-center">
              <div className="text-xs text-muted-foreground mb-1">EIRR</div>
              <div className={`text-xl font-bold font-mono ${eirrPercent != null ? (eirrPercent >= 15 ? 'text-green-600' : 'text-red-600') : 'text-muted-foreground'}`}>
                {eirrPercent != null ? `${eirrPercent.toFixed(1)}%` : 'N/A'}
              </div>
              {eirrPercent != null && (
                <Badge variant={eirrPercent >= 15 ? "success" : "destructive"} className="mt-1 text-[10px]">
                  {eirrPercent >= 15 ? '≥ 15% — Economically Viable' : '< 15%'}
                </Badge>
              )}
            </div>
            <div className="p-3 bg-muted/50 rounded-lg text-center">
              <div className="text-xs text-muted-foreground mb-1">NPV at {sdr}%</div>
              <div className={`text-xl font-bold font-mono ${results.npv != null ? (results.npv >= 0 ? 'text-green-600' : 'text-red-600') : 'text-muted-foreground'}`}>
                {results.npv != null ? `${results.npv.toFixed(1)}M` : 'N/A'}
              </div>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg text-center">
              <div className="text-xs text-muted-foreground mb-1">Benefit-Cost Ratio</div>
              <div className="text-xl font-bold font-mono">
                {results.bcr != null ? results.bcr.toFixed(2) : 'N/A'}
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || eirrPercent == null}>
            {saving ? "Saving..." : "Save Appraisal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
