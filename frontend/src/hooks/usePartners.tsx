"use client";

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

export interface Partner {
  id: string;
  name: string;
  code?: string; // Partner code (e.g., MM-FERD-1)
  type: 'development_partner' | 'partner_government' | 'bilateral' | 'other';
  iatiOrgId?: string; // IATI Organisation Identifier
  fullName?: string; // Official full name
  acronym?: string; // Short name/abbreviation
  organisationType?: string; // IATI organisation type code
  description?: string;
  website?: string;
  email?: string;
  phone?: string;
  address?: string;
  logo?: string; // Base64 encoded image
  banner?: string; // Base64 encoded image
  countryRepresented?: string; // Required for bilateral partners
  createdAt: string;
  updatedAt: string;
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
      const response = await fetch('/api/partners', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates, user }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update partner');
      }
      
      const updatedPartner = await response.json();
      setPartners(prev => prev.map(p => p.id === id ? updatedPartner : p));
      toast.success('Partner updated successfully');
      return updatedPartner;
    } catch (err) {
      console.error('Error updating partner:', err);
      toast.error('Failed to update partner');
      throw err;
    }
  };

  const deletePartner = async (id: string) => {
    try {
      const response = await fetch(`/api/partners/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete partner');
      }
      
      setPartners(prev => prev.filter(p => p.id !== id));
      toast.success('Partner deleted successfully');
    } catch (err) {
      console.error('Error deleting partner:', err);
      toast.error('Failed to delete partner');
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