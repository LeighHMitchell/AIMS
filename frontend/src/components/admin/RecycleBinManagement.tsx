"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Loader2, RotateCcw, ArchiveRestore, Trash2, Activity, Building2, ArrowLeftRight, UserSquare2, ListChecks, Trash, Hand, Play } from "lucide-react"
import { toast } from "sonner"

const ENTITY_TYPES = ["activities", "transactions", "organizations", "contacts", "tasks"] as const
type EntityType = typeof ENTITY_TYPES[number]

const ENTITY_META: Record<EntityType, { label: string; Icon: typeof Activity }> = {
  activities: { label: "Activities", Icon: Activity },
  transactions: { label: "Transactions", Icon: ArrowLeftRight },
  organizations: { label: "Organisations", Icon: Building2 },
  contacts: { label: "Contacts", Icon: UserSquare2 },
  tasks: { label: "Tasks", Icon: ListChecks },
}

type RecycleItem = {
  id: string
  title: string
  deletedAt: string
  daysRemaining: number
  purgePaused: boolean
  deletedBy: { id: string; name: string; email: string | null } | null
}

function formatRelativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(ms / 60_000)
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function RecycleBinManagement() {
  const [activeEntity, setActiveEntity] = useState<EntityType>("activities")
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [items, setItems] = useState<Record<EntityType, RecycleItem[]>>({
    activities: [],
    transactions: [],
    organizations: [],
    contacts: [],
    tasks: [],
  })
  const [loading, setLoading] = useState<Record<EntityType, boolean>>({
    activities: false,
    transactions: false,
    organizations: false,
    contacts: false,
    tasks: false,
  })
  const [retentionDays, setRetentionDays] = useState(30)
  const [purgeTarget, setPurgeTarget] = useState<{ ids: string[]; titles: string[] } | null>(null)
  const [purgeConfirm, setPurgeConfirm] = useState("")
  const [busy, setBusy] = useState(false)
  const [selected, setSelected] = useState<Record<EntityType, Set<string>>>({
    activities: new Set(),
    transactions: new Set(),
    organizations: new Set(),
    contacts: new Set(),
    tasks: new Set(),
  })

  const fetchCounts = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/recycle-bin/counts", { cache: "no-store" })
      if (!res.ok) throw new Error(`Counts fetch failed: ${res.status}`)
      const data = await res.json()
      setCounts(data.counts ?? {})
    } catch (err) {
      console.error(err)
    }
  }, [])

  const fetchItems = useCallback(async (entity: EntityType) => {
    setLoading(prev => ({ ...prev, [entity]: true }))
    try {
      const res = await fetch(`/api/admin/recycle-bin/${entity}`, { cache: "no-store" })
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}))
        throw new Error(errBody.error || `Fetch failed: ${res.status}`)
      }
      const data = await res.json()
      setItems(prev => ({ ...prev, [entity]: data.items ?? [] }))
      if (typeof data.retentionDays === "number") setRetentionDays(data.retentionDays)
    } catch (err) {
      console.error(err)
      const msg = err instanceof Error ? err.message : `Failed to load deleted ${entity}`
      toast.error(`Failed to load deleted ${entity}: ${msg}`)
    } finally {
      setLoading(prev => ({ ...prev, [entity]: false }))
    }
  }, [])

  useEffect(() => {
    fetchCounts()
  }, [fetchCounts])

  useEffect(() => {
    fetchItems(activeEntity)
  }, [activeEntity, fetchItems])

  const handlePause = useCallback(async (entity: EntityType, ids: string[], paused: boolean) => {
    if (ids.length === 0) return
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/recycle-bin/${entity}/pause`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, paused }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `${paused ? "Pause" : "Unpause"} failed: ${res.status}`)
      }
      toast.success(paused ? `Paused ${ids.length} ${entity}` : `Resumed ${ids.length} ${entity}`)
      await fetchItems(entity)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Pause failed")
    } finally {
      setBusy(false)
    }
  }, [fetchItems])

  const handleRestore = useCallback(async (entity: EntityType, ids: string[]) => {
    if (ids.length === 0) return
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/recycle-bin/${entity}/restore`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Restore failed: ${res.status}`)
      }
      const data = await res.json()
      toast.success(`Restored ${data.restored ?? ids.length} ${entity}`)
      setSelected(prev => ({ ...prev, [entity]: new Set() }))
      await Promise.all([fetchItems(entity), fetchCounts()])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Restore failed")
    } finally {
      setBusy(false)
    }
  }, [fetchCounts, fetchItems])

  const handlePurge = useCallback(async () => {
    if (!purgeTarget) return
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/recycle-bin/${activeEntity}/purge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: purgeTarget.ids }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Purge failed: ${res.status}`)
      }
      const data = await res.json()
      toast.success(`Permanently deleted ${data.purged ?? purgeTarget.ids.length} ${activeEntity}`)
      setPurgeTarget(null)
      setPurgeConfirm("")
      setSelected(prev => ({ ...prev, [activeEntity]: new Set() }))
      await Promise.all([fetchItems(activeEntity), fetchCounts()])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Purge failed")
    } finally {
      setBusy(false)
    }
  }, [activeEntity, fetchCounts, fetchItems, purgeTarget])

  const toggleSelect = (entity: EntityType, id: string) => {
    setSelected(prev => {
      const next = new Set(prev[entity])
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return { ...prev, [entity]: next }
    })
  }

  const toggleSelectAll = (entity: EntityType) => {
    setSelected(prev => {
      const all = items[entity].map(i => i.id)
      const cur = prev[entity]
      const next = cur.size === all.length ? new Set<string>() : new Set(all)
      return { ...prev, [entity]: next }
    })
  }

  const purgeMessage = useMemo(() => {
    if (!purgeTarget) return ""
    if (purgeTarget.ids.length === 1) return purgeTarget.titles[0]
    return `${purgeTarget.ids.length} ${activeEntity}`
  }, [purgeTarget, activeEntity])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trash className="h-5 w-5" />
          Recycle Bin
        </CardTitle>
        <CardDescription>
          Items deleted by users in the last {retentionDays} days. Restore to bring them back, or delete permanently to purge now. Anything older than {retentionDays} days is purged automatically.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeEntity} onValueChange={(v) => setActiveEntity(v as EntityType)}>
          <TabsList className="p-1 h-auto bg-background gap-1 border mb-4 flex flex-wrap">
            {ENTITY_TYPES.map(et => {
              const meta = ENTITY_META[et]
              const Icon = meta.Icon
              const count = counts[et] ?? 0
              return (
                <TabsTrigger
                  key={et}
                  value={et}
                  className="flex items-center gap-2 data-[state=active]:bg-muted data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                >
                  <Icon className="h-4 w-4" />
                  {meta.label}
                  {count > 0 && (
                    <Badge variant="secondary" className="ml-1">{count}</Badge>
                  )}
                </TabsTrigger>
              )
            })}
          </TabsList>

          {ENTITY_TYPES.map(et => (
            <TabsContent key={et} value={et} className="space-y-4">
              <RecycleBinTable
                entity={et}
                items={items[et]}
                loading={loading[et]}
                selected={selected[et]}
                onToggle={(id) => toggleSelect(et, id)}
                onToggleAll={() => toggleSelectAll(et)}
                onRestoreOne={(id) => handleRestore(et, [id])}
                onPurgeOne={(id, title) => {
                  setPurgeTarget({ ids: [id], titles: [title] })
                  setPurgeConfirm("")
                }}
                onPauseOne={(id, paused) => handlePause(et, [id], paused)}
                onRestoreSelected={() => handleRestore(et, Array.from(selected[et]))}
                onPurgeSelected={() => {
                  const ids = Array.from(selected[et])
                  const titles = items[et].filter(i => selected[et].has(i.id)).map(i => i.title)
                  setPurgeTarget({ ids, titles })
                  setPurgeConfirm("")
                }}
                busy={busy}
              />
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>

      <Dialog open={!!purgeTarget} onOpenChange={(o) => { if (!o) { setPurgeTarget(null); setPurgeConfirm("") } }}>
        <DialogContent>
          <DialogHeader className="bg-surface-muted -mx-6 -mt-6 px-6 pt-6 pb-4 rounded-t-lg border-b">
            <DialogTitle>Permanently delete?</DialogTitle>
            <DialogDescription>
              This cannot be undone. To confirm, type <span className="font-mono font-semibold">DELETE</span> below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="text-sm">
              <span className="text-muted-foreground">You are about to permanently delete:</span>
              <div className="mt-1 font-medium">{purgeMessage}</div>
            </div>
            <Input
              autoFocus
              placeholder="Type DELETE to confirm"
              value={purgeConfirm}
              onChange={(e) => setPurgeConfirm(e.target.value)}
              disabled={busy}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setPurgeTarget(null); setPurgeConfirm("") }}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handlePurge}
              disabled={busy || purgeConfirm !== "DELETE"}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

type TableProps = {
  entity: EntityType
  items: RecycleItem[]
  loading: boolean
  selected: Set<string>
  onToggle: (id: string) => void
  onToggleAll: () => void
  onRestoreOne: (id: string) => void
  onPurgeOne: (id: string, title: string) => void
  onPauseOne: (id: string, paused: boolean) => void
  onRestoreSelected: () => void
  onPurgeSelected: () => void
  busy: boolean
}

function RecycleBinTable({
  entity,
  items,
  loading,
  selected,
  onToggle,
  onToggleAll,
  onRestoreOne,
  onPurgeOne,
  onPauseOne,
  onRestoreSelected,
  onPurgeSelected,
  busy,
}: TableProps) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-12 justify-center">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading...
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-12 text-center">
        No deleted {entity} in the recycle bin.
      </div>
    )
  }

  const allSelected = selected.size > 0 && selected.size === items.length

  return (
    <div className="space-y-3">
      {selected.size > 0 && (
        <div className="flex items-center justify-between bg-surface-muted px-3 py-2 rounded-md border">
          <div className="text-sm">{selected.size} selected</div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={onRestoreSelected} disabled={busy}>
              <RotateCcw className="h-4 w-4 mr-1.5" /> Restore
            </Button>
            <Button size="sm" variant="destructive" onClick={onPurgeSelected} disabled={busy}>
              <Trash2 className="h-4 w-4 mr-1.5" /> Delete permanently
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={onToggleAll}
                  aria-label="Select all"
                />
              </TableHead>
              <TableHead>Title</TableHead>
              <TableHead className="w-48">Deleted by</TableHead>
              <TableHead className="w-32">Deleted</TableHead>
              <TableHead className="w-32">Auto-purge</TableHead>
              <TableHead className="w-40 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map(item => {
              const isWarning = item.daysRemaining <= 3
              return (
                <TableRow key={item.id}>
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selected.has(item.id)}
                      onChange={() => onToggle(item.id)}
                      aria-label={`Select ${item.title}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{item.title}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {item.deletedBy ? item.deletedBy.name : "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatRelativeTime(item.deletedAt)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {item.purgePaused ? (
                      <Badge variant="secondary" className="font-medium">Paused</Badge>
                    ) : (
                      <span className={isWarning ? "text-destructive font-medium" : "text-muted-foreground"}>
                        in {item.daysRemaining}d
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => onPauseOne(item.id, !item.purgePaused)}
                        disabled={busy}
                        title={item.purgePaused ? "Resume auto-purge" : "Pause auto-purge"}
                        aria-label={item.purgePaused ? "Resume auto-purge" : "Pause auto-purge"}
                      >
                        {item.purgePaused ? (
                          <Play size={18} strokeWidth={2} />
                        ) : (
                          <Hand size={18} strokeWidth={2} />
                        )}
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => onRestoreOne(item.id)}
                        disabled={busy}
                        title="Restore"
                        aria-label="Restore"
                      >
                        <RotateCcw size={18} strokeWidth={2} />
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive hover:border-destructive"
                        onClick={() => onPurgeOne(item.id, item.title)}
                        disabled={busy}
                        title="Delete permanently"
                        aria-label="Delete permanently"
                      >
                        <Trash2 size={18} strokeWidth={2} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
