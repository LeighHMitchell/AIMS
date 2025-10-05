'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  MapPin,
  Edit,
  Trash2,
  Copy,
  MoreVertical,
  AlertCircle,
  CheckCircle,
  Map,
  Eye,
  EyeOff,
  Globe,
  Building,
  Home,
  Stethoscope,
  School,
  Car,
  HelpCircle
} from 'lucide-react';
import { toast } from 'sonner';
import {
  type LocationSchema,
  LOCATION_REACH_CODES,
  LOCATION_EXACTNESS_CODES,
  LOCATION_CLASS_CODES,
  SITE_TYPES,
} from '@/lib/schemas/location';

// Map thumbnail component using static tiles with location marker
function MapThumbnail({
  location,
  className = "w-32 h-24"
}: {
  location: LocationSchema;
  className?: string;
}) {
  if (!location.latitude || !location.longitude) {
    return (
      <div className={`${className} bg-gray-100 rounded flex items-center justify-center border border-gray-200`}>
        <MapPin className="h-5 w-5 text-gray-400" />
      </div>
    );
  }

  // Use static tile service for thumbnail with higher zoom to show location detail
  const zoom = 13;
  const x = Math.floor((location.longitude + 180) / 360 * Math.pow(2, zoom));
  const y = Math.floor((1 - Math.log(Math.tan(location.latitude * Math.PI / 180) + 1 / Math.cos(location.latitude * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom));

  return (
    <div className={`${className} bg-gray-100 rounded overflow-hidden relative border border-gray-200`}>
      <img
        src={`https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`}
        alt="Location map"
        className="w-full h-full object-cover"
        onError={(e) => {
          // Fallback to icon if image fails to load
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
          target.nextElementSibling?.classList.remove('hidden');
        }}
      />
      {/* Location marker overlay */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-3 h-3 bg-red-600 rounded-full border-2 border-white shadow-sm"></div>
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-gray-100 hidden">
        <MapPin className="h-5 w-5 text-gray-400" />
      </div>
    </div>
  );
}

// Icon for site type
function SiteTypeIcon({ siteType }: { siteType: string }) {
  const iconClass = "h-4 w-4";

  switch (siteType) {
    case 'office':
      return <Building className={iconClass} />;
    case 'health_facility':
      return <Stethoscope className={iconClass} />;
    case 'school':
      return <School className={iconClass} />;
    case 'warehouse':
      return <Car className={iconClass} />;
    case 'training_center':
      return <School className={iconClass} />;
    case 'community_center':
      return <Home className={iconClass} />;
    default:
      return <MapPin className={iconClass} />;
  }
}


// Badge for location type
function LocationTypeBadge({ type }: { type: string }) {
  return (
    <Badge variant="outline" className="text-xs">
      {type === 'site' ? 'Site' : 'Coverage'}
    </Badge>
  );
}



interface LocationCardProps {
  location: LocationSchema;
  onEdit: (location: LocationSchema) => void;
  onDelete: (locationId: string) => void;
  onDuplicate: (location: LocationSchema) => void;
  canEdit?: boolean;
  isDragging?: boolean;
  dragHandleProps?: any;
}

export default function LocationCard({
  location,
  onEdit,
  onDelete,
  onDuplicate,
  canEdit = true,
  isDragging = false,
  dragHandleProps,
}: LocationCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);

  // Format coordinates for display
  const formatCoordinates = (lat: number, lng: number) => {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  };

  // Format address for display
  const formatAddress = () => {
    const parts = [];
    
    // Add components in order: township, district, city, state/region, postal code, country
    if (location.township_name) parts.push(location.township_name);
    if (location.district_name) parts.push(location.district_name);
    if (location.city) parts.push(location.city);
    if (location.state_region_name) parts.push(location.state_region_name);
    if (location.postal_code) parts.push(location.postal_code);
    if (location.country_code) parts.push(location.country_code);
    
    const formattedAddress = parts.join(', ');
    if (formattedAddress) return formattedAddress;
    
    // Fallback to other address fields
    if (location.address) return location.address;
    if (location.address_line1) return location.address_line1;
    
    return 'No address';
  };

  // Get site type label
  const getSiteTypeLabel = (siteType: string) => {
    return siteType.replace('_', ' ').charAt(0).toUpperCase() + siteType.replace('_', ' ').slice(1);
  };

  // Handle duplicate
  const handleDuplicate = () => {
    const duplicatedLocation: LocationSchema = {
      ...location,
      id: undefined,
      location_name: `${location.location_name} (Copy)`,
      created_at: undefined,
      updated_at: undefined,
    };
    onDuplicate(duplicatedLocation);
    toast.success('Location duplicated');
  };

  return (
    <Card
      className={`transition-all duration-200 hover:shadow-md w-full ${
        isDragging ? 'opacity-50 rotate-2 shadow-lg' : ''
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardContent className="p-5 relative">
        <div className="flex items-start gap-5">
          {/* Map Thumbnail */}
          <MapThumbnail location={location} />

          {/* Location Details */}
          <div className="flex-1 min-w-0 flex flex-col h-full">
            <div className="flex-1 space-y-2">
              {/* 1. Location Name */}
              <div>
                <h4 className="font-semibold text-gray-900 truncate">
                  {location.location_name}
                </h4>
              </div>

              {/* 2. Location Description */}
              {(location.description || location.location_description) && (
                <div className="text-sm text-gray-600">
                  {(() => {
                    const desc = location.description || location.location_description || '';
                    return showFullDescription || desc.length <= 100 ? (
                      <span>
                        {desc}
                        {desc.length > 100 && (
                          <button
                            onClick={() => setShowFullDescription(false)}
                            className="text-blue-600 hover:text-blue-800 ml-1"
                          >
                            Show less
                          </button>
                        )}
                      </span>
                    ) : (
                      <span>
                        {desc.substring(0, 100)}...
                        <button
                          onClick={() => setShowFullDescription(true)}
                          className="text-blue-600 hover:text-blue-800 ml-1"
                        >
                          Show more
                        </button>
                      </span>
                    );
                  })()}
                </div>
              )}

              {/* 3. Activity Description */}
              {location.activity_location_description && (
                <div className="text-sm text-gray-600">
                  {location.activity_location_description}
                </div>
              )}

              {/* 4. Coordinates */}
              {location.latitude && location.longitude && (
                <div className="text-sm text-gray-600 flex items-center gap-1">
                  <MapPin className="h-3 w-3 flex-shrink-0" />
                  <span>{formatCoordinates(location.latitude, location.longitude)}</span>
                </div>
              )}

              {/* 5. Address */}
              <div className="text-sm text-gray-600">
                {formatAddress() === 'No address' ? (
                  <span className="text-gray-400 italic">No address</span>
                ) : (
                  formatAddress()
                )}
              </div>
            </div>

            {/* Action Menu - Bottom Right */}
            {canEdit && (
              <div className="mt-auto pt-2 flex justify-end">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => onEdit(location)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDuplicate}>
                      <Copy className="h-4 w-4 mr-2" />
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onDelete(location.id!)}
                      className="text-red-600 focus:text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
