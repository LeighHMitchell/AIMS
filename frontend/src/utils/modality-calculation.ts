/**
 * Utility functions for calculating aid modality based on aid type and finance type
 */

/**
 * Calculate the aid modality based on aid type and finance type codes
 * @param aidType The aid type code (e.g., "D01", "C01")
 * @param financeType The finance type code (e.g., "110", "421")
 * @returns The calculated modality code ("1" to "5")
 */
export function calculateModality(aidType: string, financeType: string): string {
  // 1. Technical Assistance aid types
  const technicalAssistanceAidTypes = ["D01", "D02", "E01", "E02"];
  const isTA = technicalAssistanceAidTypes.includes(aidType);

  // 2. Grant and Loan finance types
  const grantFinanceTypes = [
    "110", "111", "112", "113", "114", "115", "116", "117", "118", // Standard grants
    "210", // Debt relief grant
    "310", "311" // In-kind grants
  ];
  const loanFinanceTypes = [
    "421", "422", "423", "424", "425", // Standard/concessional loans
    "431", "433" // Other loan types
  ];
  
  // 3. Reimbursable/ambiguous/withdrawn types
  const reimbursableOrAmbiguous = ["422"]; // Reimbursable grant
  
  // 510+ and 600+ are investment/guarantee, so check prefix
  const isInvestmentOrGuarantee = (code: string) => {
    if (!code) return false;
    const n = parseInt(code, 10);
    return (n >= 510 && n < 600) || (n >= 600);
  };

  // 4. Combine logic
  if (!financeType) return "5"; // Other / Needs Review
  if (reimbursableOrAmbiguous.includes(financeType) || isInvestmentOrGuarantee(financeType)) return "5";

  if (grantFinanceTypes.includes(financeType)) {
    if (isTA) return "3"; // Grant – Technical Assistance
    return "1"; // Grant
  }
  if (loanFinanceTypes.includes(financeType)) {
    if (isTA) return "4"; // Loan – Technical Assistance
    return "2"; // Loan
  }
  
  // All else
  return "5"; // Other / Needs Review
}

/**
 * Get human-readable modality name from code
 * @param modalityCode The modality code ("1" to "5")
 * @returns Human-readable modality name
 */
export function getModalityName(modalityCode: string): string {
  switch (modalityCode) {
    case "1": return "Grant";
    case "2": return "Loan";
    case "3": return "Grant – Technical Assistance";
    case "4": return "Loan – Technical Assistance";
    case "5": return "Other / Needs Review";
    default: return "Unknown";
  }
}
