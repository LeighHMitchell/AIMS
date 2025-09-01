export interface DisbursementChannelType {
  code: string;
  name: string;
  description: string;
}

export const DISBURSEMENT_CHANNEL_TYPES: DisbursementChannelType[] = [
  {
    code: "1",
    name: "Money through government",
    description: "Funds channeled through recipient government institutions and systems"
  },
  {
    code: "2", 
    name: "Money to/through NGOs",
    description: "Funds provided directly to or through non-governmental organizations"
  },
  {
    code: "3",
    name: "Cash to recipient", 
    description: "Direct cash transfers to beneficiaries or recipient institutions"
  },
  {
    code: "4",
    name: "Aid in kind",
    description: "Non-monetary assistance including goods, services, or technical expertise"
  }
];
