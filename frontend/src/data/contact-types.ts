export interface ContactType {
  code: string;
  name: string;
  description: string;
}

export const CONTACT_TYPES: ContactType[] = [
  {
    code: "1",
    name: "General Enquiries",
    description: "The main public-facing contact point for queries about the organisation or activity."
  },
  {
    code: "2",
    name: "Project Management",
    description: "The person or team responsible for managing the implementation of the activity."
  },
  {
    code: "3",
    name: "Financial Management",
    description: "The person or team responsible for budgets, accounts, and financial reporting."
  },
  {
    code: "4",
    name: "Communications",
    description: "The press, media, or public relations contact."
  },
  {
    code: "5",
    name: "Monitoring and Evaluation",
    description: "The person or team responsible for results tracking, reporting, and evaluation."
  },
  {
    code: "6",
    name: "Technical Assistance",
    description: "A technical focal point who can answer questions about methods, systems, or specific expertise related to the activity."
  }
];
