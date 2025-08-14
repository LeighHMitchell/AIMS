export interface ContactType {
  code: string;
  name: string;
  description: string;
}

export const CONTACT_TYPES: ContactType[] = [
  {
    code: "1",
    name: "General Enquiries",
    description: "General Enquiries"
  },
  {
    code: "2",
    name: "Project Management",
    description: "Project Management"
  },
  {
    code: "3",
    name: "Financial Management",
    description: "Financial Management"
  },
  {
    code: "4",
    name: "Communications",
    description: "Communications"
  }
];
