"use client";

import React from "react";
import { ChevronsUpDown, Check, Search, X, User, Plus } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Contact {
  id?: string;
  title?: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  email?: string;
  secondaryEmail?: string;
  position?: string;
  organisation?: string;
  organisationId?: string;
  organisationName?: string;
  phone?: string;
  countryCode?: string;
  phoneNumber?: string;
  faxCountryCode?: string;
  faxNumber?: string;
  notes?: string;
  type?: string;
  source?: 'user' | 'activity_contact';
  avatar_url?: string;
}

interface ContactDropdownProps {
  existingContacts: Contact[];
  onSelectContact: (contact: Contact) => void;
  onCreateNew: () => void;
  placeholder?: string;
  className?: string;
}

export function ContactDropdown({
  existingContacts,
  onSelectContact,
  onCreateNew,
  placeholder = "Select existing contact or create new...",
  className,
}: ContactDropdownProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [contacts, setContacts] = React.useState<Contact[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = React.useState(false);
  const searchTimeoutRef = React.useRef<NodeJS.Timeout>();

  const fetchContacts = async (search: string = '') => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      
      const response = await fetch(`/api/rolodex?${params}`);
      if (response.ok) {
        const data = await response.json();
        // Transform the data to match our Contact interface
        const transformedContacts: Contact[] = data.people.map((person: any) => ({
          id: person.id,
          title: person.title,
          firstName: person.first_name,
          middleName: person.middle_name,
          lastName: person.last_name,
          email: person.email,
          secondaryEmail: person.secondary_email,
          position: person.position || person.job_title,
          organisation: person.organisation || person.organization_name,
          organisationId: person.organisation_id || person.organization_id,
          organisationName: person.organisation || person.organization_name,
          phone: person.phone,
          countryCode: person.country_code || "+95",
          phoneNumber: person.phone_number,
          faxCountryCode: person.fax_country_code || "+95",
          faxNumber: person.fax_number,
          notes: person.notes,
          type: person.type || "1",
          source: person.source,
          avatar_url: person.profile_photo || person.avatar_url
        }));
        
        // Filter out contacts that are already added
        const existingIds = existingContacts.map(c => c.email);
        const availableContacts = transformedContacts.filter(
          contact => contact.email && !existingIds.includes(contact.email)
        );
        
        setContacts(availableContacts);
      } else {
        console.error('Failed to fetch contacts');
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
      toast.error('Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };

  // Initial load when dropdown opens
  React.useEffect(() => {
    if (open && !hasInitiallyLoaded) {
      fetchContacts('');
      setHasInitiallyLoaded(true);
    }
  }, [open, hasInitiallyLoaded]);

  // Debounced search
  React.useEffect(() => {
    if (hasInitiallyLoaded && searchQuery) {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      
      searchTimeoutRef.current = setTimeout(() => {
        fetchContacts(searchQuery);
      }, 300);
    }
    
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, hasInitiallyLoaded]);

  const handleSelectContact = (contact: Contact) => {
    // Ensure all fields are properly passed, including avatar_url
    const contactWithAllFields = {
      ...contact,
      profilePhoto: contact.avatar_url, // Also pass as profilePhoto for compatibility
    };
    onSelectContact(contactWithAllFields);
    setOpen(false);
    setSearchQuery("");
  };

  const getContactDisplay = (contact: Contact) => {
    const name = `${contact.title || ''} ${contact.firstName} ${contact.middleName || ''} ${contact.lastName}`.trim();
    return name;
  };

  const filteredContacts = React.useMemo(() => {
    if (!searchQuery) return contacts;
    
    const query = searchQuery.toLowerCase();
    return contacts.filter(contact => {
      const fullName = getContactDisplay(contact).toLowerCase();
      const email = contact.email?.toLowerCase() || '';
      const org = contact.organisationName?.toLowerCase() || '';
      const position = contact.position?.toLowerCase() || '';
      
      return fullName.includes(query) || 
             email.includes(query) || 
             org.includes(query) ||
             position.includes(query);
    });
  }, [contacts, searchQuery]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        role="combobox"
        aria-expanded={open}
        className={cn("w-full justify-between border border-input bg-background px-3 py-2 text-sm ring-offset-background rounded-md hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 flex items-center", className)}
      >
        <span className="truncate">
          {placeholder}
        </span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" sideOffset={5} align="start">
        <div className="flex flex-col">
          {/* Search Input */}
          <div className="flex items-center border-b px-3 py-2">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <input
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex h-9 w-full rounded-md bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          
          {/* Content Area */}
          <ScrollArea className="h-[300px]">
            <div className="p-1">
              {/* Create New Contact Button */}
              <button
                onClick={() => {
                  setOpen(false);
                  onCreateNew();
                }}
                className="w-full flex items-center gap-2 rounded-sm px-2 py-3 text-sm outline-none text-blue-600 hover:bg-blue-50 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span className="font-medium">Create New Contact</span>
              </button>

              {/* Loading State */}
              {loading && !hasInitiallyLoaded && (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  Loading contacts...
                </div>
              )}

              {/* No Results */}
              {!loading && filteredContacts.length === 0 && searchQuery && (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  No contacts found
                </div>
              )}

              {/* Contact List */}
              {!loading && filteredContacts.length > 0 && (
                <>
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                    Existing Contacts
                  </div>
                  {filteredContacts.map((contact) => (
                    <button
                      key={contact.id || contact.email}
                      onClick={() => handleSelectContact(contact)}
                      className="w-full flex items-start gap-3 rounded-sm px-2 py-3 text-sm outline-none hover:bg-accent transition-colors"
                    >
                      <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                        {contact.avatar_url ? (
                          <img
                            src={contact.avatar_url}
                            alt={getContactDisplay(contact)}
                            className="h-8 w-8 rounded-full object-cover"
                          />
                        ) : (
                          <User className="h-4 w-4 text-gray-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <div className="font-medium text-sm">
                          {getContactDisplay(contact)}
                        </div>
                        {contact.position && (
                          <div className="text-xs text-gray-600">
                            {contact.position}
                          </div>
                        )}
                        {contact.organisationName && (
                          <div className="text-xs text-gray-600">
                            {contact.organisationName}
                          </div>
                        )}
                        {contact.email && (
                          <div className="text-xs text-gray-500">
                            {contact.email}
                          </div>
                        )}
                      </div>
                      {contact.source === 'user' && (
                        <Badge variant="outline" className="text-xs">
                          System User
                        </Badge>
                      )}
                    </button>
                  ))}
                </>
              )}
            </div>
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
}