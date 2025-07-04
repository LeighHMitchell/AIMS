import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Info, CheckCircle, Circle, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

interface ActivityData {
  id?: string;
  title?: string;
  description?: string;
  activityStatus?: string;
  publicationStatus?: string;
  partnerId?: string;
  iatiId?: string;
  created_by_org_name?: string;
  plannedStartDate?: string;
  plannedEndDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  sectors?: any[];
  transactions?: any[];
  budgets?: any[];
  extendingPartners?: any[];
  implementingPartners?: any[];
  governmentPartners?: any[];
  contacts?: any[];
  locations?: { specificLocations?: any[]; coverageAreas?: any[] };
  documents?: any[];
  results?: any[];
  sdgMappings?: any[];
  defaultAidType?: string;
  defaultFinanceType?: string;
  defaultCurrency?: string;
  targetGroups?: string;
  collaborationType?: string;
}

interface FieldDefinition {
  key: string;
  label: string;
  required: boolean;
  weight: number;
  getValue: (activity: ActivityData) => any;
}

interface ActivityCompletionEnhancedProps {
  activity: ActivityData;
  showWeightedScore?: boolean;
  expandable?: boolean;
}

export const ActivityCompletionEnhanced: React.FC<ActivityCompletionEnhancedProps> = ({ 
  activity, 
  showWeightedScore = true,
  expandable = true 
}) => {
  const [isExpanded, setIsExpanded] = React.useState(false);

  // IATI-compliant field definitions with weights
  const fieldDefinitions: FieldDefinition[] = [
    // Required fields (weight: 2)
    { key: 'title', label: 'Activity Title', required: true, weight: 2, getValue: (a) => a.title },
    { key: 'description', label: 'Description', required: true, weight: 2, getValue: (a) => a.description },
    { key: 'activityStatus', label: 'Activity Status', required: true, weight: 2, getValue: (a) => a.activityStatus },
    { key: 'reportingOrg', label: 'Reporting Organization', required: true, weight: 2, getValue: (a) => a.created_by_org_name },
    { key: 'startDate', label: 'Start Date', required: true, weight: 2, getValue: (a) => a.plannedStartDate || a.actualStartDate },
    { key: 'sectors', label: 'Sectors', required: true, weight: 2, getValue: (a) => a.sectors },
    { key: 'defaultAidType', label: 'Default Aid Type', required: true, weight: 2, getValue: (a) => a.defaultAidType },
    
    // Recommended fields (weight: 1)
    { key: 'endDate', label: 'End Date', required: false, weight: 1, getValue: (a) => a.plannedEndDate || a.actualEndDate },
    { key: 'partnerId', label: 'Partner ID', required: false, weight: 1, getValue: (a) => a.partnerId },
    { key: 'iatiId', label: 'IATI Identifier', required: false, weight: 1, getValue: (a) => a.iatiId },
    { key: 'targetGroups', label: 'Target Groups', required: false, weight: 1, getValue: (a) => a.targetGroups },
    { key: 'defaultFinanceType', label: 'Default Finance Type', required: false, weight: 1, getValue: (a) => a.defaultFinanceType },
    { key: 'defaultCurrency', label: 'Default Currency', required: false, weight: 1, getValue: (a) => a.defaultCurrency },
    { key: 'transactions', label: 'Transactions', required: false, weight: 1, getValue: (a) => a.transactions },
    { key: 'budgets', label: 'Budgets', required: false, weight: 1, getValue: (a) => a.budgets },
    { key: 'implementingPartners', label: 'Implementing Partners', required: false, weight: 1, getValue: (a) => a.implementingPartners },
    { key: 'locations', label: 'Locations', required: false, weight: 1, getValue: (a) => a.locations?.specificLocations || a.locations?.coverageAreas },
    { key: 'contacts', label: 'Contacts', required: false, weight: 1, getValue: (a) => a.contacts },
    { key: 'documents', label: 'Documents', required: false, weight: 1, getValue: (a) => a.documents },
    { key: 'results', label: 'Results', required: false, weight: 1, getValue: (a) => a.results },
    { key: 'sdgMappings', label: 'SDG Alignment', required: false, weight: 1, getValue: (a) => a.sdgMappings },
  ];

  // Check if a field is filled
  const isFieldFilled = (value: any): boolean => {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'object') return Object.keys(value).length > 0;
    return false;
  };

  // Calculate completion
  const evaluateFields = () => {
    let filledWeight = 0;
    let totalWeight = 0;
    const missingRequired: FieldDefinition[] = [];
    const missingRecommended: FieldDefinition[] = [];
    const filledFields: FieldDefinition[] = [];

    fieldDefinitions.forEach(field => {
      const value = field.getValue(activity);
      const isFilled = isFieldFilled(value);
      
      totalWeight += field.weight;
      
      if (isFilled) {
        filledWeight += field.weight;
        filledFields.push(field);
      } else {
        if (field.required) {
          missingRequired.push(field);
        } else {
          missingRecommended.push(field);
        }
      }
    });

    const weightedPercentage = Math.round((filledWeight / totalWeight) * 100);
    const simplePercentage = Math.round((filledFields.length / fieldDefinitions.length) * 100);

    return {
      weightedPercentage,
      simplePercentage,
      filledFields,
      missingRequired,
      missingRecommended,
      filledCount: filledFields.length,
      totalCount: fieldDefinitions.length,
      isPublishable: missingRequired.length === 0
    };
  };

  const evaluation = evaluateFields();
  const displayPercentage = showWeightedScore ? evaluation.weightedPercentage : evaluation.simplePercentage;

  return (
    <Card className="w-full shadow-sm border-slate-200">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-slate-800">
            Activity Data Quality
          </CardTitle>
          {evaluation.isPublishable && (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              Publishable
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Percentage Display */}
        <div className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h3 className="text-3xl font-bold text-slate-900">{displayPercentage}%</h3>
            <div className="text-right">
              <span className="text-sm text-slate-500">
                {evaluation.filledCount} of {evaluation.totalCount} fields
              </span>
              {showWeightedScore && (
                <div className="text-xs text-slate-400 mt-0.5">
                  Quality-weighted score
                </div>
              )}
            </div>
          </div>
          
          {/* Progress Bar */}
          <Progress 
            value={displayPercentage} 
            className="h-3 bg-slate-100"
            style={{
              '--progress-foreground': displayPercentage === 100 
                ? '#059669' // green-600
                : displayPercentage >= 80 
                ? '#2563eb' // blue-600
                : displayPercentage >= 60 
                ? '#4f46e5' // indigo-600
                : '#dc2626' // red-600
            } as React.CSSProperties}
          />
        </div>

        {/* Status Messages */}
        {evaluation.missingRequired.length > 0 && (
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <span className="font-medium">Required fields missing.</span> Complete these to publish your activity.
            </AlertDescription>
          </Alert>
        )}

        {/* Expandable Details */}
        {expandable && (evaluation.missingRequired.length > 0 || evaluation.missingRecommended.length > 0) && (
          <div className="space-y-3">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
            >
              {isExpanded ? '▼' : '▶'} How can I improve this score?
            </button>
            
            {isExpanded && (
              <div className="space-y-4 pt-2">
                {evaluation.missingRequired.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-red-700 mb-2">Required Fields:</h4>
                    <ul className="space-y-1.5">
                      {evaluation.missingRequired.map((field) => (
                        <li key={field.key} className="flex items-start gap-2 text-sm">
                          <AlertCircle className="h-3 w-3 text-red-500 mt-0.5 flex-shrink-0" />
                          <span className="text-slate-700">{field.label}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {evaluation.missingRecommended.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-slate-700 mb-2">Recommended Fields:</h4>
                    <ul className="space-y-1.5">
                      {evaluation.missingRecommended.map((field) => (
                        <li key={field.key} className="flex items-start gap-2 text-sm">
                          <Circle className="h-3 w-3 text-slate-400 mt-0.5 flex-shrink-0" />
                          <span className="text-slate-600">{field.label}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Information Section */}
        <div className="bg-slate-50 rounded-lg p-4 flex gap-3">
          <Info className="h-5 w-5 text-slate-500 flex-shrink-0 mt-0.5" />
          <div className="space-y-2 text-sm text-slate-600">
            <p className="leading-relaxed">
              This score reflects your activity's data completeness and quality. 
              {showWeightedScore && " Required fields have higher weight in the calculation."}
            </p>
            <p className="text-xs text-slate-500">
              Complete all required fields to publish your activity. Recommended fields improve 
              transparency and enable better analytics.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Export for use in other components
export default ActivityCompletionEnhanced; 