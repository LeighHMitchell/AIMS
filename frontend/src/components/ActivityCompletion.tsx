import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Info, CheckCircle, Circle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ActivityData {
  title?: string;
  description?: string;
  reporting_org?: string;
  participating_orgs?: any[];
  recipient_countries?: any[];
  sectors?: any[];
  activity_status?: string;
  start_date?: string;
  end_date?: string;
  budget?: any[];
  transactions?: any[];
  documents?: any[];
  results?: any[];
  location?: any[];
  contact_info?: any[];
}

interface ActivityCompletionProps {
  activity: ActivityData;
}

export const ActivityCompletion: React.FC<ActivityCompletionProps> = ({ activity }) => {
  // Define field mappings with display labels
  const fieldMappings = [
    { key: 'title', label: 'Activity Title', value: activity.title },
    { key: 'description', label: 'Description', value: activity.description },
    { key: 'reporting_org', label: 'Reporting Organization', value: activity.reporting_org },
    { key: 'participating_orgs', label: 'Participating Organizations', value: activity.participating_orgs },
    { key: 'recipient_countries', label: 'Recipient Countries', value: activity.recipient_countries },
    { key: 'sectors', label: 'Sectors', value: activity.sectors },
    { key: 'activity_status', label: 'Activity Status', value: activity.activity_status },
    { key: 'start_date', label: 'Start Date', value: activity.start_date },
    { key: 'end_date', label: 'End Date', value: activity.end_date },
    { key: 'budget', label: 'Budget', value: activity.budget },
    { key: 'transactions', label: 'Transactions', value: activity.transactions },
    { key: 'documents', label: 'Documents', value: activity.documents },
    { key: 'results', label: 'Results', value: activity.results },
    { key: 'location', label: 'Location', value: activity.location },
    { key: 'contact_info', label: 'Contact Information', value: activity.contact_info },
  ];

  // Check if a field is filled
  const isFieldFilled = (value: any): boolean => {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    return false;
  };

  // Calculate completion
  const filledFields = fieldMappings.filter(field => isFieldFilled(field.value));
  const totalFields = fieldMappings.length;
  const completionPercentage = Math.round((filledFields.length / totalFields) * 100);
  const missingFields = fieldMappings.filter(field => !isFieldFilled(field.value));

  return (
    <Card className="w-full shadow-sm border-slate-200">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold text-slate-800">
          Activity Completion
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Percentage Display */}
        <div className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h3 className="text-3xl font-bold text-slate-900">{completionPercentage}%</h3>
            <span className="text-sm text-slate-500">
              {filledFields.length} of {totalFields} fields completed
            </span>
          </div>
          
          {/* Progress Bar */}
          <Progress 
            value={completionPercentage} 
            className="h-3 bg-slate-100"
            style={{
              '--progress-foreground': completionPercentage === 100 
                ? '#059669' // green-600
                : completionPercentage >= 80 
                ? '#2563eb' // blue-600
                : completionPercentage >= 60 
                ? '#4f46e5' // indigo-600
                : '#475569' // slate-600
            } as React.CSSProperties}
          />
        </div>

        {/* Completion Status */}
        {completionPercentage === 100 ? (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800 font-medium">
              Excellent! All activity fields are completed.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-slate-700">Missing Fields:</h4>
            <ul className="space-y-2">
              {missingFields.map((field) => (
                <li key={field.key} className="flex items-start gap-2 text-sm">
                  <Circle className="h-3 w-3 text-slate-400 mt-0.5 flex-shrink-0" />
                  <span className="text-slate-600">{field.label}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Information Section */}
        <div className="bg-slate-50 rounded-lg p-4 flex gap-3">
          <Info className="h-5 w-5 text-slate-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-slate-600 leading-relaxed">
            This completion score reflects the number of key data fields filled out in your 
            activity form. Completing all fields improves transparency, validation, and 
            analytics quality.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

// Export for use in other components
export default ActivityCompletion; 