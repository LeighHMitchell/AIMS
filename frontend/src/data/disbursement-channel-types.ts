export interface DisbursementChannelType {
  code: string;
  name: string;
  description: string;
}

export const DISBURSEMENT_CHANNEL_TYPES: DisbursementChannelType[] = [
  {
    code: "1",
    name: "Money is disbursed through central Ministry of Finance or Treasury",
    description: "Money is disbursed through central Ministry of Finance or Treasury"
  },
  {
    code: "2", 
    name: "Money is disbursed directly to the implementing institution and managed through a separate bank account",
    description: "Money is disbursed directly to the implementing institution and managed through a separate bank account"
  },
  {
    code: "3",
    name: "Aid in kind: Donors utilise third party agencies, e.g. NGOs or management companies", 
    description: "Aid in kind: Donors utilise third party agencies, e.g. NGOs or management companies"
  },
  {
    code: "4",
    name: "Aid in kind: Donors manage funds themselves",
    description: "Aid in kind: Donors manage funds themselves"
  }
];
