import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

export class SupabaseHelper {
  private serviceClient: SupabaseClient;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    this.serviceClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
  }

  async getActivityById(activityId: string): Promise<any> {
    const { data, error } = await this.serviceClient
      .from('activities')
      .select('*')
      .eq('id', activityId)
      .single();

    if (error) {
      console.error('Error fetching activity:', error);
      return null;
    }
    return data;
  }

  async createActivity(activityData: Partial<any> = {}): Promise<string | null> {
    const defaultActivity = {
      title: `Test Activity ${Date.now()}`,
      description: 'E2E Test Activity',
      activity_status: 'planning',
      publication_status: 'draft',
      submission_status: 'draft',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...activityData
    };

    const { data, error } = await this.serviceClient
      .from('activities')
      .insert(defaultActivity)
      .select('id')
      .single();

    if (error) {
      console.error('Error creating activity:', error);
      return null;
    }
    return data?.id;
  }

  async deleteActivity(activityId: string): Promise<boolean> {
    const { error } = await this.serviceClient
      .from('activities')
      .delete()
      .eq('id', activityId);

    if (error) {
      console.error('Error deleting activity:', error);
      return false;
    }
    return true;
  }

  async getActivityFieldValue(activityId: string, fieldName: string): Promise<any> {
    const activity = await this.getActivityById(activityId);
    return activity?.[fieldName] || null;
  }
}

export default new SupabaseHelper();