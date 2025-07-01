"use client"
import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, AlertCircle, PieChart, ExternalLink } from "lucide-react";
import { DAC_CODES } from "@/data/dac-codes";
import { useRouter } from "next/navigation";

// Convert DAC_CODES to the format used by this component
const SECTOR_CODES = DAC_CODES.map(code => ({
  code: code.dac5_code,
  name: code.dac5_name,
  category: code.dac3_parent_name || 'Unknown'
}));

interface Sector {
  id: string;
  code: string;
  name: string;
  percentage: number;
  type: "primary" | "secondary";
  category?: string;
}

interface SectorsSectionProps {
  sectors?: Sector[];
  onChange?: (sectors: Sector[]) => void;
}

export default function SectorsSection({ sectors: initialSectors = [], onChange }: SectorsSectionProps) {
  const router = useRouter();
  const [sectors, setSectors] = useState<Sector[]>(initialSectors);
  const [showAddSector, setShowAddSector] = useState(false);
  const [newSector, setNewSector] = useState({ code: "", percentage: 0 });

  const totalPercentage = sectors.reduce((sum, sector) => sum + sector.percentage, 0);
  const hasPrimary = sectors.some(s => s.type === "primary");

  const addSector = () => {
    if (!newSector.code || newSector.percentage <= 0) return;

    const sectorInfo = SECTOR_CODES.find(s => s.code === newSector.code);
    if (!sectorInfo) return;

    const sector: Sector = {
      id: Math.random().toString(36).substring(7),
      code: sectorInfo.code,
      name: sectorInfo.name,
      percentage: newSector.percentage,
      type: !hasPrimary ? "primary" : "secondary",
      category: sectorInfo.category
    };

    const updatedSectors = [...sectors, sector];
    setSectors(updatedSectors);
    onChange?.(updatedSectors);
    
    setNewSector({ code: "", percentage: 0 });
    setShowAddSector(false);
  };

  const removeSector = (id: string) => {
    const updatedSectors = sectors.filter(s => s.id !== id);
    setSectors(updatedSectors);
    onChange?.(updatedSectors);
  };

  const updateSectorPercentage = (id: string, percentage: number) => {
    const updatedSectors = sectors.map(s => 
      s.id === id ? { ...s, percentage } : s
    );
    setSectors(updatedSectors);
    onChange?.(updatedSectors);
  };

  const toggleSectorType = (id: string) => {
    const updatedSectors = sectors.map(s => {
      if (s.id === id) {
        return { ...s, type: s.type === "primary" ? "secondary" : "primary" } as Sector;
      }
      // If setting this as primary, make all others secondary
      if (sectors.find(sec => sec.id === id)?.type === "secondary") {
        return { ...s, type: "secondary" as const };
      }
      return s;
    });
    setSectors(updatedSectors);
    onChange?.(updatedSectors);
  };

  return (
    <div className="space-y-4 max-w-3xl">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Activity Sectors</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Assign OECD DAC sector codes and allocations
              </p>
            </div>
            {!showAddSector && (
              <Button onClick={() => setShowAddSector(true)} size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add Sector
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Info about advanced sector management */}
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
            <PieChart className="h-4 w-4 text-blue-600 mt-0.5" />
            <div className="text-sm flex-1">
              <p className="font-medium text-blue-900">Advanced Sector Management Available</p>
              <p className="text-blue-700">
                After saving this activity, you can access advanced sector allocation features including visualizations and batch management.
              </p>
            </div>
          </div>

          {/* Total Percentage Alert */}
          {totalPercentage !== 0 && totalPercentage !== 100 && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-900">Percentage allocation is {totalPercentage}%</p>
                <p className="text-amber-700">Total sector allocation should equal 100%</p>
              </div>
            </div>
          )}

          {/* Sectors List */}
          <div className="space-y-3">
            {sectors.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No sectors assigned yet. Click "Add Sector" to begin.
              </p>
            ) : (
              sectors.map((sector) => (
                <div key={sector.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{sector.code}</span>
                        <Badge
                          variant={sector.type === "primary" ? "default" : "secondary"}
                          className="cursor-pointer"
                          onClick={() => toggleSectorType(sector.id)}
                        >
                          {sector.type}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{sector.name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          value={sector.percentage}
                          onChange={(e) => updateSectorPercentage(sector.id, Number(e.target.value))}
                          className="w-20 text-right"
                          min="0"
                          max="100"
                        />
                        <span className="text-sm">%</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeSector(sector.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Add Sector Form */}
          {showAddSector && (
            <div className="mt-4 border rounded-lg p-4 bg-muted/50">
              <h4 className="font-medium mb-3">Add New Sector</h4>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">Sector Code</label>
                  <Select value={newSector.code} onValueChange={(value) => setNewSector({ ...newSector, code: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a sector" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {SECTOR_CODES.map((sector) => (
                        <SelectItem key={sector.code} value={sector.code}>
                          <div className="flex flex-col">
                            <div>
                              <span className="font-medium">{sector.code}</span> - {sector.name}
                            </div>
                            <span className="text-xs text-muted-foreground">{sector.category}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Percentage Allocation</label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={newSector.percentage}
                      onChange={(e) => setNewSector({ ...newSector, percentage: Number(e.target.value) })}
                      placeholder="0"
                      min="0"
                      max="100"
                      className="w-32"
                    />
                    <span className="text-sm">%</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={addSector} disabled={!newSector.code || newSector.percentage <= 0}>
                    Add Sector
                  </Button>
                  <Button variant="outline" onClick={() => {
                    setShowAddSector(false);
                    setNewSector({ code: "", percentage: 0 });
                  }}>
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Summary */}
          {sectors.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Total Allocation:</span>
                <span className={`text-sm font-bold ${totalPercentage === 100 ? 'text-green-600' : 'text-amber-600'}`}>
                  {totalPercentage}%
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 