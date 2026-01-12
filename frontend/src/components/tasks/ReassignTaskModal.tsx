"use client";

import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Check, ArrowRightLeft } from 'lucide-react';
import type { TaskAssignment, TaskUser } from '@/types/task';
import { getTaskUserDisplayName } from '@/types/task';
import { cn } from '@/lib/utils';

interface ReassignTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignment: TaskAssignment;
  userId: string;
  onReassign: (assignmentId: string, newAssigneeId: string, note?: string) => Promise<any>;
  onSuccess?: () => void;
}

export function ReassignTaskModal({
  open,
  onOpenChange,
  assignment,
  userId,
  onReassign,
  onSuccess,
}: ReassignTaskModalProps) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<TaskUser[]>([]);
  const [search, setSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const fetchedRef = useRef(false);

  // Fetch users when modal opens
  useEffect(() => {
    if (!open) {
      // Reset state when modal closes
      setSelectedUserId(null);
      setNote('');
      setSearch('');
      setError(null);
      fetchedRef.current = false;
      return;
    }

    if (fetchedRef.current) return;
    fetchedRef.current = true;

    async function loadUsers() {
      try {
        setLoading(true);
        const response = await fetch(`/api/users/taskable?userId=${userId}`);
        const data = await response.json();

        if (response.ok) {
          // Filter out the current assignee
          const filteredUsers = (data.users || []).filter(
            (u: TaskUser) => u.id !== assignment.assignee_id
          );
          setUsers(filteredUsers);
        } else {
          setError(data.error || 'Failed to load users');
        }
      } catch (err) {
        setError('Failed to load users');
      } finally {
        setLoading(false);
      }
    }

    loadUsers();
  }, [open, userId, assignment.assignee_id]);

  // Filter users by search
  const filteredUsers = search
    ? users.filter(u =>
        getTaskUserDisplayName(u).toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())
      )
    : users;

  const handleSubmit = async () => {
    if (!selectedUserId) return;

    setSubmitting(true);
    setError(null);

    try {
      const result = await onReassign(assignment.id, selectedUserId, note || undefined);
      if (result) {
        onOpenChange(false);
        onSuccess?.();
      } else {
        setError('Failed to reassign task');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reassign task');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedUser = users.find(u => u.id === selectedUserId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            Reassign Task
          </DialogTitle>
          <DialogDescription>
            Select a new person to assign this task to. The current assignee will be notified.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Task Info */}
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="text-sm font-medium">{assignment.task?.title}</div>
            {assignment.task?.description && (
              <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {assignment.task.description}
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Selected User Preview */}
          {selectedUser && (
            <div className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
              <Avatar className="h-10 w-10">
                <AvatarImage src={selectedUser.avatar_url || undefined} />
                <AvatarFallback>
                  {getTaskUserDisplayName(selectedUser).slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="font-medium">{getTaskUserDisplayName(selectedUser)}</div>
                {selectedUser.organization && (
                  <div className="text-xs text-muted-foreground">
                    {selectedUser.organization.name}
                  </div>
                )}
              </div>
              <Check className="h-5 w-5 text-primary" />
            </div>
          )}

          {/* Search */}
          <div className="space-y-2">
            <Label>Select New Assignee</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* User List */}
          <ScrollArea className="h-[200px] border rounded-lg">
            {loading ? (
              <div className="p-4 space-y-2">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                {users.length === 0 ? 'No other users available' : 'No users found'}
              </div>
            ) : (
              <div className="p-2">
                {filteredUsers.map((user) => {
                  const displayName = getTaskUserDisplayName(user);
                  const isSelected = selectedUserId === user.id;

                  return (
                    <div
                      key={user.id}
                      className={cn(
                        'flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors',
                        isSelected ? 'bg-primary/10' : 'hover:bg-muted'
                      )}
                      onClick={() => setSelectedUserId(user.id)}
                    >
                      <div className={cn(
                        'w-4 h-4 border rounded-full flex items-center justify-center',
                        isSelected ? 'bg-primary border-primary' : 'border-gray-300'
                      )}>
                        {isSelected && <Check className="h-3 w-3 text-white" />}
                      </div>
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatar_url || undefined} />
                        <AvatarFallback>
                          {displayName.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{displayName}</div>
                        {user.organization && (
                          <div className="text-xs text-muted-foreground truncate">
                            {user.organization.name}
                            {user.organization.acronym && ` (${user.organization.acronym})`}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {/* Note */}
          <div className="space-y-2">
            <Label htmlFor="note">Note (optional)</Label>
            <Textarea
              id="note"
              placeholder="Add a note about why you're reassigning this task..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!selectedUserId || submitting}>
            {submitting ? 'Reassigning...' : 'Reassign Task'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
