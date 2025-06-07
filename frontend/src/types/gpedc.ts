// GPEDC Form Types
export interface GPEDCFormData {
  // Development Effectiveness Indicators
  developmentEffectiveness: {
    implementingPartner?: string;
    linkedToGovFramework?: 'yes' | 'no';
    supportsPublicSector?: 'yes' | 'no';
    numberOfOutcomeIndicators?: number;
    indicatorsFromGovPlans?: 'yes' | 'no';
    indicatorsMonitoredByGov?: 'yes' | 'no';
    finalEvaluationPlanned?: 'yes' | 'no';
  };

  // Use of Government Systems
  governmentSystems: {
    budgetExecutionSystem?: 'yes' | 'no';
    financialReportingSystem?: 'yes' | 'no';
    auditingSystem?: 'yes' | 'no';
    procurementSystem?: 'yes' | 'no';
  };

  // Budget Planning and Tied Aid
  budgetPlanning: {
    annualBudgetShared?: 'yes' | 'no';
    threeYearPlanShared?: 'yes' | 'no';
    tiedStatus?: 'fully_tied' | 'partially_tied' | 'untied';
  };

  // Contact Details
  contact: {
    name?: string;
    organisation?: string;
    email?: string;
    phoneNumber?: string;
  };

  // Project Documents
  documents: {
    uploadedFile?: File | null;
    externalLink?: string;
  };

  // Remarks
  remarks?: string;

  // Metadata
  metadata?: {
    projectId: string;
    lastSavedAt?: Date;
    submittedAt?: Date;
    status: 'draft' | 'submitted' | 'published';
    createdBy: string;
    updatedBy?: string;
  };
}

// Auto-save state type
export interface AutoSaveState {
  isSaving: boolean;
  lastSaved: Date | null;
  hasChanges: boolean;
}

// Field change history
export interface FieldChangeHistory {
  fieldName: string;
  oldValue: any;
  newValue: any;
  changedBy: string;
  changedAt: Date;
}

// Validation errors
export interface GPEDCValidationErrors {
  [key: string]: string | undefined;
}