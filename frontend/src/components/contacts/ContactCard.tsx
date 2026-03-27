'use client';

import React from 'react';
import { Mail, Phone, Building2, Pencil, Trash2, Globe, MailPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getContactTypeIcon, validateIatiContactType } from '@/lib/contact-utils';

interface Contact {
  id?: string;
  type: string;
  title?: string;
  firstName: string;
  lastName: string;
  jobTitle?: string;
  position?: string;
  department?: string;
  organisation?: string;
  organisationId?: string;
  organisationAcronym?: string;
  email?: string;
  phone?: string;
  phoneNumber?: string;
  countryCode?: string;
  website?: string;
  mailingAddress?: string;
  profilePhoto?: string;
  isFocalPoint?: boolean;
  importedFromIati?: boolean;
}

interface ContactCardProps {
  contact: Contact;
  onEdit: (contact: Contact) => void;
  onDelete: (contactId: string) => void;
}

export default function ContactCard({ contact, onEdit, onDelete }: ContactCardProps) {
  const typeInfo = validateIatiContactType(contact.type);
  const fullName = `${contact.title ? contact.title + ' ' : ''}${contact.firstName} ${contact.lastName}`.trim();

  const getInitials = (name: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const jobLine = [contact.jobTitle || contact.position, contact.department].filter(Boolean).join(' • ');

  return (
    <div className="relative border rounded-3xl p-6 hover:shadow-xl transition-shadow duration-300 bg-card group">
      {/* Action buttons */}
      <div className="absolute top-4 right-4 flex gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEdit(contact)}
          className="h-8 w-8 p-0 hover:bg-muted rounded-md"
          title="Edit contact"
        >
          <Pencil className="h-4 w-4 text-muted-foreground" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => contact.id && onDelete(contact.id)}
          className="h-8 w-8 p-0 hover:bg-red-50 text-red-500 hover:text-red-600 rounded-md"
          title="Delete contact"
        >
          <Trash2 className="h-4 w-4 text-red-500" />
        </Button>
      </div>

      {/* Layout with avatar */}
      <div className="flex items-start gap-4">
        <div className="w-16 h-16 rounded-full overflow-hidden bg-muted flex-shrink-0">
          {contact.profilePhoto ? (
            <img
              src={contact.profilePhoto}
              alt={fullName}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted">
              <span className="text-lg font-medium text-muted-foreground">
                {getInitials(fullName)}
              </span>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 space-y-1">
          <h3 className="text-lg font-semibold text-foreground leading-tight break-words">
            {fullName}
            {contact.isFocalPoint && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="cursor-default">
                      <MailPlus className="h-4 w-4 ml-2 inline text-muted-foreground" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-sm font-normal">This contact is designated as the focal point for this activity</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </h3>

          {jobLine && (
            <p className="text-sm text-muted-foreground break-words">
              {jobLine}
            </p>
          )}

          {contact.organisation && (
            <p className="text-sm text-muted-foreground break-words">
              {contact.organisation}
              {contact.organisationAcronym && (
                <span className="ml-1">({contact.organisationAcronym})</span>
              )}
            </p>
          )}
        </div>
      </div>

      {/* Contact Information */}
      <div className="mt-4 space-y-2">
        {contact.email && (
          <div className="flex items-center space-x-2">
            <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <a
              href={`mailto:${contact.email}`}
              className="text-sm text-foreground hover:text-primary transition-colors truncate"
            >
              {contact.email}
            </a>
          </div>
        )}

        {(contact.phone || contact.phoneNumber) && (
          <div className="flex items-center space-x-2">
            <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="text-sm text-foreground">
              {contact.countryCode ? `${contact.countryCode} ` : ''}{contact.phoneNumber || contact.phone}
            </span>
          </div>
        )}

        {contact.website && (
          <div className="flex items-center space-x-2">
            <Globe className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <a
              href={contact.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-foreground hover:text-primary transition-colors truncate"
            >
              {contact.website.replace(/^https?:\/\//, '')}
            </a>
          </div>
        )}
      </div>

      {/* Contact Type */}
      <div className="mt-4">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
          {typeInfo.label}
        </span>
      </div>
    </div>
  );
}
