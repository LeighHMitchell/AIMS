'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  UserSearchableSelect, 
  UserOption 
} from '@/components/ui/user-searchable-select';
import { useUser } from '@/hooks/useUser';
import { useUserRole } from '@/hooks/useUserRole';
import { toast } from 'sonner';
import { 
  UserPlus, 
  HandPlatter, 
  Check, 
  X, 
  Users, 
  Building2,
  AlertCircle,
  Loader2,
  Trash2,
  Clock
} from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { UserAvatar, getInitials } from '@/components/ui/user-avatar';
import { FocalPointHandoffModal } from './FocalPointHandoffModal';
import { 
  FocalPoint, 
  FocalPointType,
  FocalPointsTabProps 
} from '@/types/focal-points';
import {
  getFocalPointPermissions,
  hasPendingHandoff as checkPendingHandoff
} from '@/lib/activity-permissions';
import { apiFetch } from '@/lib/api-fetch';

export default function FocalPointsTab({ 
  activityId, 
  onFocalPointsChange 
}: FocalPointsTabProps) {
  const { user } = useUser();
  const { isSuperUser } = useUserRole();
  
  const [governmentFocalPoints, setGovernmentFocalPoints] = useState<FocalPoint[]>([]);
  const [developmentPartnerFocalPoints, setDevelopmentPartnerFocalPoints] = useState<FocalPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  // Assignment state
  const [selectedUser, setSelectedUser] = useState<UserOption | null>(null);
  
  // Handoff modal state
  const [handoffModalOpen, setHandoffModalOpen] = useState(false);
  const [handoffType, setHandoffType] = useState<FocalPointType>('government_focal_point');
  const [currentFocalPointForHandoff, setCurrentFocalPointForHandoff] = useState<FocalPoint | null>(null);

  // Pre-fill selectedUser with logged-in user on mount for quick self-assignment
  useEffect(() => {
    if (user && !selectedUser) {
      const currentUserAsOption: UserOption = {
        id: user.id,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        email: user.email,
        organizationId: user.organizationId,
        organization: user.organisation || user.organization?.name,
        value: user.id,
        label: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      };
      setSelectedUser(currentUserAsOption);
    }
  }, [user, selectedUser]);

  const allFocalPoints = [...governmentFocalPoints, ...developmentPartnerFocalPoints];
  const permissions = getFocalPointPermissions(user, allFocalPoints);

  const fetchFocalPoints = useCallback(async () => {
    if (!activityId) return;
    
    try {
      setLoading(true);
      const response = await apiFetch(`/api/activities/${activityId}/focal-points`);
      if (!response.ok) throw new Error('Failed to fetch focal points');
      
      const data = await response.json();
      setGovernmentFocalPoints(data.government_focal_points || []);
      setDevelopmentPartnerFocalPoints(data.development_partner_focal_points || []);
    } catch (error) {
      console.error('Error fetching focal points:', error);
      toast.error('Failed to load focal points');
    } finally {
      setLoading(false);
    }
  }, [activityId]);

  useEffect(() => {
    fetchFocalPoints();
  }, [fetchFocalPoints]);

  // Notify parent when focal points change (separate effect to avoid re-fetch loops)
  useEffect(() => {
    if (onFocalPointsChange) {
      onFocalPointsChange([...governmentFocalPoints, ...developmentPartnerFocalPoints]);
    }
  }, [governmentFocalPoints, developmentPartnerFocalPoints, onFocalPointsChange]);

  const handleAssign = async (type: FocalPointType) => {
    if (!selectedUser || !user) {
      toast.error('Please select a user');
      return;
    }

    setActionLoading(`assign-${type}`);
    try {
      const response = await apiFetch(`/api/activities/${activityId}/focal-points`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: selectedUser.id,
          type,
          action: 'assign',
          current_user_id: user.id
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to assign focal point');
      }

      toast.success(`${selectedUser.name} assigned as focal point`);
      setSelectedUser(null);
      fetchFocalPoints();
    } catch (error) {
      console.error('Error assigning focal point:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to assign focal point');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemove = async (focalPoint: FocalPoint) => {
    if (!user) return;
    
    const confirmMessage = focalPoint.email === user.email 
      ? 'Are you sure you want to remove yourself as focal point?'
      : `Are you sure you want to remove ${focalPoint.name} as focal point?`;
    
    if (!confirm(confirmMessage)) return;

    setActionLoading(`remove-${focalPoint.id}`);
    try {
      const response = await apiFetch(`/api/activities/${activityId}/focal-points`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: focalPoint.id,
          type: focalPoint.type,
          action: 'remove',
          current_user_id: user.id
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to remove focal point');
      }

      toast.success('Focal point removed');
      fetchFocalPoints();
    } catch (error) {
      console.error('Error removing focal point:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to remove focal point');
    } finally {
      setActionLoading(null);
    }
  };

  const openHandoffModal = (focalPoint: FocalPoint) => {
    setCurrentFocalPointForHandoff(focalPoint);
    setHandoffType(focalPoint.type);
    setHandoffModalOpen(true);
  };

  const handleHandoffConfirm = async (targetUserId: string) => {
    if (!user || !currentFocalPointForHandoff) return;

    setActionLoading(`handoff-${currentFocalPointForHandoff.id}`);
    try {
      const response = await apiFetch(`/api/activities/${activityId}/focal-points`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: targetUserId,
          type: currentFocalPointForHandoff.type,
          action: 'handoff',
          current_user_id: user.id
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to initiate handoff');
      }

      toast.success('Handoff request sent');
      setHandoffModalOpen(false);
      setCurrentFocalPointForHandoff(null);
      fetchFocalPoints();
    } catch (error) {
      console.error('Error initiating handoff:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to initiate handoff');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAcceptHandoff = async (type: FocalPointType) => {
    if (!user) return;

    setActionLoading(`accept-${type}`);
    try {
      const response = await apiFetch(`/api/activities/${activityId}/focal-points`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          type,
          action: 'accept_handoff',
          current_user_id: user.id
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to accept handoff');
      }

      toast.success('You are now a focal point for this activity');
      fetchFocalPoints();
    } catch (error) {
      console.error('Error accepting handoff:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to accept handoff');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeclineHandoff = async (type: FocalPointType) => {
    if (!user) return;

    setActionLoading(`decline-${type}`);
    try {
      const response = await apiFetch(`/api/activities/${activityId}/focal-points`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          type,
          action: 'decline_handoff',
          current_user_id: user.id
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to decline handoff');
      }

      toast.success('Handoff request declined');
      fetchFocalPoints();
    } catch (error) {
      console.error('Error declining handoff:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to decline handoff');
    } finally {
      setActionLoading(null);
    }
  };

  const isCurrentUserFocalPoint = (focalPoint: FocalPoint) => {
    return user && (focalPoint.email === user.email || focalPoint.user_id === user.id);
  };

  const canRemove = (focalPoint: FocalPoint) => {
    if (!user) return false;
    // Super users can remove anyone, focal points can remove themselves
    return isSuperUser() || isCurrentUserFocalPoint(focalPoint);
  };

  const canHandoff = (focalPoint: FocalPoint) => {
    if (!user) return false;
    // Only the focal point themselves can handoff, and only if status is assigned/accepted
    return isCurrentUserFocalPoint(focalPoint) && 
           (focalPoint.status === 'assigned' || focalPoint.status === 'accepted');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_handoff':
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            <Clock className="h-3 w-3 mr-1" />
            Pending Handoff
          </Badge>
        );
      case 'accepted':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <Check className="h-3 w-3 mr-1" />
            Active
          </Badge>
        );
      case 'assigned':
      default:
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            Assigned
          </Badge>
        );
    }
  };

  // Using getInitials from UserAvatar component

  const renderFocalPointCard = (focalPoint: FocalPoint) => {
    const showHandoffButton = canHandoff(focalPoint);
    const showRemoveButton = canRemove(focalPoint);
    const isLoading = actionLoading?.includes(focalPoint.id);

    return (
      <Card key={focalPoint.id} className="border-slate-200">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              {/* Profile Picture */}
              <UserAvatar
                src={focalPoint.avatar_url}
                seed={focalPoint.id || focalPoint.email || focalPoint.name}
                name={focalPoint.name}
                size="md"
                initials={getInitials(focalPoint.name)}
              />
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <h3 className="font-semibold text-slate-900">{focalPoint.name}</h3>
                  {getStatusBadge(focalPoint.status)}
                  {isCurrentUserFocalPoint(focalPoint) && (
                    <Badge variant="secondary" className="bg-slate-100">
                      You
                    </Badge>
                  )}
                </div>
                
                <p className="text-sm text-slate-600 mb-1">{focalPoint.email}</p>
                
                {focalPoint.job_title && (
                  <p className="text-sm text-slate-500">{focalPoint.job_title}</p>
                )}
                
                {focalPoint.organization && (
                  <p className="text-sm text-slate-500 flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                    {focalPoint.organization.name}
                    {focalPoint.organization.acronym && ` (${focalPoint.organization.acronym})`}
                  </p>
                )}
                
                {focalPoint.organisation && !focalPoint.organization && (
                  <p className="text-sm text-slate-500 flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                    {focalPoint.organisation}
                  </p>
                )}

                <div className="mt-3 text-xs text-slate-400 space-y-1">
                  {focalPoint.assigned_by_name && (
                    <p>Assigned by {focalPoint.assigned_by_name}</p>
                  )}
                  {focalPoint.handed_off_by_name && focalPoint.status !== 'pending_handoff' && (
                    <p>Handed off by {focalPoint.handed_off_by_name}</p>
                  )}
                  {focalPoint.status === 'pending_handoff' && focalPoint.handed_off_by_name && (
                    <p>Handoff initiated by {focalPoint.handed_off_by_name}</p>
                  )}
                </div>
              </div>
            </div>

            {(showHandoffButton || showRemoveButton) && (
              <div className="flex flex-col gap-2 shrink-0">
                {showHandoffButton && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openHandoffModal(focalPoint)}
                    disabled={isLoading}
                  >
                    {isLoading && actionLoading?.startsWith('handoff') ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <HandPlatter className="h-4 w-4 mr-1" />
                    )}
                    Handoff
                  </Button>
                )}
                {showRemoveButton && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleRemove(focalPoint)}
                    disabled={isLoading}
                  >
                    {isLoading && actionLoading?.startsWith('remove') ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4 mr-1" />
                    )}
                    Remove
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderPendingHandoffAlert = (type: FocalPointType) => {
    const pendingHandoff = checkPendingHandoff(user, allFocalPoints, type);
    if (!pendingHandoff) return null;

    const typeLabel = type === 'government_focal_point' 
      ? 'Government Focal Point' 
      : 'Development Partner Focal Point';

    const isLoading = actionLoading === `accept-${type}` || actionLoading === `decline-${type}`;

    return (
      <Card className="border-yellow-200 bg-yellow-50 mb-4">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="shrink-0">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-yellow-800 mb-1">
                Pending {typeLabel} Handoff
              </h3>
              <p className="text-sm text-yellow-700 mb-4">
                {pendingHandoff.handed_off_by_name || 'Someone'} wants to hand off 
                the {typeLabel} role to you for this activity.
              </p>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  onClick={() => handleAcceptHandoff(type)}
                  disabled={isLoading}
                >
                  {actionLoading === `accept-${type}` ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 mr-1" />
                  )}
                  Accept
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleDeclineHandoff(type)}
                  disabled={isLoading}
                >
                  {actionLoading === `decline-${type}` ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <X className="h-4 w-4 mr-1" />
                  )}
                  Decline
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        <span className="ml-2 text-slate-500">Loading focal points...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pending Handoff Alerts */}
      {renderPendingHandoffAlert('government_focal_point')}
      {renderPendingHandoffAlert('development_partner_focal_point')}

      {/* Super User Assignment Section */}
      {permissions.canAssignFocalPoints && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Assign Focal Point
            </CardTitle>
            <CardDescription>
              Search for a user and assign them as a government or development partner focal point.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
              <div>
                <label className="text-sm font-medium mb-2 block">Select User</label>
                <UserSearchableSelect
                  value={selectedUser?.id}
                  selectedUserData={selectedUser}
                  onValueChange={(userId, userData) => {
                    setSelectedUser(userId && userData ? userData : null);
                  }}
                  placeholder="Search for a user..."
                  searchPlaceholder="Type name or email..."
                  className="w-full"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  className="w-full"
                  onClick={() => handleAssign('government_focal_point')}
                  disabled={!selectedUser || actionLoading !== null}
                >
                  {actionLoading === 'assign-government_focal_point' ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Building2 className="h-4 w-4 mr-2" />
                  )}
                  Government Focal Point
                </Button>
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => handleAssign('development_partner_focal_point')}
                  disabled={!selectedUser || actionLoading !== null}
                >
                  {actionLoading === 'assign-development_partner_focal_point' ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Users className="h-4 w-4 mr-2" />
                  )}
                  Development Partner Focal Point
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Focal Points Grid - Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Government Focal Points */}
        <Card className="h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-5 w-5 text-slate-600" />
              Government Focal Points
            </CardTitle>
            <CardDescription className="text-xs">
              Officials responsible for reviewing and endorsing this activity.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {governmentFocalPoints.length === 0 ? (
              <div className="text-sm text-slate-500 py-8 text-center border-2 border-dashed border-slate-200 rounded-lg">
                No government focal points assigned
              </div>
            ) : (
              <div className="space-y-3">
                {governmentFocalPoints.map(fp => renderFocalPointCard(fp))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Development Partner Focal Points */}
        <Card className="h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-5 w-5 text-slate-600" />
              Development Partner Focal Points
            </CardTitle>
            <CardDescription className="text-xs">
              Main contacts responsible for updating and managing the activity information.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {developmentPartnerFocalPoints.length === 0 ? (
              <div className="text-sm text-slate-500 py-8 text-center border-2 border-dashed border-slate-200 rounded-lg">
                No development partner focal points assigned
              </div>
            ) : (
              <div className="space-y-3">
                {developmentPartnerFocalPoints.map(fp => renderFocalPointCard(fp))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Handoff Modal */}
      <FocalPointHandoffModal
        isOpen={handoffModalOpen}
        onClose={() => {
          setHandoffModalOpen(false);
          setCurrentFocalPointForHandoff(null);
        }}
        onConfirm={handleHandoffConfirm}
        currentFocalPointName={currentFocalPointForHandoff?.name || ''}
        type={handoffType}
        activityId={activityId}
      />
    </div>
  );
}

