"use client"

import React, { useState } from 'react'
import { MainLayout } from '@/components/layout/main-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { MoreVertical, Pencil, Trash2, Eye, Download, Share, Copy } from "lucide-react"
import { toast } from "sonner"

export default function ActionMenuDemoPage() {
  const [selectedAction, setSelectedAction] = useState<string>('')

  const handleAction = (action: string, itemId: string) => {
    setSelectedAction(`${action} - Item ${itemId}`)
    toast.success(`${action} action triggered for Item ${itemId}`)
  }

  const sampleData = [
    { id: '1', name: 'Clean Water Initiative', status: 'Active', date: '2024-01-15' },
    { id: '2', name: 'Education Support Program', status: 'Draft', date: '2024-01-20' },
    { id: '3', name: 'Healthcare Infrastructure', status: 'Completed', date: '2024-01-25' },
    { id: '4', name: 'Agriculture Development', status: 'Pending', date: '2024-01-30' },
  ]

  return (
    <MainLayout>
      <div className="min-h-screen bg-muted p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">Action Menu Demo</h1>
          <p className="text-muted-foreground mb-8">
            Demonstration of the new action menu using the MoreVertical icon with dropdown functionality.
          </p>

          {selectedAction && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800">Last action: <strong>{selectedAction}</strong></p>
            </div>
          )}

          {/* Basic Action Menu */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Basic Action Menu</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <span className="text-sm">Click the menu to see available actions:</span>
                <Popover>
                  <PopoverTrigger className="p-0 h-auto hover:bg-muted rounded-sm">
                    <MoreVertical className="h-4 w-4" />
                  </PopoverTrigger>
                  <PopoverContent className="w-32 p-1">
                    <button 
                      className="flex items-center gap-2 w-full p-2 hover:bg-muted rounded-sm text-sm"
                      onClick={() => handleAction('Edit', 'demo')}
                    >
                      <Pencil className="h-4 w-4 text-muted-foreground ring-1 ring-slate-300 rounded-sm" /> Edit
                    </button>
                    <button 
                      className="flex items-center gap-2 w-full p-2 hover:bg-muted rounded-sm text-red-600 text-sm"
                      onClick={() => handleAction('Delete', 'demo')}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" /> Delete
                    </button>
                  </PopoverContent>
                </Popover>
              </div>
            </CardContent>
          </Card>

          {/* Table with Action Menus */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Table with Action Menus</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="w-[50px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sampleData.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          item.status === 'Active' ? 'bg-green-100 text-green-800' :
                          item.status === 'Draft' ? 'bg-muted text-foreground' :
                          item.status === 'Completed' ? 'bg-blue-100 text-blue-800' :
                          'bg-orange-100 text-orange-800'
                        }`}>
                          {item.status}
                        </span>
                      </TableCell>
                      <TableCell>{item.date}</TableCell>
                      <TableCell>
                        <div className="flex justify-end">
                          <Popover>
                            <PopoverTrigger className="p-0 h-auto hover:bg-muted rounded-sm">
                              <MoreVertical className="h-4 w-4" />
                            </PopoverTrigger>
                            <PopoverContent className="w-32 p-1">
                              <button 
                                className="flex items-center gap-2 w-full p-2 hover:bg-muted rounded-sm text-sm"
                                onClick={() => handleAction('View', item.id)}
                              >
                                <Eye className="h-4 w-4" /> View
                              </button>
                              <button 
                                className="flex items-center gap-2 w-full p-2 hover:bg-muted rounded-sm text-sm"
                                onClick={() => handleAction('Edit', item.id)}
                              >
                                <Pencil className="h-4 w-4 text-muted-foreground ring-1 ring-slate-300 rounded-sm" /> Edit
                              </button>
                              <button 
                                className="flex items-center gap-2 w-full p-2 hover:bg-muted rounded-sm text-red-600 text-sm"
                                onClick={() => handleAction('Delete', item.id)}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" /> Delete
                              </button>
                            </PopoverContent>
                          </Popover>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Extended Action Menu */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Extended Action Menu</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <span className="text-sm">Example with more actions:</span>
                <Popover>
                  <PopoverTrigger className="p-0 h-auto hover:bg-muted rounded-sm">
                    <MoreVertical className="h-4 w-4" />
                  </PopoverTrigger>
                  <PopoverContent className="w-40 p-1">
                    <button 
                      className="flex items-center gap-2 w-full p-2 hover:bg-muted rounded-sm text-sm"
                      onClick={() => handleAction('View Details', 'extended')}
                    >
                      <Eye className="h-4 w-4" /> View Details
                    </button>
                    <button 
                      className="flex items-center gap-2 w-full p-2 hover:bg-muted rounded-sm text-sm"
                      onClick={() => handleAction('Edit', 'extended')}
                    >
                      <Pencil className="h-4 w-4 text-muted-foreground ring-1 ring-slate-300 rounded-sm" /> Edit
                    </button>
                    <button 
                      className="flex items-center gap-2 w-full p-2 hover:bg-muted rounded-sm text-sm"
                      onClick={() => handleAction('Download', 'extended')}
                    >
                      <Download className="h-4 w-4" /> Download
                    </button>
                    <button 
                      className="flex items-center gap-2 w-full p-2 hover:bg-muted rounded-sm text-sm"
                      onClick={() => handleAction('Share', 'extended')}
                    >
                      <Share className="h-4 w-4" /> Share
                    </button>
                    <button 
                      className="flex items-center gap-2 w-full p-2 hover:bg-muted rounded-sm text-sm"
                      onClick={() => handleAction('Copy Link', 'extended')}
                    >
                      <Copy className="h-4 w-4" /> Copy Link
                    </button>
                    <div className="border-t border-border my-1" />
                    <button 
                      className="flex items-center gap-2 w-full p-2 hover:bg-muted rounded-sm text-red-600 text-sm"
                      onClick={() => handleAction('Delete', 'extended')}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" /> Delete
                    </button>
                  </PopoverContent>
                </Popover>
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
                <h3 className="font-semibold mb-2">Basic Structure:</h3>
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
{`import { MoreVertical, Pencil, Trash2 } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"

<Popover>
  <PopoverTrigger className="p-0 h-auto hover:bg-muted rounded-sm">
    <MoreVertical className="h-4 w-4" />
  </PopoverTrigger>
  <PopoverContent className="w-32 p-1">
    <button className="flex items-center gap-2 w-full p-2 hover:bg-muted rounded-sm text-sm" onClick={handleEdit}>
      <Pencil className="h-4 w-4 text-muted-foreground ring-1 ring-slate-300 rounded-sm" /> Edit
    </button>
    <button className="flex items-center gap-2 w-full p-2 hover:bg-muted rounded-sm text-red-600 text-sm" onClick={handleDelete}>
      <Trash2 className="h-4 w-4 text-red-500" /> Delete
    </button>
  </PopoverContent>
</Popover>`}
                </pre>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Key Features:</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• <strong>Space Efficient:</strong> Single icon instead of multiple buttons</li>
                  <li>• <strong>Consistent Design:</strong> Uses MoreVertical icon pattern</li>
                  <li>• <strong>Hover States:</strong> Clear feedback on menu items</li>
                  <li>• <strong>Color Coding:</strong> Red text for destructive actions</li>
                  <li>• <strong>Flexible:</strong> Easy to add more actions as needed</li>
                  <li>• <strong>Accessible:</strong> Proper focus management and keyboard navigation</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Best Practices:</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Keep menu width consistent (typically w-32 or w-40)</li>
                  <li>• Use semantic icons that match action names</li>
                  <li>• Place destructive actions at the bottom with red color</li>
                  <li>• Add separators for grouping related actions</li>
                  <li>• Handle click propagation in cards/rows to prevent conflicts</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  )
}