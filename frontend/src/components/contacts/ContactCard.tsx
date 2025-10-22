'use client';

import React from 'react';
import { Mail, Phone, Building2, Edit2, Trash2, User, Globe, ExternalLink, MailPlus } from 'lucide-react';
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
  position?: string; // Keep for backward compatibility
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
  
  // Generate initials for avatar fallback
  const getInitials = (name: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Combine job title and department
  const jobLine = [contact.jobTitle || contact.position, contact.department].filter(Boolean).join(' • ');
  
  return (
    <div className="relative border border-slate-200 rounded-2xl p-6 hover:shadow-lg transition-all duration-200 bg-white">
      {/* Action buttons - top right corner */}
      <div className="absolute top-4 right-4 flex gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEdit(contact)}
          className="h-8 w-8 p-0 hover:bg-slate-100 rounded-md"
          title="Edit contact"
        >
          <Edit2 className="h-4 w-4 text-slate-500" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => contact.id && onDelete(contact.id)}
          className="h-8 w-8 p-0 hover:bg-red-50 text-red-500 hover:text-red-600 rounded-md"
          title="Delete contact"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Left-aligned layout with avatar on left */}
      <div className="flex items-start gap-4">
        {/* Profile Photo - left side */}
        <div className="w-16 h-16 rounded-full overflow-hidden bg-slate-100 flex-shrink-0">
          {contact.profilePhoto ? (
            <img
              src={contact.profilePhoto}
              alt={fullName}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-slate-100">
              <span className="text-lg font-medium text-slate-500">
                {getInitials(fullName)}
              </span>
            </div>
          )}
        </div>

        {/* Content - right side */}
        <div className="flex-1 min-w-0 space-y-1">
          {/* Line 1: Title, First Name, Last Name */}
          <h3 className="text-lg font-semibold text-slate-900 leading-tight break-words">
            {fullName}
            {contact.isFocalPoint && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="cursor-default">
                      <MailPlus className="h-4 w-4 ml-2 inline text-slate-600" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs border border-gray-200 bg-white shadow-lg">
                    <p className="text-sm text-gray-600 font-normal">This contact is designated as the focal point for this activity</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </h3>

          {/* Line 2: Job Title • Department */}
          {jobLine && (
            <p className="text-sm text-slate-600 break-words">
              {jobLine}
            </p>
          )}

          {/* Line 3: Organization */}
        {contact.organisation && (
          <p className="text-sm text-slate-600 break-words">
            {contact.organisation}
            {contact.organisationAcronym && (
              <span className="text-slate-500 ml-1">({contact.organisationAcronym})</span>
            )}
          </p>
        )}
        </div>
      </div>

      {/* Contact Information */}
      <div className="mt-4 space-y-2">
        {contact.email && (
          <div className="flex items-center space-x-2">
            <Mail className="h-4 w-4 text-slate-400 flex-shrink-0" />
            <a 
              href={`mailto:${contact.email}`} 
              className="text-sm text-slate-700 hover:text-blue-600 transition-colors truncate"
            >
              {contact.email}
            </a>
          </div>
        )}

        {(contact.phone || contact.phoneNumber) && (
          <div className="flex items-center space-x-2">
            <Phone className="h-4 w-4 text-slate-400 flex-shrink-0" />
            <span className="text-sm text-slate-700">
              {contact.countryCode ? `${contact.countryCode} ` : ''}{contact.phoneNumber || contact.phone}
            </span>
          </div>
        )}

        {contact.website && (
          <div className="flex items-center space-x-2">
            <Globe className="h-4 w-4 text-slate-400 flex-shrink-0" />
            <a 
              href={contact.website} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-sm text-slate-700 hover:text-blue-600 transition-colors truncate"
            >
              {contact.website.replace(/^https?:\/\//, '')}
            </a>
          </div>
        )}
      </div>

      {/* Contact Type at bottom */}
      <div className="mt-4">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
          {typeInfo.label}
        </span>
      </div>
    </div>
  );
}

