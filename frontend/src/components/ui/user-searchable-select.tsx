"use client";

import * as React from "react";
import { Search, User, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { apiFetch } from '@/lib/api-fetch';

export interface UserOption {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  organizationId?: string;
  organization?: string;
  value: string;
  label: string;
}

interface UserSearchableSelectProps {
  value?: string;
  onValueChange: (value: string | null, user: UserOption | null) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
  selectedUserData?: UserOption | null; // Allow passing pre-selected user data for display
}

export function UserSearchableSelect({
  value,
  onValueChange,
  placeholder = "Select user...",
  searchPlaceholder = "Search users...",
  disabled = false,
  className,
  selectedUserData,
}: UserSearchableSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [users, setUsers] = React.useState<UserOption[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [query, setQuery] = React.useState("");

  // Use provided selectedUserData if available, otherwise look up from search results
  const selectedUser = selectedUserData || users.find((user) => user.value === value);

  const searchUsers = React.useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setUsers([]);
      return;
    }

    setLoading(true);
    try {
      console.log('[User Search] Searching for:', searchQuery);
      const response = await apiFetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`
      );
      if (response.ok) {
        const data = await response.json();
        console.log('[User Search] Found users:', data.length);
        setUsers(data);
      } else {
        console.error('[User Search] Search failed:', response.statusText);
      }
    } catch (error) {
      console.error("[User Search] Error searching users:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounce search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      searchUsers(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, searchUsers]);

  const handleClear = () => {
    onValueChange(null, null);
    setQuery("");
    setUsers([]);
  };

  return (
    <div className={cn("flex gap-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
              "flex-1"
            )}
          >
            {selectedUser ? (
              <div className="flex items-center gap-2 truncate">
                <User className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{selectedUser.name}</span>
              </div>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
            <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder={searchPlaceholder}
              value={query}
              onValueChange={setQuery}
            />
            <CommandEmpty>
              {loading
                ? "Searching..."
                : query.length < 2
                ? "Type at least 2 characters to search"
                : "No users found."}
            </CommandEmpty>
            <CommandGroup className="max-h-64 overflow-auto">
              {users.map((user) => (
                <CommandItem
                  key={user.value}
                  onSelect={() => {
                    console.log('[User Search] Selected user:', user);
                    onValueChange(user.value, user);
                    setOpen(false);
                  }}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === user.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="font-medium truncate">{user.name}</span>
                    <span className="text-sm text-muted-foreground truncate">
                      {user.email}
                    </span>
                    {user.organization && (
                      <span className="text-xs text-muted-foreground truncate">
                        {user.organization}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
      {value && (
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClear}
          disabled={disabled}
          className="flex-shrink-0"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

