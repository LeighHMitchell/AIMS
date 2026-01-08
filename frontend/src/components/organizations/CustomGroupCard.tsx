"use client"

import React from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Users, Edit2, Trash2, MoreVertical, Globe, Lock, Eye, Building2 } from 'lucide-react'
import { motion, useReducedMotion, type Transition } from "framer-motion"
import { useMemo, useState } from "react"

// Color palette - matching OrganizationCardModern
const colors = {
  primaryScarlet: '#dc2625',
  paleSlate: '#cfd0d5',
  blueSlate: '#4c5568',
  coolSteel: '#7b95a7',
  platinum: '#f1f4f8',
  purple: '#7c3aed',
  purpleLight: '#a78bfa',
}

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

// Generate a consistent color based on org name
const getOrgColor = (name: string): string => {
  const colors = [
    'bg-[#4f46e5]', 'bg-[#10b981]', 'bg-[#38bdf8]', 'bg-[#f97316]',
    'bg-[#a855f7]', 'bg-[#ec4899]', 'bg-[#14b8a6]', 'bg-[#f59e0b]'
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

export function CustomGroupCard({ group, onEdit, onDelete }: CustomGroupCardProps) {
  const router = useRouter()
  const memberCount = group.members?.length || 0
  const shouldReduceMotion = useReducedMotion()
  const [membersPopoverOpen, setMembersPopoverOpen] = useState(false)

  const handleView = () => {
    router.push(`/partners/groups/${group.id}`)
  }

  // Sort members alphabetically by name
  const sortedMembers = useMemo(() => {
    if (!group.members) return []
    return [...group.members].sort((a, b) => {
      const nameA = (a.organizations?.name || a.name || '').toLowerCase()
      const nameB = (b.organizations?.name || b.name || '').toLowerCase()
      return nameA.localeCompare(nameB)
    })
  }, [group.members])

  const animationConfig = useMemo(
    () =>
      shouldReduceMotion
        ? {
            initial: { opacity: 1, x: 0, scale: 1 },
            animate: { opacity: 1, x: 0, scale: 1 },
            whileHover: { scale: 1.08, zIndex: 10 },
            transition: { duration: 0 },
          }
        : {
            initial: (index: number) => ({
              opacity: 0,
              x: -8 * index,
              scale: 0.85,
            }),
            animate: { opacity: 1, x: 0, scale: 1 },
            whileHover: { scale: 1.12, zIndex: 10 },
            transition: (index: number) => ({
              delay: 0.05 * index,
              type: "spring",
              stiffness: 320,
              damping: 24,
              mass: 0.7,
            }),
          },
    [shouldReduceMotion]
  )

  const displayedMembers = group.members?.slice(0, 5) || []
  const remainingCount = memberCount - displayedMembers.length

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, type: "spring", bounce: 0.3 }}
      whileHover={{ y: -8 }}
      onClick={handleView}
      className="group relative flex w-full flex-col rounded-3xl shadow-sm hover:shadow-xl transition-shadow duration-300 cursor-pointer isolate overflow-hidden border"
      style={{ backgroundColor: 'white' }}
      role="article"
      aria-label={`Custom Group: ${group.name}`}
    >
      {/* Banner/Poster Section */}
      <div className="relative h-48 w-full overflow-hidden" style={{ backgroundColor: colors.purple }}>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10" />
        {group.banner ? (
          <motion.img
            src={group.banner}
            alt={`${group.name} banner`}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-600">
            <Users className="h-16 w-16 text-white/30" />
          </div>
        )}

        {/* Action Menu - Top Left */}
        <div className="absolute top-4 left-4 z-20" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 backdrop-blur-sm rounded-full border-0"
                style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
              >
                <MoreVertical className="h-4 w-4 text-white" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => handleView()}>
                <Eye className="h-4 w-4 mr-2" style={{ color: colors.blueSlate }} />
                View
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(group)}>
                <Edit2 className="h-4 w-4 mr-2" style={{ color: colors.blueSlate }} />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(group)}
                style={{ color: colors.primaryScarlet }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Visibility Badge - Top Right */}
        <div className="absolute top-4 right-4 z-20">
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium backdrop-blur-sm ${
            group.is_public ? 'bg-green-500/80 text-white' : 'bg-black/40 text-white'
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
        </div>

        {/* Title & Metadata - Bottom of banner */}
        <div className="absolute bottom-0 left-0 right-0 p-4 z-20">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-lg font-bold text-white mb-1 line-clamp-2 transition-colors">
              {group.name}
            </h2>
            <div className="flex items-center gap-2 text-xs" style={{ color: colors.paleSlate }}>
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {memberCount} {memberCount === 1 ? 'member' : 'members'}
              </span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Logo Overlay - positioned outside banner to avoid overflow clipping */}
      {group.logo && (
        <div className="absolute right-4 top-48 -translate-y-[75%] z-30">
          <div className="w-14 h-14 rounded-full border-4 shadow-lg overflow-hidden p-1" style={{ borderColor: colors.platinum, backgroundColor: 'white' }}>
            <img
              src={group.logo}
              alt={`${group.name} logo`}
              className="w-full h-full object-contain"
            />
          </div>
        </div>
      )}

      {/* Details Section */}
      <div className="relative flex-1 p-5 flex flex-col" style={{ backgroundColor: 'white' }}>
        <div className="flex-1">
          {/* Description */}
          {group.description && (
            <p className="text-sm line-clamp-2 mb-3" style={{ color: colors.coolSteel }}>
              {group.description}
            </p>
          )}

          {/* Member Organizations Avatar Group */}
          {group.members && group.members.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-wider" style={{ color: colors.coolSteel }}>
                Members
              </p>
              <Popover open={membersPopoverOpen} onOpenChange={setMembersPopoverOpen}>
                <PopoverTrigger asChild>
                  <div
                    className="flex items-center cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation()
                      setMembersPopoverOpen(true)
                    }}
                  >
                    <motion.ul className="flex -space-x-2" role="list">
                      {displayedMembers.map((member: any, index: number) => {
                        const org = member.organizations || member
                        const orgName = org?.name || org?.acronym || 'Unknown'
                        const orgLogo = org?.logo
                        const orgAcronym = org?.acronym || orgName.slice(0, 2).toUpperCase()

                        return (
                          <motion.li
                            key={member.id || member.organization_id || index}
                            role="listitem"
                            initial={
                              typeof animationConfig.initial === "function"
                                ? animationConfig.initial(index)
                                : animationConfig.initial
                            }
                            animate={animationConfig.animate}
                            transition={
                              (typeof animationConfig.transition === "function"
                                ? animationConfig.transition(index)
                                : animationConfig.transition) as Transition
                            }
                            className="relative"
                            style={{ zIndex: displayedMembers.length - index }}
                          >
                            <div
                              className={`flex h-9 w-9 items-center justify-center rounded-full border-2 border-white shadow-sm overflow-hidden ${!orgLogo ? getOrgColor(orgName) : 'bg-white'}`}
                            >
                              {orgLogo ? (
                                <img
                                  src={orgLogo}
                                  alt={orgName}
                                  className="h-full w-full object-contain p-0.5"
                                />
                              ) : (
                                <span className="text-[10px] font-semibold text-white">
                                  {orgAcronym}
                                </span>
                              )}
                            </div>
                          </motion.li>
                        )
                      })}
                    </motion.ul>
                    {remainingCount > 0 && (
                      <motion.span
                        initial={{
                          opacity: shouldReduceMotion ? 1 : 0,
                          x: shouldReduceMotion ? 0 : -8,
                        }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={
                          shouldReduceMotion
                            ? { duration: 0 }
                            : { delay: 0.05 * displayedMembers.length, duration: 0.25, ease: "easeOut" }
                        }
                        className="ml-2 text-xs font-medium"
                        style={{ color: colors.coolSteel }}
                      >
                        +{remainingCount}
                      </motion.span>
                    )}
                  </div>
                </PopoverTrigger>
                <PopoverContent
                  className="w-72 p-0"
                  align="start"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-3 border-b">
                    <h4 className="font-semibold text-sm">Group Members</h4>
                    <p className="text-xs text-muted-foreground">{memberCount} organizations</p>
                  </div>
                  <ScrollArea className="h-48">
                    <div className="p-2 space-y-1">
                      {sortedMembers.map((member: any, index: number) => {
                        const org = member.organizations || member
                        const orgName = org?.name || 'Unknown'
                        const orgAcronym = org?.acronym

                        return (
                          <div
                            key={member.id || member.organization_id || index}
                            className="py-1.5 px-2 rounded hover:bg-muted/50 text-xs"
                          >
                            <span>{orgName}</span>
                            {orgAcronym && (
                              <span className="ml-1">({orgAcronym})</span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </ScrollArea>
                </PopoverContent>
              </Popover>
            </div>
          )}

          {/* Tags */}
          {group.tags && group.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {group.tags.slice(0, 3).map((tag, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="text-[10px] px-2 py-0.5"
                  style={{ backgroundColor: colors.paleSlate, color: colors.blueSlate }}
                >
                  {tag}
                </Badge>
              ))}
              {group.tags.length > 3 && (
                <Badge
                  variant="outline"
                  className="text-[10px] px-2 py-0.5"
                  style={{ borderColor: colors.paleSlate, color: colors.coolSteel }}
                >
                  +{group.tags.length - 3}
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Rip Line */}
        <div className="relative flex items-center justify-center my-4">
          <div className="absolute -left-5 h-10 w-10 rounded-full z-20" style={{ backgroundColor: 'white' }} />
          <div className="w-full border-t-2 border-dashed" style={{ borderColor: colors.paleSlate }} />
          <div className="absolute -right-5 h-10 w-10 rounded-full z-20" style={{ backgroundColor: 'white' }} />
        </div>

        {/* Bottom Section - Empty placeholder for consistent card height */}
        <div className="h-6" />
      </div>
    </motion.div>
  )
}
