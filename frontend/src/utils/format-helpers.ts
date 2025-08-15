type Org = { name: string; shortName?: string | null };
type User = {
  title?: string | null;        // Mr, Ms, Dr, etc.
  firstName: string;
  middleName?: string | null;
  lastName: string;
  jobTitle?: string | null;     // e.g., Senior Program Manager
};

const join = (parts: Array<string | null | undefined>, sep = " ") =>
  parts.filter(Boolean).join(sep);

export const formatReportedBy = (org: Org) =>
  join([org.name, org.shortName ? `(${org.shortName})` : null], " ");

export const formatSubmittedBy = (user: User) => {
  const fullName = join([user.title, user.firstName, user.middleName, user.lastName]);
  return user.jobTitle ? `${fullName}, ${user.jobTitle}` : fullName;
};
