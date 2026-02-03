/**
 * useTabDataLoader - Lazy loading of tab data for Activity Editor
 *
 * Instead of loading all 16+ API endpoints at once when editing an activity,
 * this hook loads tab data on-demand when the user navigates to a specific tab.
 */

import { useCallback, useRef, useState } from 'react';
import { apiFetch } from '@/lib/api-fetch';
import { requestQueue } from '@/lib/request-queue';
import { supabase } from '@/lib/supabase';

// Tab group definitions - when visiting any tab in a group, load data for all tabs in that group
export const TAB_GROUPS = {
  'activity-overview': ['general', 'sectors', 'humanitarian', 'country-region', 'locations'],
  'stakeholders': ['organisations', 'contacts', 'focal_points', 'linked_activities'],
  'funding-delivery': ['finances', 'planned-disbursements', 'budgets', 'forward-spending-survey', 'results', 'capital-spend', 'financing-terms', 'conditions'],
  'strategic-alignment': ['sdg', 'country-budget', 'tags', 'working-groups', 'policy-markers'],
  'supporting-info': ['documents', 'subnational_breakdown'],
  'administration': ['metadata']
} as const;

// Map of which group a tab belongs to
const TAB_TO_GROUP: Record<string, keyof typeof TAB_GROUPS> = {};
for (const [group, tabs] of Object.entries(TAB_GROUPS)) {
  for (const tab of tabs) {
    TAB_TO_GROUP[tab] = group as keyof typeof TAB_GROUPS;
  }
}

// API endpoints for each data type
interface TabEndpoint {
  url: string;
  supabaseQuery?: {
    table: string;
    select: string;
    filter: { column: string; value: string };
  };
}

/**
 * Get the endpoints needed to load data for a tab group
 */
function getEndpointsForGroup(group: keyof typeof TAB_GROUPS, activityId: string): TabEndpoint[] {
  const endpoints: TabEndpoint[] = [];

  switch (group) {
    case 'activity-overview':
      // Most of this data comes from /basic which is loaded initially
      // Only humanitarian and subnational-breakdown need separate calls
      endpoints.push({ url: `/api/activities/${activityId}/humanitarian` });
      endpoints.push({ url: `/api/activities/${activityId}/subnational-breakdown` });
      break;

    case 'stakeholders':
      endpoints.push({ url: `/api/activities/${activityId}/participating-organizations` });
      endpoints.push({ url: `/api/activities/${activityId}/contacts` });
      endpoints.push({ url: `/api/activities/${activityId}/focal-points` });
      endpoints.push({ url: `/api/activities/${activityId}/linked` });
      break;

    case 'funding-delivery':
      endpoints.push({ url: `/api/activities/${activityId}/transactions` });
      endpoints.push({ url: `/api/activities/${activityId}/planned-disbursements` });
      endpoints.push({ url: `/api/activities/${activityId}/budgets` });
      endpoints.push({ url: `/api/activities/${activityId}/fss` });
      endpoints.push({ url: `/api/activities/${activityId}/results` });
      // Capital spend is in /basic
      // Financing terms and conditions use Supabase
      break;

    case 'strategic-alignment':
      // SDG, tags, working groups, policy markers are in /basic
      endpoints.push({ url: `/api/activities/${activityId}/country-budget-items` });
      break;

    case 'supporting-info':
      endpoints.push({ url: `/api/activities/${activityId}/documents` });
      endpoints.push({ url: `/api/activities/${activityId}/subnational-breakdown` });
      break;

    case 'administration':
      endpoints.push({ url: `/api/activities/${activityId}/metadata` });
      break;
  }

  return endpoints;
}

export interface TabDataLoaderState {
  loadedGroups: Set<string>;
  loadingGroups: Set<string>;
  errors: Map<string, Error>;
}

export interface TabDataLoaderResult {
  isGroupLoaded: (tabId: string) => boolean;
  isGroupLoading: (tabId: string) => boolean;
  loadTabData: (tabId: string) => Promise<TabGroupData | null>;
  getError: (tabId: string) => Error | undefined;
  state: TabDataLoaderState;
}

export interface TabGroupData {
  // Activity Overview
  humanitarian?: { humanitarian: boolean; humanitarian_scopes: any[] };
  subnationalBreakdown?: any[];

  // Stakeholders
  participatingOrganizations?: any[];
  contacts?: any[];
  focalPoints?: { government_focal_points: any[]; development_partner_focal_points: any[] };
  linkedActivities?: any[];

  // Funding & Delivery
  transactions?: any[];
  plannedDisbursements?: any[];
  budgets?: any[];
  fss?: { forecasts: any[] };
  results?: { results: any[] };
  financingTerms?: any;
  loanStatus?: any[];
  conditions?: any[];

  // Strategic Alignment
  countryBudgetItems?: { country_budget_items: any[] };

  // Supporting Info
  documents?: any[];

  // Administration
  metadata?: { metadata: any };
}

interface UseTabDataLoaderOptions {
  activityId: string;
  onDataLoaded?: (group: string, data: TabGroupData) => void;
}

export function useTabDataLoader({ activityId, onDataLoaded }: UseTabDataLoaderOptions): TabDataLoaderResult {
  const [loadedGroups, setLoadedGroups] = useState<Set<string>>(new Set(['activity-overview'])); // Basic data is loaded initially
  const [loadingGroups, setLoadingGroups] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Map<string, Error>>(new Map());
  const loadingPromises = useRef<Map<string, Promise<TabGroupData | null>>>(new Map());

  const isGroupLoaded = useCallback((tabId: string): boolean => {
    const group = TAB_TO_GROUP[tabId];
    return group ? loadedGroups.has(group) : false;
  }, [loadedGroups]);

  const isGroupLoading = useCallback((tabId: string): boolean => {
    const group = TAB_TO_GROUP[tabId];
    return group ? loadingGroups.has(group) : false;
  }, [loadingGroups]);

  const getError = useCallback((tabId: string): Error | undefined => {
    const group = TAB_TO_GROUP[tabId];
    return group ? errors.get(group) : undefined;
  }, [errors]);

  const loadTabData = useCallback(async (tabId: string): Promise<TabGroupData | null> => {
    if (!activityId || activityId === 'NEW') {
      return null;
    }

    const group = TAB_TO_GROUP[tabId];
    if (!group) {
      console.warn(`[TabDataLoader] Unknown tab: ${tabId}`);
      return null;
    }

    // Already loaded
    if (loadedGroups.has(group)) {
      console.log(`[TabDataLoader] Group ${group} already loaded`);
      return null;
    }

    // Already loading - return the existing promise
    if (loadingPromises.current.has(group)) {
      console.log(`[TabDataLoader] Group ${group} already loading, returning existing promise`);
      return loadingPromises.current.get(group)!;
    }

    console.log(`[TabDataLoader] Loading data for group: ${group}`);

    // Mark as loading
    setLoadingGroups(prev => new Set(Array.from(prev).concat([group])));

    const loadPromise = (async () => {
      const endpoints = getEndpointsForGroup(group, activityId);
      const data: TabGroupData = {};

      try {
        // Fetch all endpoints for this group in parallel using the request queue
        const promises = endpoints.map(async (endpoint) => {
          const requestId = `tab-${group}-${endpoint.url}`;
          try {
            const response = await requestQueue.enqueue(
              requestId,
              'LOW',
              async (signal) => {
                const res = await fetch(endpoint.url, { signal });
                return res;
              }
            );
            if (response.ok) {
              return { url: endpoint.url, data: await response.json() };
            }
            return { url: endpoint.url, data: null };
          } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
              console.log(`[TabDataLoader] Request aborted: ${endpoint.url}`);
            }
            return { url: endpoint.url, data: null };
          }
        });

        // Also fetch Supabase data for funding-delivery group
        if (group === 'funding-delivery') {
          // Fetch financing terms
          promises.push(
            (async () => {
              try {
                const { data: financingTermsData } = await supabase
                  .from('activity_financing_terms')
                  .select('id, rate_1, commitment_date')
                  .eq('activity_id', activityId)
                  .maybeSingle();
                return { url: 'supabase:financing_terms', data: financingTermsData };
              } catch {
                return { url: 'supabase:financing_terms', data: null };
              }
            })()
          );

          // Fetch loan status
          promises.push(
            (async () => {
              try {
                const { data: loanStatusData } = await supabase
                  .from('activity_loan_status')
                  .select('id')
                  .eq('activity_id', activityId);
                return { url: 'supabase:loan_status', data: loanStatusData };
              } catch {
                return { url: 'supabase:loan_status', data: null };
              }
            })()
          );

          // Fetch conditions
          promises.push(
            (async () => {
              try {
                const { data: conditionsData } = await supabase
                  .from('activity_conditions')
                  .select('id')
                  .eq('activity_id', activityId);
                return { url: 'supabase:conditions', data: conditionsData };
              } catch {
                return { url: 'supabase:conditions', data: null };
              }
            })()
          );

          // Fetch budget exceptions
          promises.push(
            (async () => {
              try {
                const { data: budgetExceptionsData } = await supabase
                  .from('activity_budget_exceptions')
                  .select('*')
                  .eq('activity_id', activityId)
                  .single();
                return { url: 'supabase:budget_exceptions', data: budgetExceptionsData };
              } catch {
                return { url: 'supabase:budget_exceptions', data: null };
              }
            })()
          );
        }

        const results = await Promise.allSettled(promises);

        // Process results and populate data object
        for (const result of results) {
          if (result.status === 'fulfilled' && result.value.data) {
            const { url, data: responseData } = result.value;

            if (url.includes('/humanitarian')) {
              data.humanitarian = responseData;
            } else if (url.includes('/subnational-breakdown')) {
              data.subnationalBreakdown = responseData;
            } else if (url.includes('/participating-organizations')) {
              data.participatingOrganizations = responseData;
            } else if (url.includes('/contacts')) {
              data.contacts = responseData;
            } else if (url.includes('/focal-points')) {
              data.focalPoints = responseData;
            } else if (url.includes('/linked')) {
              data.linkedActivities = responseData;
            } else if (url.includes('/transactions')) {
              data.transactions = Array.isArray(responseData) ? responseData : (responseData.data || []);
            } else if (url.includes('/planned-disbursements')) {
              data.plannedDisbursements = responseData;
            } else if (url.includes('/budgets')) {
              data.budgets = responseData;
            } else if (url.includes('/fss')) {
              data.fss = responseData;
            } else if (url.includes('/results')) {
              data.results = responseData;
            } else if (url.includes('/country-budget-items')) {
              data.countryBudgetItems = responseData;
            } else if (url.includes('/documents')) {
              data.documents = responseData;
            } else if (url.includes('/metadata')) {
              data.metadata = responseData;
            } else if (url === 'supabase:financing_terms') {
              data.financingTerms = responseData;
            } else if (url === 'supabase:loan_status') {
              data.loanStatus = responseData;
            } else if (url === 'supabase:conditions') {
              data.conditions = responseData;
            }
          }
        }

        console.log(`[TabDataLoader] Loaded data for group ${group}:`, Object.keys(data));

        // Mark as loaded
        setLoadedGroups(prev => new Set(Array.from(prev).concat([group])));
        setErrors(prev => {
          const newErrors = new Map(Array.from(prev));
          newErrors.delete(group);
          return newErrors;
        });

        // Notify caller
        onDataLoaded?.(group, data);

        return data;
      } catch (error) {
        console.error(`[TabDataLoader] Error loading group ${group}:`, error);
        setErrors(prev => {
          const newErrors = new Map(Array.from(prev));
          newErrors.set(group, error instanceof Error ? error : new Error('Unknown error'));
          return newErrors;
        });
        return null;
      } finally {
        setLoadingGroups(prev => {
          const newSet = new Set(prev);
          newSet.delete(group);
          return newSet;
        });
        loadingPromises.current.delete(group);
      }
    })();

    loadingPromises.current.set(group, loadPromise);
    return loadPromise;
  }, [activityId, loadedGroups, onDataLoaded]);

  return {
    isGroupLoaded,
    isGroupLoading,
    loadTabData,
    getError,
    state: {
      loadedGroups,
      loadingGroups,
      errors
    }
  };
}

/**
 * Get the group name for a given tab
 */
export function getTabGroup(tabId: string): string | undefined {
  return TAB_TO_GROUP[tabId];
}

/**
 * Get all tabs in a group
 */
export function getTabsInGroup(group: keyof typeof TAB_GROUPS): readonly string[] {
  return TAB_GROUPS[group];
}
