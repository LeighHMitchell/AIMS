"use client"

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Users, Edit2, Trash2, MoreVertical, Globe, Lock } from 'lucide-react'

interface CustomGroup {
  id: string
  name: string
  description?: string
  group_code?: string
  is_public: boolean
  tags?: string[]
  logo?: string
  banner?: string
  members?: any[]
}

interface CustomGroupCardProps {
  group: CustomGroup
  onEdit: (group: CustomGroup) => void
  onDelete: (group: CustomGroup) => void
}

export function CustomGroupCard({ group, onEdit, onDelete }: CustomGroupCardProps) {
  const memberCount = group.members?.length || 0

  return (
    <Card 
      className="bg-white border border-gray-300 hover:border-gray-400 hover:shadow-lg transition-all duration-300 ease-in-out cursor-pointer overflow-hidden h-full flex flex-col shadow-sm"
    >
      {/* Banner Image */}
      <div className="h-32 bg-gradient-to-r from-purple-500 to-pink-600 relative overflow-hidden flex-shrink-0">
        {group.banner ? (
          <img 
            src={group.banner} 
            alt={`${group.name} banner`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Users className="h-16 w-16 text-white/20" />
          </div>
        )}
      </div>

      <CardContent className="p-6 flex flex-col flex-grow relative">
        <div className="flex flex-col space-y-4 flex-grow">
          {/* Top section with logo and name */}
          <div className="flex items-start gap-4">
            {/* Logo */}
            <div className="flex-shrink-0">
              {group.logo ? (
                <img 
                  src={group.logo} 
                  alt={`${group.name} logo`}
                  className="w-16 h-16 object-contain rounded-lg border bg-white p-1"
                />
              ) : (
                <div className="w-16 h-16 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Users className="h-8 w-8 text-purple-600" />
                </div>
              )}
            </div>
            
            {/* Group Name and Details */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg text-gray-900 line-clamp-2">
                {group.name}
              </h3>
              
              {/* Group Code */}
              {group.group_code && (
                <div className="flex items-center gap-1 mt-2">
                  <code className="text-xs font-mono bg-gray-100 text-gray-700 px-2 py-1 rounded">
                    {group.group_code}
                  </code>
                </div>
              )}

              {/* Visibility and Member Count Pills */}
              <div className="flex items-center gap-2 mt-2">
                {/* Visibility Pill */}
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  group.is_public ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {group.is_public ? (
                    <>
                      <Globe className="h-3 w-3 mr-1" />
                      Public
                    </>
                  ) : (
                    <>
                      <Lock className="h-3 w-3 mr-1" />
                      Private
                    </>
                  )}
                </span>
                
                {/* Member Count Pill */}
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  <Users className="h-3 w-3 mr-1" />
                  {memberCount} {memberCount === 1 ? 'member' : 'members'}
                </span>
              </div>
            </div>
          </div>

          {/* Description */}
          {group.description && (
            <div className="pt-3 border-t border-gray-200">
              <p className="text-sm text-gray-600 line-clamp-3">
                {group.description}
              </p>
            </div>
          )}

          {/* Tags */}
          {group.tags && group.tags.length > 0 && (
            <div className="pt-3 border-t border-gray-200">
              <div className="flex flex-wrap gap-2">
                {group.tags.slice(0, 3).map((tag, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                {group.tags.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{group.tags.length - 3} more
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Actions Dropdown - positioned at bottom right */}
        <div 
          className="absolute bottom-4 right-4" 
          onClick={(e) => e.stopPropagation()}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 bg-white hover:bg-gray-50 shadow-md border border-gray-300 rounded-full"
              >
                <MoreVertical className="h-4 w-4 text-gray-600" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(group)}>
                <Edit2 className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => onDelete(group)}
                className="text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  )
}

