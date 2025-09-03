import React from "react";
import { HelpCircle, AlertCircle, ChevronDown, ChevronRight, Target, CheckCircle, Clock } from "lucide-react";
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
  locations: "This tab records where the activity takes place. You can add locations using the map or by entering coordinates manually. Each location can include a name, type, address, and description, along with subnational breakdowns. These details establish the geographic footprint of the activity and allow analysis at the national, regional, or project-site level.",
  sectorAllocation: "This tab defines the focus areas of the activity. You select sub-sectors, and the system automatically links each choice to its corresponding sector and sector category. You can assign multiple sub-sectors and use percentage shares to show how the activity budget is divided. The allocations must add up to 100 percent, and a visual summary displays the distribution.",
  linkedActivities: "The Linked Activities tab shows connections between this activity and others, defined through recognised relationship types such as parent, child, or related projects. Each linked activity is displayed with its title, identifier, and reporting organisation, along with its relationship to the current activity. A relationship visualisation provides a clear overview of how activities are structured and connected across partners.",
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
  
  // Get completion status
  const getCompletionStatus = () => {
    if (completionPercentage === 100) return { text: 'Excellent', color: 'text-slate-700', bgColor: 'bg-slate-600' };
    if (completionPercentage >= 80) return { text: 'Good', color: 'text-slate-600', bgColor: 'bg-slate-500' };
    if (completionPercentage >= 60) return { text: 'Fair', color: 'text-slate-500', bgColor: 'bg-slate-400' };
    return { text: 'Needs Work', color: 'text-slate-400', bgColor: 'bg-slate-300' };
  };
  
  const status = getCompletionStatus();
  
  return (
    <div className="bg-slate-50 rounded-lg border border-slate-200">
      {/* Compact Header */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-slate-600" />
            <h3 className="text-sm font-semibold text-slate-700">Completion Rating</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-lg font-bold ${status.color}`}>{completionPercentage}%</span>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 hover:bg-slate-200 rounded transition-colors"
              aria-label="Toggle completion details"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-slate-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-slate-500" />
              )}
            </button>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-500">Data quality</span>
            <span className={`text-xs font-medium ${status.color}`}>{status.text}</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${status.bgColor}`}
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>
      </div>
      
      {/* Expandable Content */}
      {isExpanded && (
        <div className="border-t border-slate-200 p-4 bg-white">
          <div className="space-y-4">
            {/* Completion Summary */}
            <div className="bg-slate-50 rounded-md p-3">
              <h4 className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                How to Improve Your Rating
              </h4>
              <p className="text-xs text-slate-600 mb-2">
                Complete missing fields to improve your activity's data quality and visibility.
              </p>
            </div>

            {/* Required Fields */}
            {missingFields.required.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-slate-600 rounded-full"></div>
                  <h4 className="text-sm font-semibold text-slate-700">Required Fields</h4>
                </div>
                <p className="text-xs text-slate-600 mb-2">These fields are essential for publishing your activity:</p>
                <ul className="space-y-1">
                  {missingFields.required.map((field, idx) => (
                    <li key={idx} className="text-xs text-slate-700 flex items-start gap-2 pl-4">
                      <span className="text-slate-500 mt-1">•</span>
                      <span>{field}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Recommended Fields */}
            {missingFields.recommended.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-slate-500 rounded-full"></div>
                  <h4 className="text-sm font-semibold text-slate-700">Recommended Fields</h4>
                </div>
                <p className="text-xs text-slate-600 mb-2">Adding these will improve data quality and discoverability:</p>
                <ul className="space-y-1">
                  {missingFields.recommended.map((field, idx) => (
                    <li key={idx} className="text-xs text-slate-700 flex items-start gap-2 pl-4">
                      <span className="text-slate-400 mt-1">•</span>
                      <span>{field}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Perfect Score */}
            {completionPercentage === 100 && (
              <div className="bg-slate-50 border border-slate-300 rounded-md p-3">
                <div className="flex items-center gap-2 text-slate-700">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">Perfect Score!</span>
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  Your activity has excellent data quality. All required and recommended fields are complete.
                </p>
              </div>
            )}

            {/* Tips */}
            {completionPercentage < 100 && (
              <div className="bg-slate-50 border border-slate-300 rounded-md p-3">
                <div className="flex items-center gap-2 text-slate-700 mb-1">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm font-medium">Quick Tips</span>
                </div>
                <ul className="text-xs text-slate-600 space-y-1">
                  <li>• Focus on required fields first to enable publishing</li>
                  <li>• Add descriptions and target groups for better context</li>
                  <li>• Include financial data in the Finances tab</li>
                  <li>• Specify sectors and locations for better discoverability</li>
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}; 