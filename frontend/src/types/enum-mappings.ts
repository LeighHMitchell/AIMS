// IATI-compliant Enum Type Definitions (IATI Standard v2.03)
// These TypeScript enums mirror the PostgreSQL enum types exactly

// Transaction Type Enum - Based on IATI transaction type codes
export enum TransactionTypeEnum {
  IncomingFunds = '1',
  OutgoingCommitment = '2',
  Disbursement = '3',
  Expenditure = '4',
  InterestPayment = '5',
  LoanRepayment = '6',
  Reimbursement = '7',
  PurchaseOfEquity = '8',
  SaleOfEquity = '9',
  CreditGuarantee = '10',
  IncomingCommitment = '11',
  OutgoingPledge = '12',
  IncomingPledge = '13'
}

// Aid Type Enum - IATI AidType codelist
export enum AidTypeEnum {
  GeneralBudgetSupport = 'A01',
  SectorBudgetSupport = 'A02',
  CoreSupportToNGOs = 'B01',
  CoreContributionsToMultilateral = 'B02',
  ContributionsToSpecificProgrammes = 'B03',
  BasketFunds = 'B04',
  ProjectTypeInterventions = 'C01',
  DonorCountryPersonnel = 'D01',
  OtherTechnicalAssistance = 'D02',
  ScholarshipsInDonorCountry = 'E01',
  ImputedStudentCosts = 'E02',
  DebtRelief = 'F01',
  AdministrativeCosts = 'G01',
  DevelopmentAwareness = 'H01',
  RefugeesInDonorCountries = 'H02'
}

// Flow Type Enum - IATI FlowType codelist
export enum FlowTypeEnum {
  ODA = '10',
  OOFNonExportCredit = '11',
  OOFExportCredit = '12',
  PrivateGrants = '13',
  PrivateMarket = '14',
  NonFlow = '20',
  PrivateDevelopmentFinance = '21',
  MobilisedPrivateFinance = '22',
  BilateralExPost = '30',
  PrivateFDI = '35',
  PrivateExportCredit = '36',
  OtherPrivateFlows = '37',
  NonFlowGNI = '40',
  OtherFlows = '50'
}

// Finance Type Enum - IATI FinanceType codelist (partial list of common values)
export enum FinanceTypeEnum {
  Grant = '100',
  StandardGrant = '110',
  SubsidiesToPrivateInvestors = '111',
  InterestSubsidy = '210',
  InterestSubsidyToExporters = '211',
  DepositBasis = '310',
  DepositBasisRecipientBank = '311',
  Loan = '400',
  AidLoan = '410',
  InvestmentLoan = '411',
  JointVentureLoan = '412',
  LoanToPrivateInvestor = '413',
  LoanToPrivateExporter = '414',
  StandardLoan = '421',
  ReimbursableGrant = '422',
  Bonds = '423',
  AssetBackedSecurities = '424',
  OtherDebtSecurities = '425',
  SubordinatedLoan = '431',
  PreferredEquity = '432',
  OtherHybrid = '433',
  NonBanksGuaranteedExportCredits = '451',
  NonBanksNonGuaranteed = '452',
  BankExportCredits = '453',
  CommonEquity = '510',
  SharesInCollectiveVehicles = '511',
  CorporateBonds = '512',
  Guarantees = '520',
  DebtForgivenessODA = '610',
  DebtReschedulingODA = '620',
  ForeignDirectInvestment = '700',
  BankBonds = '810',
  OtherSecurities = '910',
  GuaranteesInsurance = '1100'
}

// Disbursement Channel Enum - IATI DisbursementChannel codelist
export enum DisbursementChannelEnum {
  Government = '1',
  NonGovernmentalAgencies = '2',
  MultilateralAgencies = '3',
  PublicSectorInstitutions = '4',
  PrivateSectorInstitutions = '5',
  PublicPrivatePartnerships = '6',
  Other = '7'
}

// Tied Status Enum - IATI TiedStatus codelist
export enum TiedStatusEnum {
  PartiallyTied = '3',
  Tied = '4',
  Untied = '5'
}

// Organization Type Enum - IATI OrganisationType codelist
export enum OrganizationTypeEnum {
  Government = '10',
  LocalGovernment = '11',
  OtherPublicSector = '15',
  InternationalNGO = '21',
  NationalNGO = '22',
  RegionalNGO = '23',
  PartnerCountryNGO = '24',
  PublicPrivatePartnership = '30',
  PrivateSector = '31',
  Multilateral = '40',
  Foundation = '60',
  AcademicTrainingResearch = '70',
  PrivateSectorProvider = '71',
  PrivateSectorRecipient = '72',
  PrivateSectorThird = '73',
  Academic = '80',
  Other = '90'
}

// Transaction Status Enum
export enum TransactionStatusEnum {
  Draft = 'draft',
  Actual = 'actual'
}

// Type guards to check if a value is a valid enum value
export const isValidTransactionType = (value: any): value is TransactionTypeEnum => {
  return Object.values(TransactionTypeEnum).includes(value);
};

export const isValidAidType = (value: any): value is AidTypeEnum => {
  return Object.values(AidTypeEnum).includes(value);
};

export const isValidFlowType = (value: any): value is FlowTypeEnum => {
  return Object.values(FlowTypeEnum).includes(value);
};

export const isValidFinanceType = (value: any): value is FinanceTypeEnum => {
  return Object.values(FinanceTypeEnum).includes(value);
};

export const isValidDisbursementChannel = (value: any): value is DisbursementChannelEnum => {
  return Object.values(DisbursementChannelEnum).includes(value);
};

export const isValidTiedStatus = (value: any): value is TiedStatusEnum => {
  return Object.values(TiedStatusEnum).includes(value);
};

export const isValidOrganizationType = (value: any): value is OrganizationTypeEnum => {
  return Object.values(OrganizationTypeEnum).includes(value);
};

// Helper function to clean enum values before sending to API
export const cleanEnumValue = (value: any): string | null => {
  if (!value || value === 'none' || value === 'undefined' || value === 'null' || value === '') {
    return null;
  }
  return String(value).trim();
};

// Helper to convert legacy transaction types to new IATI format
export const LEGACY_TRANSACTION_TYPE_MAP: Record<string, TransactionTypeEnum> = {
  'IF': TransactionTypeEnum.IncomingFunds,
  'C': TransactionTypeEnum.OutgoingCommitment,
  'D': TransactionTypeEnum.Disbursement,
  'E': TransactionTypeEnum.Expenditure,
  'IR': TransactionTypeEnum.InterestPayment,
  'LR': TransactionTypeEnum.LoanRepayment,
  'R': TransactionTypeEnum.Reimbursement,
  'PE': TransactionTypeEnum.PurchaseOfEquity,
  'SE': TransactionTypeEnum.SaleOfEquity,
  'CG': TransactionTypeEnum.CreditGuarantee,
  'IC': TransactionTypeEnum.IncomingCommitment,
  'OP': TransactionTypeEnum.OutgoingPledge,
  'IP': TransactionTypeEnum.IncomingPledge
}; 