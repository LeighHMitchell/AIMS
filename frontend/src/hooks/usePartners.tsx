"use client";

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

export interface Partner {
  id: string;
  name: string;
  iatiOrgId?: string;
  fullName?: string;
  acronym?: string;
  countryRepresented?: string;
  organisationType?: string;
  cooperationModality?: "Multilateral" | "Regional" | "External" | "Internal" | "Global" | "Other";
  orgClassification?: "Development Partner" | "Partner Government" | "Civil Society International" | "Civil Society Domestic" | "Private Sector International" | "Private Sector Domestic" | "Other";
  orgClassificationOverride?: boolean;
  description?: string;
  website?: string;
  email?: string;
  phone?: string;
  address?: string;
  logo?: string;
  banner?: string;
  createdAt?: string;
  updatedAt?: string;
  type?: "development_partner" | "bilateral" | "partner_government" | "other";
}

export function usePartners() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPartners = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/partners');
      if (!response.ok) {
        throw new Error('Failed to fetch partners');
      }
      const data = await response.json();
      setPartners(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching partners:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch partners');
      toast.error('Failed to load partners');
    } finally {
      setLoading(false);
    }
  }, []);

  const createPartner = async (partner: Omit<Partner, 'id' | 'createdAt' | 'updatedAt'>, user?: any) => {
    try {
      const response = await fetch('/api/partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...partner, user }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create partner');
      }
      
      const newPartner = await response.json();
      setPartners(prev => [...prev, newPartner]);
      toast.success('Partner created successfully');
      return newPartner;
    } catch (err) {
      console.error('Error creating partner:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to create partner');
      throw err;
    }
  };

  const updatePartner = async (id: string, updates: Partial<Partner>, user?: any) => {
    try {
      console.log('[AIMS DEBUG usePartners] Updating partner:', id);
      console.log('[AIMS DEBUG usePartners] Updates:', updates);
      console.log('[AIMS DEBUG usePartners] User:', user);
      
      const response = await fetch('/api/partners', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates, user }),
      });
      
      console.log('[AIMS DEBUG usePartners] Response status:', response.status);
      
      if (!response.ok) {
        let errorMessage = 'Failed to update partner';
        try {
          const errorData = await response.json();
          console.log('[AIMS DEBUG usePartners] Error response:', errorData);
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (parseError) {
          console.error('[AIMS DEBUG usePartners] Failed to parse error response:', parseError);
        }
        throw new Error(errorMessage);
      }
      
      const updatedPartner = await response.json();
      console.log('[AIMS DEBUG usePartners] Updated partner:', updatedPartner);
      
      setPartners(prev => prev.map(p => p.id === id ? updatedPartner : p));
      toast.success('Partner updated successfully');
      return updatedPartner;
    } catch (err) {
      console.error('[AIMS ERROR usePartners] Error updating partner:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to update partner';
      toast.error(errorMessage);
      throw err;
    }
  };

  const deletePartner = async (id: string) => {
    try {
      const response = await fetch(`/api/partners/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.details || 'Failed to delete partner');
      }
      
      setPartners(prev => prev.filter(p => p.id !== id));
      toast.success('Organization deleted successfully');
    } catch (err) {
      console.error('Error deleting partner:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete organization';
      toast.error(errorMessage);
      throw err;
    }
  };

  useEffect(() => {
    fetchPartners();
  }, [fetchPartners]);

  return {
    partners,
    loading,
    error,
    refetch: fetchPartners,
    createPartner,
    updatePartner,
    deletePartner,
    // Utility functions
    getDevelopmentPartners: () => partners.filter(p => p.type === 'development_partner'),
    getPartnerById: (id: string) => partners.find(p => p.id === id),
    getPartnerByName: (name: string) => partners.find(p => p.name === name),
  };
} 