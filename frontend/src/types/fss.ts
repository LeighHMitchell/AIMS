// IATI-compliant Forward Spending Survey types
export interface ForwardSpendingSurvey {
  id?: string;
  activity_id: string;
  extraction_date: string; // ISO date YYYY-MM-DD
  priority?: number; // 1=High, 2=Medium, 3=Low, 4=Very Low, 5=Uncertain
  phaseout_year?: number; // Expected end year of funding
  notes?: string;
  forecasts?: FSSForecast[];
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
  
  // UI state
  isSaving?: boolean;
  hasError?: boolean;
  errorMessage?: string;
}

export interface FSSForecast {
  id?: string;
  fss_id?: string;
  forecast_year: number; // 4-digit year
  amount: number;
  currency: string; // ISO 4217 currency code
  value_date?: string; // ISO date for currency conversion
  usd_amount?: number; // Converted USD amount
  notes?: string;
  created_at?: string;
  updated_at?: string;
  
  // UI state
  isSaving?: boolean;
  hasError?: boolean;
  errorMessage?: string;
}

export const FSS_PRIORITY_LEVELS = [
  { code: 1, name: 'High Priority', description: 'High confidence in funding commitment' },
  { code: 2, name: 'Medium Priority', description: 'Moderate confidence in funding' },
  { code: 3, name: 'Low Priority', description: 'Lower confidence in funding' },
  { code: 4, name: 'Very Low Priority', description: 'Uncertain funding' },
  { code: 5, name: 'Uncertain', description: 'Highly uncertain or conditional' }
];

