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
  partnerId: "Your organization's internal identifier for this activity",
  iatiId: "The IATI activity identifier - a globally unique identifier for this activity (format: {reporting-org-ref}-{activity-id})",
  localId: "System-generated unique identifier for this activity record",
  title: "A short, human-readable title that contains a meaningful summary of the activity. Max 200 characters recommended.",
  description: "A longer, human-readable description of the activity. May include implementation, expected outcomes, etc.",
  targetGroups: "A description of the groups that are intended to benefit from this activity",
  collaborationType: "The type of collaboration involved in the activity (bilateral, multilateral, etc.)",
  activityStatus: "The current lifecycle stage of the activity from the IATI activity status codelist",
  plannedStartDate: "The date on which the activity is planned to start, for example the date of the first planned disbursement or when physical activity starts.",
  plannedEndDate: "The date on which the activity is planned to end, for example the date of the last planned disbursement or when physical activity is complete.",
  actualStartDate: "The actual date the activity starts, for example the date of the first disbursement or when physical activity starts.",
  actualEndDate: "The actual date the activity ends, for example the date of the last disbursement or when physical activity is complete.",
  sectors: "The specific areas of the recipient's economic or social structure targeted by the activity",
  aidType: "The type of aid being supplied (project-type intervention, budget support, debt relief, etc.)",
  defaultAidType: "The default type of aid for transactions in this activity (e.g., budget support, project aid, technical assistance). Individual transactions may override this.",
  defaultFinanceType: "The default financial instrument for transactions in this activity (grant, loan, guarantee, etc.). Individual transactions may override this.",
  defaultCurrency: "The default currency for all monetary values in this activity per IATI standards. Use ISO 4217 currency codes (e.g., USD, EUR, GBP). Individual transactions may override if needed.",
  defaultFlowType: "The default flow type for transactions (e.g., ODA, OOF). This value will be automatically applied to new transactions but can be overridden.",
  defaultTiedStatus: "The default tied status for transactions. Indicates whether aid is tied, partially tied, or untied to procurement from the donor country.",
  currency: "The default currency for all financial values in this activity. Use ISO 4217 currency codes.",
  tiedStatus: "Whether the activity is tied, untied, or partially tied according to OECD definitions",
  systemUuid: "System-generated unique identifier for internal database reference. This is not the IATI identifier.",
};

// Required fields for publishing
export const REQUIRED_FIELDS = [
  'title',
  'description',
  'activityStatus',
  'plannedStartDate',
  'sectors',
  'participatingOrg',
  'defaultAidType',
];

// Recommended fields for better completeness
export const RECOMMENDED_FIELDS = [

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
          <HelpCircle className={`w-4 h-4 text-slate-500 cursor-help inline-block ml-1 ${className}`} />
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
    <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-700 mb-1">Activity Completion Rating</h3>
            <p className="text-sm text-slate-500">Data quality assessment</p>
          </div>
          <div className="text-right">
            <span className={`text-3xl font-bold ${
              completionPercentage === 100 
                ? 'text-slate-700' 
                : completionPercentage >= 80 
                ? 'text-slate-600' 
                : completionPercentage >= 60 
                ? 'text-slate-500' 
                : 'text-slate-400'
            }`}>{completionPercentage}%</span>
            <p className="text-xs text-slate-500 mt-1">Complete</p>
          </div>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-sm text-slate-600 hover:text-slate-700 font-medium flex items-center gap-1 px-3 py-2 rounded-md hover:bg-slate-100 transition-colors"
        >
          {isExpanded ? '▼' : '▶'} Improve my rating?
        </button>
      </div>
      
      {isExpanded && (
        <div className="space-y-3 pt-4 mt-4 border-t border-slate-200">
          {missingFields.required.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-600 mb-1">Required fields:</h4>
              <ul className="text-xs space-y-0.5">
                {missingFields.required.map((field, idx) => (
                  <li key={idx} className="text-slate-600 flex items-start gap-1">
                    <span className="text-slate-500 mt-0.5">•</span>
                    <span>{field}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {missingFields.recommended.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-600 mb-1">Recommended fields:</h4>
              <ul className="text-xs space-y-0.5">
                {missingFields.recommended.map((field, idx) => (
                  <li key={idx} className="text-slate-600 flex items-start gap-1">
                    <span className="text-slate-400 mt-0.5">•</span>
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