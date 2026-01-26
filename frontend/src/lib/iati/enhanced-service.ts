import { getSupabaseAdmin } from '@/lib/supabase';
import { FIELD_MAPPINGS, mapIatiToAims, validateIatiData } from '@/lib/iati-field-mapper';
import { apiFetch } from '@/lib/api-fetch';

// Enhanced IATI Service with better error handling and caching
export class IATIServiceEnhanced {
  private static instance: IATIServiceEnhanced;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 3600000; // 1 hour in milliseconds
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000; // 1 second

  private constructor(
    private baseUrl: string = process.env.IATI_API_BASE_URL || 'https://api.iatistandard.org/datastore',
    private apiKey?: string
  ) {}

  static getInstance(): IATIServiceEnhanced {
    if (!IATIServiceEnhanced.instance) {
      IATIServiceEnhanced.instance = new IATIServiceEnhanced(
        process.env.IATI_API_BASE_URL,
        process.env.IATI_API_KEY
      );
    }
    return IATIServiceEnhanced.instance;
  }

  // Enhanced fetch with retry logic
  private async fetchWithRetry(url: string, options: RequestInit, retries = 0): Promise<Response> {
    try {
      const response = await fetch(url, options);
      
      if (!response.ok && retries < this.MAX_RETRIES) {
        // Retry on 5xx errors or rate limiting
        if (response.status >= 500 || response.status === 429) {
          await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY * (retries + 1)));
          return this.fetchWithRetry(url, options, retries + 1);
        }
      }
      
      return response;
    } catch (error) {
      if (retries < this.MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY * (retries + 1)));
        return this.fetchWithRetry(url, options, retries + 1);
      }
      throw error;
    }
  }

  // Get activity with caching
  async getActivity(iatiIdentifier: string): Promise<any> {
    // Check cache first
    const cached = this.cache.get(iatiIdentifier);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      console.log('[IATI Service] Returning cached data for:', iatiIdentifier);
      return cached.data;
    }

    const url = `${this.baseUrl}/activity/${encodeURIComponent(iatiIdentifier)}`;
    const headers: HeadersInit = {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };

    if (this.apiKey) {
      headers['Ocp-Apim-Subscription-Key'] = this.apiKey;
    }

    try {
      const response = await this.fetchWithRetry(url, {
        method: 'GET',
        headers,
        next: { revalidate: 3600 }
      });

      if (!response.ok) {
        throw new Error(`IATI API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // Cache successful response
      this.cache.set(iatiIdentifier, {
        data,
        timestamp: Date.now()
      });

      return data;
    } catch (error) {
      console.error('[IATI Service] Error fetching activity:', error);
      throw error;
    }
  }

  // Clear cache for specific identifier or all
  clearCache(iatiIdentifier?: string): void {
    if (iatiIdentifier) {
      this.cache.delete(iatiIdentifier);
    } else {
      this.cache.clear();
    }
  }

  // Validate and normalize IATI data
  normalizeActivity(iatiActivity: any): any {
    // Extract the activity data (handle different response structures)
    const activity = iatiActivity['iati-activity'] || 
                    iatiActivity.response?.['iati-activity'] ||
                    iatiActivity.data?.['iati-activity'] ||
                    iatiActivity;

    // Use field mapper for consistent normalization
    const normalizedData = {
      iati_identifier: this.extractIdentifier(activity),
      title_narrative: this.extractNarrative(activity.title),
      description_narrative: this.extractNarrative(activity.description?.find((d: any) => d['@_type'] === '1')),
      activity_status: activity['activity-status']?.['@_code'] || '',
      activity_date_start_planned: this.extractActivityDate(activity['activity-date'], 'start-planned'),
      activity_date_start_actual: this.extractActivityDate(activity['activity-date'], 'start-actual'),
      activity_date_end_planned: this.extractActivityDate(activity['activity-date'], 'end-planned'),
      activity_date_end_actual: this.extractActivityDate(activity['activity-date'], 'end-actual'),
      sectors: this.normalizeSectors(activity.sector),
      participating_orgs: this.normalizeParticipatingOrgs(activity['participating-org']),
      transactions: this.normalizeTransactions(activity.transaction),
      default_aid_type: activity['default-aid-type']?.['@_code'] || '',
      flow_type: activity['default-flow-type']?.['@_code'] || '',
      collaboration_type: activity['collaboration-type']?.['@_code'] || '',
      default_finance_type: activity['default-finance-type']?.['@_code'] || ''
    };

    // Validate the normalized data
    const validation = validateIatiData(normalizedData);
    if (!validation.isValid) {
      console.warn('[IATI Service] Data validation warnings:', validation);
    }

    return normalizedData;
  }

  // Enhanced narrative extraction with language support
  private extractNarrative(narrativeObj: any, lang = 'en'): string {
    if (!narrativeObj) return '';
    if (typeof narrativeObj === 'string') return narrativeObj;
    
    if (Array.isArray(narrativeObj)) {
      // Try to find narrative in preferred language
      const preferred = narrativeObj.find(n => n['@_xml:lang'] === lang);
      if (preferred) return preferred.narrative || preferred['#text'] || '';
      
      // Fallback to first narrative
      return narrativeObj[0]?.narrative || narrativeObj[0]?.['#text'] || narrativeObj[0] || '';
    }
    
    if (narrativeObj.narrative) {
      return Array.isArray(narrativeObj.narrative) 
        ? narrativeObj.narrative[0] 
        : narrativeObj.narrative;
    }
    
    return narrativeObj['#text'] || '';
  }

  // Extract IATI identifier with fallbacks
  private extractIdentifier(activity: any): string {
    return activity['iati-identifier']?.['#text'] || 
           activity['iati-identifier'] || 
           activity.identifier || 
           '';
  }

  // Extract activity date with validation
  private extractActivityDate(activityDates: any[], dateType: string): string | null {
    if (!Array.isArray(activityDates)) return null;
    
    const dateTypeMap: Record<string, string> = {
      'start-planned': '1',
      'start-actual': '2',
      'end-planned': '3',
      'end-actual': '4'
    };
    
    const date = activityDates.find(d => d['@_type'] === dateTypeMap[dateType]);
    const isoDate = date?.['@_iso-date'];
    
    // Validate date format
    if (isoDate && /^\d{4}-\d{2}-\d{2}/.test(isoDate)) {
      return isoDate.split('T')[0]; // Return date part only
    }
    
    return null;
  }

  // Normalize sectors with vocabulary support
  private normalizeSectors(sectors: any): any[] {
    if (!sectors) return [];
    const sectorArray = Array.isArray(sectors) ? sectors : [sectors];
    
    return sectorArray.map(sector => ({
      code: sector['@_code'] || '',
      vocabulary: sector['@_vocabulary'] || '1', // Default to DAC
      vocabulary_uri: sector['@_vocabulary-uri'] || '',
      percentage: parseFloat(sector['@_percentage'] || '0'),
      name: this.extractNarrative(sector.narrative || sector)
    })).filter(s => s.code); // Remove sectors without codes
  }

  // Normalize participating organizations
  private normalizeParticipatingOrgs(participatingOrgs: any): any[] {
    if (!participatingOrgs) return [];
    const orgs = Array.isArray(participatingOrgs) ? participatingOrgs : [participatingOrgs];
    
    return orgs.map(org => ({
      ref: org['@_ref'] || '',
      name: this.extractNarrative(org.narrative || org),
      role: org['@_role'] || '',
      type: org['@_type'] || '',
      activity_id: org['@_activity-id'] || '',
      roleLabel: this.getOrgRoleLabel(org['@_role'])
    })).filter(o => o.ref || o.name); // Must have ref or name
  }

  private getOrgRoleLabel(role: string): string {
    const roleMap: Record<string, string> = {
      '1': 'Funding',
      '2': 'Accountable',
      '3': 'Extending',
      '4': 'Implementing'
    };
    return roleMap[role] || 'Other';
  }

  // Enhanced transaction normalization with validation
  private normalizeTransactions(transactions: any): any[] {
    if (!transactions) return [];
    const transArray = Array.isArray(transactions) ? transactions : [transactions];
    
    return transArray
      .map(transaction => ({
        type: transaction['transaction-type']?.['@_code'] || '',
        date: transaction['transaction-date']?.['@_iso-date'] || '',
        value: parseFloat(transaction.value?.['#text'] || transaction.value || '0'),
        currency: transaction.value?.['@_currency'] || 'USD',
        valueDate: transaction.value?.['@_value-date'] || '',
        description: this.extractNarrative(transaction.description),
        providerOrg: {
          ref: transaction['provider-org']?.['@_ref'] || '',
          provider_activity_id: transaction['provider-org']?.['@_provider-activity-id'] || '',
          name: this.extractNarrative(transaction['provider-org'])
        },
        receiverOrg: {
          ref: transaction['receiver-org']?.['@_ref'] || '',
          receiver_activity_id: transaction['receiver-org']?.['@_receiver-activity-id'] || '',
          name: this.extractNarrative(transaction['receiver-org'])
        },
        aidType: transaction['aid-type']?.['@_code'] || '',
        financeType: transaction['finance-type']?.['@_code'] || '',
        tiedStatus: transaction['tied-status']?.['@_code'] || '',
        flowType: transaction['flow-type']?.['@_code'] || '',
        disbursementChannel: transaction['disbursement-channel']?.['@_code'] || '',
        // Additional fields
        humanitarian: transaction['@_humanitarian'] === '1',
        ref: transaction['@_ref'] || ''
      }))
      .filter(t => t.type && t.date && t.value > 0); // Basic validation
  }
}

// Transaction duplicate detection service
export class TransactionDuplicateDetector {
  // Generate a unique signature for a transaction
  static generateSignature(transaction: any): string {
    // Use multiple fields to create a more robust signature
    const parts = [
      transaction.transaction_type || transaction.type,
      transaction.transaction_date || transaction.date,
      transaction.value,
      transaction.currency || 'USD',
      transaction.provider_org_ref || transaction.providerOrg?.ref || '',
      transaction.receiver_org_ref || transaction.receiverOrg?.ref || ''
    ];
    
    return parts.join('|');
  }

  // Check if transactions are likely duplicates
  static isDuplicate(trans1: any, trans2: any, strictMode = false): boolean {
    // Quick check using signatures
    if (this.generateSignature(trans1) === this.generateSignature(trans2)) {
      return true;
    }

    if (!strictMode) {
      // Fuzzy matching for potential duplicates
      const sameType = trans1.transaction_type === trans2.transaction_type;
      const sameValue = Math.abs(trans1.value - trans2.value) < 0.01;
      const sameCurrency = (trans1.currency || 'USD') === (trans2.currency || 'USD');
      
      // Check if dates are within 7 days of each other
      const date1 = new Date(trans1.transaction_date);
      const date2 = new Date(trans2.transaction_date);
      const daysDiff = Math.abs(date1.getTime() - date2.getTime()) / (1000 * 60 * 60 * 24);
      const similarDate = daysDiff <= 7;

      return sameType && sameValue && sameCurrency && similarDate;
    }

    return false;
  }

  // Find duplicates in a set of transactions
  static findDuplicates(transactions: any[]): Map<string, any[]> {
    const duplicateGroups = new Map<string, any[]>();
    
    for (let i = 0; i < transactions.length; i++) {
      for (let j = i + 1; j < transactions.length; j++) {
        if (this.isDuplicate(transactions[i], transactions[j])) {
          const signature = this.generateSignature(transactions[i]);
          if (!duplicateGroups.has(signature)) {
            duplicateGroups.set(signature, [transactions[i]]);
          }
          duplicateGroups.get(signature)!.push(transactions[j]);
        }
      }
    }

    return duplicateGroups;
  }
}

// Auto-sync scheduler service
export class IATIAutoSyncService {
  static async getActivitiesForSync(): Promise<any[]> {
    const supabase = getSupabaseAdmin();
    
    // Get activities that need syncing
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const { data: activities, error } = await supabase
      .from('activities')
      .select('id, iati_id, auto_sync, last_sync_time, auto_sync_fields')
      .eq('auto_sync', true)
      .or(`last_sync_time.is.null,last_sync_time.lt.${twentyFourHoursAgo.toISOString()}`);

    if (error) {
      console.error('[Auto Sync] Error fetching activities:', error);
      return [];
    }

    return activities || [];
  }

  static async syncActivity(activityId: string, autoSyncFields: string[]): Promise<boolean> {
    try {
      // Use the compare endpoint to get IATI data
      const compareResponse = await apiFetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/activities/${activityId}/compare-iati`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        }
      );

      if (!compareResponse.ok) {
        throw new Error('Failed to compare with IATI');
      }

      const compareData = await compareResponse.json();
      
      if (!compareData.iati_data) {
        console.log(`[Auto Sync] No IATI data found for activity ${activityId}`);
        return false;
      }

      // Import only the specified fields
      const fields = autoSyncFields.reduce((acc, field) => {
        acc[field] = true;
        return acc;
      }, {} as Record<string, boolean>);

      const importResponse = await apiFetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/activities/${activityId}/import-iati`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fields,
            iati_data: compareData.iati_data
          })
        }
      );

      return importResponse.ok;
    } catch (error) {
      console.error(`[Auto Sync] Error syncing activity ${activityId}:`, error);
      return false;
    }
  }
} 