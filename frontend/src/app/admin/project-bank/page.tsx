"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@/hooks/useUser"
import { MainLayout } from "@/components/layout/main-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Shield, Layers, FolderTree, Plus, Trash2, GripVertical, Pencil, Check, X, ChevronDown, ChevronRight, Save } from "lucide-react"
import { USER_ROLES } from "@/types/user"
import { apiFetch } from "@/lib/api-fetch"
import { LoadingText } from "@/components/ui/loading-text"

interface ProjectType {
  id: string
  code: string
  name: string
  description: string | null
  display_order: number
}

interface SubSector {
  id: string
  name: string
  display_order: number
}

interface Sector {
  id: string
  code: string
  name: string
  display_order: number
  sub_sectors: SubSector[]
}

// ── Project Types Tab ──
function ProjectTypesTab() {
  const [types, setTypes] = useState<ProjectType[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editCode, setEditCode] = useState("")
  const [editName, setEditName] = useState("")
  const [newCode, setNewCode] = useState("")
  const [newName, setNewName] = useState("")
  const [showAdd, setShowAdd] = useState(false)

  const fetchTypes = useCallback(async () => {
    try {
      const res = await apiFetch("/api/pb-project-types")
      if (res.ok) setTypes(await res.json())
    } catch {} finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchTypes() }, [fetchTypes])

  const handleAdd = async () => {
    if (!newCode.trim() || !newName.trim()) return
    await apiFetch("/api/pb-project-types", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: newCode, name: newName, display_order: types.length + 1 }),
    })
    setNewCode("")
    setNewName("")
    setShowAdd(false)
    fetchTypes()
  }

  const handleSaveEdit = async (id: string) => {
    await apiFetch(`/api/pb-project-types/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: editCode, name: editName }),
    })
    setEditingId(null)
    fetchTypes()
  }

  const handleDelete = async (id: string) => {
    await apiFetch(`/api/pb-project-types/${id}`, { method: "DELETE" })
    fetchTypes()
  }

  const handleReorder = async (index: number, direction: -1 | 1) => {
    const swapIdx = index + direction
    if (swapIdx < 0 || swapIdx >= types.length) return
    const updated = [...types]
    const temp = updated[index]
    updated[index] = updated[swapIdx]
    updated[swapIdx] = temp
    setTypes(updated)
    // Persist new order
    await Promise.all(
      updated.map((t, i) =>
        apiFetch(`/api/pb-project-types/${t.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ display_order: i + 1 }),
        })
      )
    )
  }

  if (loading) return <LoadingText>Loading project types...</LoadingText>

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Project Types</CardTitle>
        <Button size="sm" variant="outline" onClick={() => setShowAdd(!showAdd)}>
          <Plus className="h-4 w-4 mr-1" /> Add Type
        </Button>
      </CardHeader>
      <CardContent>
        {showAdd && (
          <div className="flex gap-2 mb-4 items-end">
            <div>
              <label className="text-xs text-muted-foreground">Code</label>
              <Input value={newCode} onChange={e => setNewCode(e.target.value)} placeholder="e.g. INFRA" className="w-24" />
            </div>
            <div className="flex-1">
              <label className="text-xs text-muted-foreground">Name</label>
              <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Infrastructure" />
            </div>
            <Button size="sm" onClick={handleAdd}><Save className="h-4 w-4 mr-1.5" />Save</Button>
            <Button size="sm" variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
          </div>
        )}
        <div className="space-y-1">
          {types.map((t, idx) => (
            <div key={t.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 group">
              <div className="flex flex-col gap-0.5">
                <button onClick={() => handleReorder(idx, -1)} disabled={idx === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-20">
                  <ChevronRight className="h-3 w-3 -rotate-90" />
                </button>
                <button onClick={() => handleReorder(idx, 1)} disabled={idx === types.length - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-20">
                  <ChevronRight className="h-3 w-3 rotate-90" />
                </button>
              </div>
              <GripVertical className="h-4 w-4 text-muted-foreground/40" />
              {editingId === t.id ? (
                <>
                  <Input value={editCode} onChange={e => setEditCode(e.target.value)} className="w-24 h-8 text-sm" />
                  <Input value={editName} onChange={e => setEditName(e.target.value)} className="flex-1 h-8 text-sm" />
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleSaveEdit(t.id)}><Check className="h-3.5 w-3.5" /></Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditingId(null)}><X className="h-3.5 w-3.5" /></Button>
                </>
              ) : (
                <>
                  <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{t.code}</span>
                  <span className="text-sm flex-1">{t.name}</span>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100" onClick={() => { setEditingId(t.id); setEditCode(t.code); setEditName(t.name); }}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 text-red-500" onClick={() => handleDelete(t.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ── Sectors Tab ──
function SectorsTab() {
  const [sectors, setSectors] = useState<Sector[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editCode, setEditCode] = useState("")
  const [editName, setEditName] = useState("")
  const [newCode, setNewCode] = useState("")
  const [newName, setNewName] = useState("")
  const [showAdd, setShowAdd] = useState(false)
  const [newSubName, setNewSubName] = useState("")

  const fetchSectors = useCallback(async () => {
    try {
      const res = await apiFetch("/api/pb-sectors")
      if (res.ok) setSectors(await res.json())
    } catch {} finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchSectors() }, [fetchSectors])

  const handleAddSector = async () => {
    if (!newCode.trim() || !newName.trim()) return
    await apiFetch("/api/pb-sectors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: newCode, name: newName, display_order: sectors.length + 1 }),
    })
    setNewCode("")
    setNewName("")
    setShowAdd(false)
    fetchSectors()
  }

  const handleSaveEdit = async (id: string) => {
    await apiFetch(`/api/pb-sectors/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: editCode, name: editName }),
    })
    setEditingId(null)
    fetchSectors()
  }

  const handleDeleteSector = async (id: string) => {
    await apiFetch(`/api/pb-sectors/${id}`, { method: "DELETE" })
    fetchSectors()
  }

  const handleAddSubSector = async (sectorId: string) => {
    if (!newSubName.trim()) return
    const sector = sectors.find(s => s.id === sectorId)
    if (!sector) return
    const existingSubs = sector.sub_sectors.map(ss => ({ name: ss.name }))
    existingSubs.push({ name: newSubName })
    await apiFetch(`/api/pb-sectors/${sectorId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sub_sectors: existingSubs }),
    })
    setNewSubName("")
    fetchSectors()
  }

  const handleDeleteSubSector = async (sectorId: string, subName: string) => {
    const sector = sectors.find(s => s.id === sectorId)
    if (!sector) return
    const remaining = sector.sub_sectors.filter(ss => ss.name !== subName).map(ss => ({ name: ss.name }))
    await apiFetch(`/api/pb-sectors/${sectorId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sub_sectors: remaining }),
    })
    fetchSectors()
  }

  if (loading) return <LoadingText>Loading sectors...</LoadingText>

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Sectors & Sub-Sectors</CardTitle>
        <Button size="sm" variant="outline" onClick={() => setShowAdd(!showAdd)}>
          <Plus className="h-4 w-4 mr-1" /> Add Sector
        </Button>
      </CardHeader>
      <CardContent>
        {showAdd && (
          <div className="flex gap-2 mb-4 items-end">
            <div>
              <label className="text-xs text-muted-foreground">Code</label>
              <Input value={newCode} onChange={e => setNewCode(e.target.value)} placeholder="e.g. TRAN" className="w-24" />
            </div>
            <div className="flex-1">
              <label className="text-xs text-muted-foreground">Name</label>
              <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Transport" />
            </div>
            <Button size="sm" onClick={handleAddSector}><Save className="h-4 w-4 mr-1.5" />Save</Button>
            <Button size="sm" variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
          </div>
        )}
        <div className="space-y-1">
          {sectors.map(s => (
            <div key={s.id}>
              <div className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 group">
                <button onClick={() => setExpandedId(expandedId === s.id ? null : s.id)} className="text-muted-foreground">
                  {expandedId === s.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>
                {editingId === s.id ? (
                  <>
                    <Input value={editCode} onChange={e => setEditCode(e.target.value)} className="w-24 h-8 text-sm" />
                    <Input value={editName} onChange={e => setEditName(e.target.value)} className="flex-1 h-8 text-sm" />
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleSaveEdit(s.id)}><Check className="h-3.5 w-3.5" /></Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditingId(null)}><X className="h-3.5 w-3.5" /></Button>
                  </>
                ) : (
                  <>
                    <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{s.code}</span>
                    <span className="text-sm flex-1">{s.name}</span>
                    <span className="text-xs text-muted-foreground">{s.sub_sectors.length} sub-sectors</span>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100" onClick={() => { setEditingId(s.id); setEditCode(s.code); setEditName(s.name); }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 text-red-500" onClick={() => handleDeleteSector(s.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </>
                )}
              </div>
              {expandedId === s.id && (
                <div className="ml-10 border-l pl-3 pb-2 space-y-1">
                  {s.sub_sectors.map(ss => (
                    <div key={ss.id} className="flex items-center gap-2 py-1 text-sm group/sub">
                      <span className="flex-1 text-muted-foreground">{ss.name}</span>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0 opacity-0 group-hover/sub:opacity-100 text-red-500" onClick={() => handleDeleteSubSector(s.id, ss.name)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex gap-2 mt-1">
                    <Input
                      value={newSubName}
                      onChange={e => setNewSubName(e.target.value)}
                      placeholder="New sub-sector name"
                      className="h-7 text-xs flex-1"
                      onKeyDown={e => { if (e.key === "Enter") handleAddSubSector(s.id) }}
                    />
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleAddSubSector(s.id)}>
                      <Plus className="h-3 w-3 mr-1" /> Add
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ── Page ──
export default function ProjectBankAdminPage() {
  const { user, isLoading } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && user && user.role !== USER_ROLES.SUPER_USER) {
      router.push("/")
    }
  }, [user, isLoading, router])

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <LoadingText>Loading...</LoadingText>
        </div>
      </MainLayout>
    )
  }

  if (!user || user.role !== USER_ROLES.SUPER_USER) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-muted-foreground">Access denied</p>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="w-full max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <Layers className="h-8 w-8 text-foreground" />
            <div>
              <h1 className="text-3xl font-bold">Project Bank Settings</h1>
              <p className="text-muted-foreground mt-1">Manage project types, sectors, and sub-sectors</p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="project-types" className="space-y-6">
          <TabsList className="p-1 h-auto bg-background gap-1 border">
            <TabsTrigger value="project-types" className="flex items-center gap-2 data-[state=active]:bg-muted data-[state=active]:text-foreground data-[state=active]:shadow-sm">
              <Layers className="h-4 w-4" />
              Project Types
            </TabsTrigger>
            <TabsTrigger value="sectors" className="flex items-center gap-2 data-[state=active]:bg-muted data-[state=active]:text-foreground data-[state=active]:shadow-sm">
              <FolderTree className="h-4 w-4" />
              Sectors
            </TabsTrigger>
          </TabsList>

          <TabsContent value="project-types">
            <ProjectTypesTab />
          </TabsContent>

          <TabsContent value="sectors">
            <SectorsTab />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  )
}
