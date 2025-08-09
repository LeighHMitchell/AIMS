"use client";

import React from "react";
import { ChevronsUpDown, Check, Search, X, User } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// User Avatar Component
const UserAvatar = ({ user, size = "sm" }: { user: User; size?: "xs" | "sm" | "md" }) => {
  const sizeClasses = {
    xs: "h-6 w-6 text-xs",
    sm: "h-8 w-8 text-sm", 
    md: "h-10 w-10 text-base"
  };

  if (user.avatar_url) {
    return (
      <img
        src={user.avatar_url}
        alt={`${user.name} avatar`}
        className={cn("rounded-full object-cover", sizeClasses[size])}
      />
    );
  }

  // Fallback to initials
  const initials = user.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className={cn(
      "rounded-full bg-gray-200 flex items-center justify-center font-medium text-gray-600",
      sizeClasses[size]
    )}>
      {initials || <User className="h-4 w-4" />}
    </div>
  );
};

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  organisation?: string;
  job_title?: string;
  avatar_url?: string;
  phone?: string;
  website?: string;
  bio?: string;
}

interface FocalPointDropdownProps {
  activityId: string;
  type: 'government_focal_point' | 'development_partner_focal_point';
  currentAssignments: any[];
  onAssignmentChange: () => void;
  placeholder?: string;
  className?: string;
}

export function FocalPointDropdown({
  activityId,
  type,
  currentAssignments,
  onAssignmentChange,
  placeholder = "Select focal point...",
  className,
}: FocalPointDropdownProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [users, setUsers] = React.useState<User[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [assigning, setAssigning] = React.useState<string | null>(null);

  const fetchUsers = async (search: string = '') => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      
      const response = await fetch(`/api/users/list?${params}`);
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      } else {
        console.error('Failed to fetch users');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (open) {
      fetchUsers(searchQuery);
    }
  }, [searchQuery, open]);

  const handleAssignUser = async (user: User) => {
    try {
      setAssigning(user.id);
      
      const response = await fetch(`/api/activities/${activityId}/focal-points`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user.id,
          type: type,
          action: 'assign'
        }),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success(`${user.name} assigned as focal point`);
        onAssignmentChange();
        setOpen(false);
        setSearchQuery("");
      } else {
        toast.error(result.error || 'Failed to assign user');
      }
    } catch (error) {
      console.error('Error assigning user:', error);
      toast.error('Failed to assign user');
    } finally {
      setAssigning(null);
    }
  };

  const handleRemoveUser = async (userId: string, userName: string) => {
    try {
      const response = await fetch(`/api/activities/${activityId}/focal-points`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          type: type,
          action: 'remove'
        }),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success(`${userName} removed from focal points`);
        onAssignmentChange();
      } else {
        toast.error(result.error || 'Failed to remove user');
      }
    } catch (error) {
      console.error('Error removing user:', error);
      toast.error('Failed to remove user');
    }
  };

  // Filter out already assigned users
  const assignedUserIds = currentAssignments.map(a => a.user_id);
  const availableUsers = users.filter(user => !assignedUserIds.includes(user.id));

  const filteredUsers = React.useMemo(() => {
    if (!searchQuery) return availableUsers;
    
    const query = searchQuery.toLowerCase();
    return availableUsers.filter(user => 
      user.name.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query) ||
      user.role.toLowerCase().includes(query)
    );
  }, [availableUsers, searchQuery]);

  return (
    <div className={cn("space-y-3", className)}>
      {/* Current Assignments */}
      {currentAssignments.length > 0 && (
        <div className="space-y-2">
          {currentAssignments.map((assignment, index) => (
            <div
              key={assignment.id || index}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-md border"
            >
              <UserAvatar user={assignment} size="sm" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">{assignment.name}</span>
                </div>

                {assignment.organisation && (
                  <div className="text-xs text-muted-foreground">{assignment.organisation}</div>
                )}
                {assignment.job_title && (
                  <div className="text-xs text-muted-foreground font-medium">{assignment.job_title}</div>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleRemoveUser(assignment.user_id, assignment.name)}
                className="h-6 w-6 rounded-full hover:bg-red-100 flex items-center justify-center transition-colors text-red-600 hover:text-red-700"
                aria-label="Remove focal point"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add New Focal Point Dropdown */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 hover:bg-accent/50 transition-colors",
            "text-muted-foreground"
          )}
        >
          <span className="truncate">{placeholder}</span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </PopoverTrigger>
        <PopoverContent 
          className="w-[var(--radix-popover-trigger-width)] min-w-[400px] p-0 shadow-lg border"
          align="start"
          sideOffset={4}
        >
          <Command>
            <div className="flex items-center border-b px-3 py-2">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setOpen(false);
                    setSearchQuery("");
                  }
                }}
                className="flex h-9 w-full rounded-md bg-transparent py-2 px-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 border-none focus:ring-0 focus:border-none"
                autoFocus
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="ml-2 h-4 w-4 rounded-full hover:bg-muted-foreground/20 flex items-center justify-center transition-colors"
                  aria-label="Clear search"
                >
                  <span className="text-xs">×</span>
                </button>
              )}
            </div>
            <CommandList>
              {loading ? (
                <div className="py-8 text-center">
                  <div className="text-sm text-muted-foreground">Loading users...</div>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="py-8 text-center">
                  <div className="text-sm text-muted-foreground">
                    {searchQuery ? 'No users found matching your search' : 'No available users'}
                  </div>
                  {searchQuery && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Try adjusting your search terms
                    </div>
                  )}
                </div>
              ) : (
                <CommandGroup>
                  {filteredUsers.map((user) => (
                    <CommandItem
                      key={user.id}
                      onSelect={() => handleAssignUser(user)}
                      className="cursor-pointer py-3 hover:bg-accent/50 focus:bg-accent data-[selected]:bg-accent transition-colors"
                    >
                      <Check className="mr-2 h-4 w-4 opacity-0" />
                      <UserAvatar user={user} size="sm" />
                      <div className="flex-1 ml-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">{user.name}</span>
                        </div>

                        {user.organisation && (
                          <div className="text-xs text-muted-foreground">
                            {user.organisation}
                          </div>
                        )}
                        {user.job_title && (
                          <div className="text-xs text-muted-foreground font-medium">
                            {user.job_title}
                          </div>
                        )}
                      </div>
                      {assigning === user.id && (
                        <div className="w-4 h-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600 ml-2" />
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
