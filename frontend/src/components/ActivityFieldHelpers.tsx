import React from "react";
import { HelpCircle, AlertCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// IATI field help texts based on IATI standard
export const IATI_FIELD_HELP = {
  partnerId: "A unique identifier used internally by the implementing partner.",
  iatiId: "The globally recognised identifier for this activity.",
  localId: "The identifier created and used locally by the system or government entity.",
  title: "A short, human-readable title that contains a meaningful summary of the activity. Max 200 characters recommended.",
  description: "A longer, human-readable description of the activity. May include objectives, implementation, expected outcomes, etc.",
  objectives: "A description of the intended ultimate objectives of the activity. What are the intended impacts?",
  targetGroups: "A description of the groups that are intended to benefit from this activity",
  collaborationType: "The type of collaboration involved in the activity (bilateral, multilateral, etc.)",
  activityStatus: "The current lifecycle stage of the activity from the IATI activity status codelist",
  plannedStartDate: "The date on which the activity is planned to start",
  plannedEndDate: "The date on which the activity is planned to end",
  actualStartDate: "The actual date the activity started (if known)",
  actualEndDate: "The actual date the activity ended (if known)",
  sectors: "The specific areas of the recipient's economic or social structure targeted by the activity",
  aidType: "The type of aid being supplied (project-type intervention, budget support, debt relief, etc.)",
  flowType: "Whether the activity is funded by Official Development Assistance (ODA), Other Official Flows (OOF), etc.",
  currency: "The default currency for all financial values in this activity. Use ISO 4217 currency codes.",
  tiedStatus: "Whether the activity is tied, untied, or partially tied according to OECD definitions",
};

// Required fields for publishing
export const REQUIRED_FIELDS = [
  'title',
  'description',
  'activityStatus',
  'plannedStartDate',
  'sectors',
  'participatingOrg',
];

// Recommended fields for better completeness
export const RECOMMENDED_FIELDS = [
  'objectives',
  'targetGroups',
  'collaborationType',
  'plannedEndDate',
  'aidType',
  'flowType',
  'tiedStatus',
  'documents',
  'locations',
  'results',
];

interface FieldHelpProps {
  field: string;
  className?: string;
}

export const FieldHelp: React.FC<FieldHelpProps> = ({ field, className = "" }) => {
  const helpText = IATI_FIELD_HELP[field as keyof typeof IATI_FIELD_HELP];
  
  if (!helpText) return null;
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <HelpCircle className={`h-3.5 w-3.5 text-gray-400 hover:text-gray-600 cursor-pointer inline-block ml-1 ${className}`} />
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p>{helpText}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

interface RequiredFieldIndicatorProps {
  field: string;
  value: any;
  className?: string;
}

export const RequiredFieldIndicator: React.FC<RequiredFieldIndicatorProps> = ({ 
  field, 
  value, 
  className = "" 
}) => {
  const isRequired = REQUIRED_FIELDS.includes(field);
  const isEmpty = !value || (typeof value === 'string' && !value.trim()) || 
                  (Array.isArray(value) && value.length === 0);
  
  if (!isRequired || !isEmpty) return null;
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <AlertCircle className={`h-3.5 w-3.5 text-red-600 inline-block ml-1 ${className}`} />
        </TooltipTrigger>
        <TooltipContent>
          <p>Required before publishing</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

interface ActivityCompletionRatingProps {
  activity: any;
  transactions?: any[];
  sectors?: any[];
}

export const ActivityCompletionRating: React.FC<ActivityCompletionRatingProps> = ({ 
  activity, 
  transactions = [], 
  sectors = [] 
}) => {
  // Calculate completion percentage
  const calculateCompletion = () => {
    let completed = 0;
    let total = 0;
    
    // Check required fields
    REQUIRED_FIELDS.forEach(field => {
      total += 1;
      if (field === 'sectors') {
        if (sectors && sectors.length > 0) completed += 1;
      } else if (field === 'participatingOrg') {
        if (activity.partnerId) completed += 1;
      } else if (activity[field] && activity[field].toString().trim()) {
        completed += 1;
      }
    });
    
    // Check recommended fields (worth half points)
    RECOMMENDED_FIELDS.forEach(field => {
      total += 0.5;
      if (field === 'aidType' || field === 'flowType' || field === 'tiedStatus') {
        // Check if any transaction has these fields
        if (transactions.some(t => t[field])) completed += 0.5;
      } else if (activity[field] && activity[field].toString().trim()) {
        completed += 0.5;
      }
    });
    
    return Math.round((completed / total) * 100);
  };
  
  const completionPercentage = calculateCompletion();
  
  // Get missing fields
  const getMissingFields = () => {
    const missing = {
      required: [] as string[],
      recommended: [] as string[]
    };
    
    REQUIRED_FIELDS.forEach(field => {
      if (field === 'sectors') {
        if (!sectors || sectors.length === 0) missing.required.push('Sectors');
      } else if (field === 'participatingOrg') {
        if (!activity.partnerId) missing.required.push('Partner Organization');
      } else if (!activity[field] || !activity[field].toString().trim()) {
        missing.required.push(field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1').trim());
      }
    });
    
    RECOMMENDED_FIELDS.forEach(field => {
      if (field === 'aidType') {
        if (!transactions.some(t => t.aidType)) missing.recommended.push('Aid Type (in transactions)');
      } else if (field === 'flowType') {
        if (!transactions.some(t => t.flowType)) missing.recommended.push('Flow Type (in transactions)');
      } else if (field === 'tiedStatus') {
        if (!transactions.some(t => t.tiedStatus)) missing.recommended.push('Tied Status (in transactions)');
      } else if (!activity[field] || (Array.isArray(activity[field]) && activity[field].length === 0)) {
        missing.recommended.push(field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1').trim());
      }
    });
    
    return missing;
  };
  
  const missingFields = getMissingFields();
  const [isExpanded, setIsExpanded] = React.useState(false);
  
  return (
    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
      <h3 className="text-sm font-semibold text-gray-700">Activity Completion Rating</h3>
      
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-2xl font-bold text-gray-900">{completionPercentage}%</span>
          <span className="text-xs text-gray-500">Complete</span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${
              completionPercentage >= 80 ? 'bg-green-500' : 
              completionPercentage >= 60 ? 'bg-yellow-500' : 
              'bg-red-500'
            }`}
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
      </div>
      
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
      >
        {isExpanded ? '▼' : '▶'} Improve my rating?
      </button>
      
      {isExpanded && (
        <div className="space-y-3 pt-2 border-t">
          {missingFields.required.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-red-600 mb-1">Required fields:</h4>
              <ul className="text-xs space-y-0.5">
                {missingFields.required.map((field, idx) => (
                  <li key={idx} className="text-gray-600 flex items-start gap-1">
                    <span className="text-red-600 mt-0.5">•</span>
                    <span>{field}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {missingFields.recommended.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-700 mb-1">Recommended fields:</h4>
              <ul className="text-xs space-y-0.5">
                {missingFields.recommended.map((field, idx) => (
                  <li key={idx} className="text-gray-600 flex items-start gap-1">
                    <span className="text-gray-400 mt-0.5">•</span>
                    <span>{field}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}; 