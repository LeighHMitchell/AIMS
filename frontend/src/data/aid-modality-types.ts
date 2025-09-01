export interface AidModalityType {
  code: string;
  name: string;
  description: string;
}

export const AID_MODALITY_TYPES: AidModalityType[] = [
  {
    code: "1",
    name: "Grant",
    description: "Non-repayable funds, typically public sector support"
  },
  {
    code: "2", 
    name: "Loan",
    description: "Repayable funds with terms and conditions"
  },
  {
    code: "3",
    name: "Technical Assistance", 
    description: "Personnel, training, or capacity support"
  },
  {
    code: "4",
    name: "Reimbursable Grant or Other",
    description: "Partial repayment or hybrid arrangement"
  },
  {
    code: "5",
    name: "Investment/Guarantee",
    description: "Risk capital or financial instruments without cash transfer"
  }
];
