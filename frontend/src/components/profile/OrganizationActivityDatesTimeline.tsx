"use client"

import React, { useMemo, useState } from "react"
import { Card } from "@/components/ui/card"
import { Calendar } from "lucide-react"

// One Gantt row per activity. Solid bar = the delivery window (actual start →
// actual/planned end); a striped band marks the slippage between the PLANNED
// start and the ACTUAL start, so a late start reads as stripes before the
// solid bar. HTML/CSS layout (percentage-positioned bars) so labels truncate
// cleanly, the year axis stays sticky, and the rows scroll after ~8 activities.

interface Activity {
  id?: string
  title_narrative?: string
  title?: string
  iati_identifier?: string
  iati_id?: string
  acronym?: string
  planned_start_date?: string | null
  planned_end_date?: string | null
  actual_start_date?: string | null
  actual_end_date?: string | null
}

interface Row {
  id: string
  title: string
  acronym: string
  code: string
  plannedStart: number | null
  plannedEnd: number | null
  actualStart: number | null
  actualEnd: number | null
  barStart: number
  barEnd: number
  ongoing: boolean
}

const LABEL_W = 380 // px — left label column (ID + title + acronym)
const ROW_H = 46 // px — per activity row
const VISIBLE_ROWS = 8 // scroll once more than this many activities

const parse = (s?: string | null): number | null => {
  if (!s) return null
  const t = new Date(s).getTime()
  return Number.isFinite(t) ? t : null
}

const fmtDate = (t: number | null): string =>
  t == null ? "—" : new Date(t).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })

export function OrganizationActivityDatesTimeline({ activities }: { activities: Activity[] | null }) {
  const [hover, setHover] = useState<{ row: Row; x: number; y: number } | null>(null)
  const now = Date.now()

  const rows = useMemo<Row[]>(() => {
    if (!activities) return []
    return activities
      .map((a): Row | null => {
        const plannedStart = parse(a.planned_start_date)
        const plannedEnd = parse(a.planned_end_date)
        const actualStart = parse(a.actual_start_date)
        const actualEnd = parse(a.actual_end_date)
        const barStart = actualStart ?? plannedStart
        if (barStart == null) return null
        const explicitEnd = actualEnd ?? plannedEnd
        const ongoing = explicitEnd == null
        const barEnd = explicitEnd ?? now
        if (barEnd < barStart) return null
        return {
          id: a.id || a.iati_identifier || Math.random().toString(36),
          title: a.title_narrative || a.title || "Untitled activity",
          acronym: a.acronym || "",
          code: a.iati_identifier || a.iati_id || "",
          plannedStart,
          plannedEnd,
          actualStart,
          actualEnd,
          barStart,
          barEnd,
          ongoing,
        }
      })
      .filter((r): r is Row => r !== null)
      .sort((a, b) => a.barStart - b.barStart)
  }, [activities, now])

  const scale = useMemo(() => {
    if (rows.length === 0) return null
    let min = Infinity
    let max = -Infinity
    for (const r of rows) {
      for (const t of [r.plannedStart, r.plannedEnd, r.actualStart, r.actualEnd, r.barStart, r.barEnd]) {
        if (t == null) continue
        if (t < min) min = t
        if (t > max) max = t
      }
    }
    const yearMs = 365.25 * 24 * 60 * 60 * 1000
    const pad = (max - min) * 0.03 || yearMs * 0.1
    min -= pad
    max += pad
    const span = max - min || 1
    const pct = (t: number) => ((t - min) / span) * 100
    const firstYear = new Date(min).getUTCFullYear()
    const lastYear = new Date(max).getUTCFullYear()
    const years: number[] = []
    for (let y = firstYear; y <= lastYear; y++) years.push(y)
    return { min, max, span, pct, years }
  }, [rows])

  if (!activities) {
    return <div className="h-40 w-full bg-muted/40 rounded animate-pulse" />
  }

  const todayPct = scale ? scale.pct(now) : -1
  const showToday = todayPct >= 0 && todayPct <= 100

  return (
    <Card className="bg-card p-6">
      <div className="mb-4 flex flex-col space-y-1.5">
        <h2 className="text-lg font-semibold leading-tight tracking-tight text-foreground">Activity Timeline</h2>
        <p className="text-body text-muted-foreground">
          Planned vs actual delivery dates for each activity — the striped band shows the gap between the planned and actual start.
        </p>
      </div>

      {/* Legend */}
      <div className="mb-3 flex flex-wrap items-center gap-4 text-helper text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-4 rounded-sm" style={{ backgroundColor: "#3b82f6" }} />
          Actual / planned delivery
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-4 rounded-sm border border-amber-400"
            style={{ backgroundImage: "repeating-linear-gradient(45deg, #f59e0b 0, #f59e0b 2px, transparent 2px, transparent 4px)" }}
          />
          Planned → actual start gap
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-px bg-red-500" />
          Today
        </span>
      </div>

      {!scale || rows.length === 0 ? (
        <div className="flex h-40 items-center justify-center text-helper text-muted-foreground">
          <div className="text-center">
            <Calendar className="h-10 w-10 mx-auto mb-2 opacity-50" />
            No activities with start/end dates to plot.
          </div>
        </div>
      ) : (
        <div className="w-full">
          {/* Sticky year axis */}
          <div className="flex items-end border-b border-border pb-1">
            <div style={{ width: LABEL_W }} className="flex-shrink-0" />
            <div className="relative flex-1 h-5">
              {scale.years.map((year) => {
                const left = scale.pct(new Date(Date.UTC(year, 0, 1)).getTime())
                if (left < 0 || left > 100) return null
                return (
                  <div key={year} className="absolute top-0 -translate-x-1/2 text-helper text-muted-foreground whitespace-nowrap" style={{ left: `${left}%` }}>
                    CY{year}
                  </div>
                )
              })}
              {showToday && (
                <div className="absolute top-0 bottom-0 w-px bg-red-500" style={{ left: `${todayPct}%` }} />
              )}
            </div>
          </div>

          {/* Scrollable rows */}
          <div className="overflow-y-auto" style={{ maxHeight: VISIBLE_ROWS * ROW_H }}>
            {rows.map((r) => {
              const left = scale.pct(r.barStart)
              const right = scale.pct(r.barEnd)
              const barW = Math.max(right - left, 0)
              let slip: { left: number; w: number } | null = null
              if (r.plannedStart != null && r.actualStart != null && r.plannedStart !== r.actualStart) {
                const a = scale.pct(Math.min(r.plannedStart, r.actualStart))
                const b = scale.pct(Math.max(r.plannedStart, r.actualStart))
                slip = { left: a, w: Math.max(b - a, 0) }
              }
              return (
                <div
                  key={r.id}
                  className="flex items-center border-b border-border/40 last:border-0 hover:bg-muted/30"
                  style={{ minHeight: ROW_H }}
                  onMouseMove={(e) => setHover({ row: r, x: e.clientX, y: e.clientY })}
                  onMouseLeave={() => setHover(null)}
                >
                  {/* Label: ID + title + acronym inline on one wrapping block */}
                  <div
                    style={{ width: LABEL_W }}
                    className="flex-shrink-0 pr-3 min-w-0 py-1.5 text-helper leading-snug break-words"
                    title={`${r.code ? r.code + " " : ""}${r.title}${r.acronym ? ` (${r.acronym})` : ""}`}
                  >
                    {r.code && (
                      <span className="font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded mr-1.5 align-middle">
                        {r.code}
                      </span>
                    )}
                    <span className="text-foreground">
                      {r.title}
                      {r.acronym && ` (${r.acronym})`}
                    </span>
                  </div>

                  {/* Track */}
                  <div className="relative flex-1 h-full">
                    {/* year gridlines */}
                    {scale.years.map((year) => {
                      const gl = scale.pct(new Date(Date.UTC(year, 0, 1)).getTime())
                      if (gl < 0 || gl > 100) return null
                      return <div key={year} className="absolute top-0 bottom-0 w-px bg-border/50" style={{ left: `${gl}%` }} />
                    })}
                    {showToday && <div className="absolute top-0 bottom-0 w-px bg-red-500/70" style={{ left: `${todayPct}%` }} />}

                    {/* striped slippage band */}
                    {slip && (
                      <div
                        className="absolute top-1/2 -translate-y-1/2 h-4 rounded-sm border border-amber-300"
                        style={{
                          left: `${slip.left}%`,
                          width: `${slip.w}%`,
                          minWidth: 2,
                          backgroundImage: "repeating-linear-gradient(45deg, #f59e0b 0, #f59e0b 2px, transparent 2px, transparent 5px)",
                          backgroundColor: "#fef3c7",
                        }}
                      />
                    )}

                    {/* solid delivery bar */}
                    <div
                      className="absolute top-1/2 -translate-y-1/2 h-4 rounded"
                      style={{ left: `${left}%`, width: `${barW}%`, minWidth: 3, backgroundColor: "#3b82f6", opacity: r.ongoing ? 0.55 : 0.85 }}
                    />
                    {/* endpoint dots */}
                    <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-2 w-2 rounded-full" style={{ left: `${left}%`, backgroundColor: "#1e40af" }} />
                    {!r.ongoing && (
                      <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-2 w-2 rounded-full" style={{ left: `${right}%`, backgroundColor: "#1e40af" }} />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {hover && (
        <div
          className="pointer-events-none fixed z-[10005] max-w-[320px] rounded-lg border border-border bg-card text-card-foreground shadow-lg overflow-hidden"
          style={{ left: hover.x + 12, top: hover.y + 12 }}
        >
          <div className="bg-surface-muted px-3 py-2 border-b border-border">
            <p className="font-semibold text-foreground text-helper leading-snug">
              {hover.row.code && <span className="font-mono text-muted-foreground mr-1.5">{hover.row.code}</span>}
              {hover.row.title}
              {hover.row.acronym && <span className="text-muted-foreground"> ({hover.row.acronym})</span>}
            </p>
          </div>
          <table className="text-helper">
            <tbody>
              <tr className="border-b border-border/60">
                <th className="text-left font-medium text-muted-foreground px-3 py-1.5 whitespace-nowrap">Planned start</th>
                <td className="text-foreground px-3 py-1.5 whitespace-nowrap">{fmtDate(hover.row.plannedStart)}</td>
              </tr>
              <tr className="border-b border-border/60">
                <th className="text-left font-medium text-muted-foreground px-3 py-1.5 whitespace-nowrap">Actual start</th>
                <td className="text-foreground px-3 py-1.5 whitespace-nowrap">{fmtDate(hover.row.actualStart)}</td>
              </tr>
              <tr className="border-b border-border/60">
                <th className="text-left font-medium text-muted-foreground px-3 py-1.5 whitespace-nowrap">Planned end</th>
                <td className="text-foreground px-3 py-1.5 whitespace-nowrap">{fmtDate(hover.row.plannedEnd)}</td>
              </tr>
              <tr>
                <th className="text-left font-medium text-muted-foreground px-3 py-1.5 whitespace-nowrap">Actual end</th>
                <td className="text-foreground px-3 py-1.5 whitespace-nowrap">
                  {hover.row.ongoing ? "Ongoing" : fmtDate(hover.row.actualEnd)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

export default OrganizationActivityDatesTimeline
