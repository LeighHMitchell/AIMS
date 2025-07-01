// IATI XML Generator with Related Activities support
import { getSupabaseAdmin } from './supabase';

interface RelatedActivity {
  relationship_type: '1' | '2' | '3' | '4' | '5';
  iati_identifier: string;
}

export class IATIXMLGenerator {
  private doc: Document;
  private iatiActivities: Element;
  private errors: string[] = [];

  constructor() {
    try {
      // Create XML document
      this.doc = new DOMParser().parseFromString(
        '<?xml version="1.0" encoding="UTF-8"?><iati-activities></iati-activities>',
        'text/xml'
      );
      
      // Check for parsing errors
      const parserError = this.doc.querySelector('parsererror');
      if (parserError) {
        throw new Error('Failed to initialize XML document');
      }
      
      this.iatiActivities = this.doc.documentElement;
      
      // Set IATI attributes
      this.iatiActivities.setAttribute('version', '2.03');
      this.iatiActivities.setAttribute('generated-datetime', new Date().toISOString());
      this.iatiActivities.setAttribute('linked', 'true');
      this.iatiActivities.setAttribute('xmlns:xsi', 'http://www.w3.org/2001/XMLSchema-instance');
      this.iatiActivities.setAttribute('xsi:noNamespaceSchemaLocation', 'http://iatistandard.org/203/schema/downloads/iati-activities-schema.xsd');
    } catch (error) {
      console.error('Error initializing IATI XML Generator:', error);
      throw error;
    }
  }
  
  getErrors(): string[] {
    return this.errors;
  }

  // Add an activity to the XML
  async addActivity(activityData: any) {
    const activity = this.doc.createElement('iati-activity');
    
    // Set activity attributes
    activity.setAttribute('last-updated-datetime', activityData.updated_at || new Date().toISOString());
    activity.setAttribute('xml:lang', 'en');
    activity.setAttribute('default-currency', activityData.default_currency || 'USD');
    
    // Add IATI identifier
    if (activityData.iati_id) {
      const iatiIdentifier = this.doc.createElement('iati-identifier');
      iatiIdentifier.textContent = activityData.iati_id;
      activity.appendChild(iatiIdentifier);
    }
    
    // Add title
    if (activityData.title) {
      const title = this.doc.createElement('title');
      const narrative = this.doc.createElement('narrative');
      narrative.textContent = activityData.title;
      title.appendChild(narrative);
      activity.appendChild(title);
    }
    
    // Add description
    if (activityData.description) {
      const description = this.doc.createElement('description');
      description.setAttribute('type', '1'); // General description
      const narrative = this.doc.createElement('narrative');
      narrative.textContent = activityData.description;
      description.appendChild(narrative);
      activity.appendChild(description);
    }
    
    // Add objectives
    if (activityData.objectives) {
      const description = this.doc.createElement('description');
      description.setAttribute('type', '2'); // Objectives
      const narrative = this.doc.createElement('narrative');
      narrative.textContent = activityData.objectives;
      description.appendChild(narrative);
      activity.appendChild(description);
    }
    
    // Add target groups
    if (activityData.target_groups) {
      const description = this.doc.createElement('description');
      description.setAttribute('type', '3'); // Target groups
      const narrative = this.doc.createElement('narrative');
      narrative.textContent = activityData.target_groups;
      description.appendChild(narrative);
      activity.appendChild(description);
    }
    
    // Add activity status
    if (activityData.activity_status) {
      const activityStatus = this.doc.createElement('activity-status');
      const statusMap: Record<string, string> = {
        'pipeline': '1',
        'identification': '1',
        'implementation': '2',
        'finalisation': '3',
        'completion': '3',
        'closed': '4',
        'cancelled': '5',
        'suspended': '6'
      };
      activityStatus.setAttribute('code', statusMap[activityData.activity_status] || '2');
      activity.appendChild(activityStatus);
    }
    
    // Add activity dates
    if (activityData.planned_start_date) {
      const activityDate = this.doc.createElement('activity-date');
      activityDate.setAttribute('type', '1'); // Planned start
      activityDate.setAttribute('iso-date', activityData.planned_start_date);
      activity.appendChild(activityDate);
    }
    
    if (activityData.actual_start_date) {
      const activityDate = this.doc.createElement('activity-date');
      activityDate.setAttribute('type', '2'); // Actual start
      activityDate.setAttribute('iso-date', activityData.actual_start_date);
      activity.appendChild(activityDate);
    }
    
    if (activityData.planned_end_date) {
      const activityDate = this.doc.createElement('activity-date');
      activityDate.setAttribute('type', '3'); // Planned end
      activityDate.setAttribute('iso-date', activityData.planned_end_date);
      activity.appendChild(activityDate);
    }
    
    if (activityData.actual_end_date) {
      const activityDate = this.doc.createElement('activity-date');
      activityDate.setAttribute('type', '4'); // Actual end
      activityDate.setAttribute('iso-date', activityData.actual_end_date);
      activity.appendChild(activityDate);
    }
    
    // Add related activities
    await this.addRelatedActivities(activity, activityData.id);
    
    // Add participating organizations
    await this.addParticipatingOrganizations(activity, activityData.id);
    
    // Add to document
    this.iatiActivities.appendChild(activity);
  }
  
  // Add related activities to an activity element
  private async addRelatedActivities(activityElement: Element, activityId: string) {
    try {
      // Fetch related activities from database
      const { data: relatedActivities, error } = await getSupabaseAdmin()
        .from('related_activities')
        .select('relationship_type, iati_identifier')
        .eq('source_activity_id', activityId);
      
      if (error) {
        console.error('Error fetching related activities:', error);
        return;
      }
      
      // Add each related activity
      relatedActivities?.forEach((related: RelatedActivity) => {
        const relatedActivity = this.doc.createElement('related-activity');
        relatedActivity.setAttribute('type', related.relationship_type);
        relatedActivity.setAttribute('ref', related.iati_identifier);
        activityElement.appendChild(relatedActivity);
      });
      
    } catch (error) {
      console.error('Error adding related activities to XML:', error);
    }
  }
  
  // Add participating organizations to an activity element
  private async addParticipatingOrganizations(activityElement: Element, activityId: string) {
    try {
      // Fetch participating organizations (contributors) from database
      const { data: contributors, error } = await getSupabaseAdmin()
        .from('activity_contributors')
        .select(`
          organization_id,
          contribution_type,
          organizations (
            id,
            iati_org_id,
            name,
            acronym,
            organisation_type
          )
        `)
        .eq('activity_id', activityId);
      
      if (error) {
        console.error('Error fetching participating organizations:', error);
        this.errors.push(`Failed to fetch participating organizations for activity ${activityId}`);
        return;
      }
      
      // Map contribution types to IATI roles
      const roleMap: Record<string, string> = {
        'funder': '1',      // Funding
        'funding': '1',     // Funding
        'accountable': '2', // Accountable  
        'extending': '3',   // Extending
        'implementer': '4', // Implementing
        'implementing': '4' // Implementing
      };
      
      // Add each participating organization
      contributors?.forEach((contributor: any) => {
        if (!contributor.organizations) return;
        
        const participatingOrg = this.doc.createElement('participating-org');
        
        // Set organization reference (IATI identifier)
        if (contributor.organizations.iati_org_id) {
          participatingOrg.setAttribute('ref', contributor.organizations.iati_org_id);
        }
        
        // Set organization type
        if (contributor.organizations.organisation_type) {
          participatingOrg.setAttribute('type', contributor.organizations.organisation_type);
        }
        
        // Set role based on contribution type
        const role = roleMap[contributor.contribution_type] || '4'; // Default to implementing
        participatingOrg.setAttribute('role', role);
        
        // Add narrative using name (NOT acronym)
        if (contributor.organizations.name) {
          const narrative = this.doc.createElement('narrative');
          narrative.textContent = contributor.organizations.name;
          participatingOrg.appendChild(narrative);
        }
        
        activityElement.appendChild(participatingOrg);
      });
      
    } catch (error) {
      console.error('Error adding participating organizations to XML:', error);
      this.errors.push(`Error processing participating organizations: ${error}`);
    }
  }
  
  // Public method to add transactions to the last activity
  async addTransactionsToActivity(activityId: string, transactions: any[]) {
    const activityElement = this.doc.querySelector('iati-activity:last-child');
    if (!activityElement) {
      this.errors.push(`No activity element found to add transactions`);
      return;
    }
    await this.addTransactions(activityElement, transactions);
  }
  
  // Add transactions to an activity element
  private async addTransactions(activityElement: Element, transactions: any[]) {
    transactions.forEach(trans => {
      const transaction = this.doc.createElement('transaction');
      
      // Transaction reference
      if (trans.uuid) {
        transaction.setAttribute('ref', trans.uuid);
      }
      
      // Transaction type
      const transactionType = this.doc.createElement('transaction-type');
      transactionType.setAttribute('code', trans.transaction_type);
      transaction.appendChild(transactionType);
      
      // Transaction date
      const transactionDate = this.doc.createElement('transaction-date');
      transactionDate.setAttribute('iso-date', trans.transaction_date);
      transaction.appendChild(transactionDate);
      
      // Value
      const value = this.doc.createElement('value');
      value.setAttribute('currency', trans.currency || 'USD');
      value.setAttribute('value-date', trans.transaction_date);
      value.textContent = trans.value.toString();
      transaction.appendChild(value);
      
      // Description
      if (trans.description) {
        const description = this.doc.createElement('description');
        const narrative = this.doc.createElement('narrative');
        narrative.textContent = trans.description;
        description.appendChild(narrative);
        transaction.appendChild(description);
      }
      
      // Provider organization
      if (trans.provider_org_name || trans.provider_org_ref) {
        const providerOrg = this.doc.createElement('provider-org');
        if (trans.provider_org_ref) {
          providerOrg.setAttribute('ref', trans.provider_org_ref);
        }
        if (trans.provider_org_type) {
          providerOrg.setAttribute('type', trans.provider_org_type);
        }
        if (trans.provider_org_name) {
          const narrative = this.doc.createElement('narrative');
          narrative.textContent = trans.provider_org_name;
          providerOrg.appendChild(narrative);
        }
        transaction.appendChild(providerOrg);
      }
      
      // Receiver organization
      if (trans.receiver_org_name || trans.receiver_org_ref) {
        const receiverOrg = this.doc.createElement('receiver-org');
        if (trans.receiver_org_ref) {
          receiverOrg.setAttribute('ref', trans.receiver_org_ref);
        }
        if (trans.receiver_org_type) {
          receiverOrg.setAttribute('type', trans.receiver_org_type);
        }
        if (trans.receiver_org_name) {
          const narrative = this.doc.createElement('narrative');
          narrative.textContent = trans.receiver_org_name;
          receiverOrg.appendChild(narrative);
        }
        transaction.appendChild(receiverOrg);
      }
      
      // Aid type
      if (trans.aid_type) {
        const aidType = this.doc.createElement('aid-type');
        aidType.setAttribute('code', trans.aid_type);
        aidType.setAttribute('vocabulary', trans.aid_type_vocabulary || '1');
        transaction.appendChild(aidType);
      }
      
      // Flow type
      if (trans.flow_type) {
        const flowType = this.doc.createElement('flow-type');
        flowType.setAttribute('code', trans.flow_type);
        transaction.appendChild(flowType);
      }
      
      // Tied status
      if (trans.tied_status) {
        const tiedStatus = this.doc.createElement('tied-status');
        tiedStatus.setAttribute('code', trans.tied_status);
        transaction.appendChild(tiedStatus);
      }
      
      activityElement.appendChild(transaction);
    });
  }
  
  // Generate XML string
  toString(): string {
    const serializer = new XMLSerializer();
    return serializer.serializeToString(this.doc);
  }
  
  // Generate and download XML file
  download(filename: string = 'iati-activities.xml') {
    const xmlString = this.toString();
    const blob = new Blob([xmlString], { type: 'application/xml' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  }
}

// Helper function to generate IATI XML for a single activity
export async function generateActivityIATIXML(activityId: string): Promise<string> {
  const generator = new IATIXMLGenerator();
  
  // Fetch activity data
  const { data: activity, error } = await getSupabaseAdmin()
    .from('activities')
    .select('*')
    .eq('id', activityId)
    .single();
  
  if (error || !activity) {
    throw new Error('Activity not found');
  }
  
  // Add the activity
  await generator.addActivity(activity);
  
  // Fetch and add transactions
  const { data: transactions } = await getSupabaseAdmin()
    .from('transactions')
    .select('*')
    .eq('activity_id', activityId);
  
  if (transactions && transactions.length > 0) {
    // Use public method to add transactions
    await generator.addTransactionsToActivity(activityId, transactions);
  }
  
  return generator.toString();
}

// Helper function to generate IATI XML for multiple activities
export async function generateMultipleActivitiesIATIXML(activityIds: string[]): Promise<string> {
  const generator = new IATIXMLGenerator();
  
  for (const activityId of activityIds) {
    // Fetch activity data
    const { data: activity, error } = await getSupabaseAdmin()
      .from('activities')
      .select('*')
      .eq('id', activityId)
      .single();
    
    if (!error && activity) {
      // Add the activity
      await generator.addActivity(activity);
      
      // Fetch and add transactions
      const { data: transactions } = await getSupabaseAdmin()
        .from('transactions')
        .select('*')
        .eq('activity_id', activityId);
      
      if (transactions && transactions.length > 0) {
        // Use public method to add transactions
        await generator.addTransactionsToActivity(activityId, transactions);
      }
    }
  }
  
  return generator.toString();
} 