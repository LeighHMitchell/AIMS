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
  const fullName = join([user.firstName, user.middleName, user.lastName]);
  return user.jobTitle ? `${fullName}, ${user.jobTitle}` : fullName;
};

/**
 * Format large numbers with abbreviations (k, m, b, t)
 * @param value The number to format
 * @param options Configuration options
 * @returns Formatted string (e.g., "5m", "2.5k", "1.2b")
 */
export const formatNumberWithAbbreviation = (
  value: number,
  options: {
    decimals?: number;           // Number of decimal places (default: 2)
    showDecimalsForSmall?: boolean; // Show decimals for values < 1000 (default: false)
    currency?: string;           // Currency prefix (e.g., "US$", "$")
    suffix?: string;             // Suffix to append
  } = {}
): string => {
  const {
    decimals = 2,
    showDecimalsForSmall = false,
    currency = "",
    suffix = ""
  } = options;

  if (isNaN(value) || value === null || value === undefined) {
    return "0";
  }

  const absValue = Math.abs(value);
  const sign = value < 0 ? "-" : "";

  // For very small numbers, return as-is with appropriate decimal places
  if (absValue < 1000) {
    if (showDecimalsForSmall && absValue > 0) {
      return `${sign}${currency}${absValue.toFixed(decimals)}${suffix}`;
    }
    return `${sign}${currency}${Math.round(absValue)}${suffix}`;
  }

  // Determine the appropriate abbreviation
  let abbreviatedValue: number;
  let abbreviation: string;

  if (absValue >= 1e12) {
    abbreviatedValue = absValue / 1e12;
    abbreviation = "t"; // trillion
  } else if (absValue >= 1e9) {
    abbreviatedValue = absValue / 1e9;
    abbreviation = "b"; // billion
  } else if (absValue >= 1e6) {
    abbreviatedValue = absValue / 1e6;
    abbreviation = "m"; // million
  } else if (absValue >= 1e3) {
    abbreviatedValue = absValue / 1e3;
    abbreviation = "k"; // thousand
  } else {
    abbreviatedValue = absValue;
    abbreviation = "";
  }

  // Format the abbreviated value
  const formattedValue = abbreviatedValue % 1 === 0 
    ? abbreviatedValue.toString() 
    : abbreviatedValue.toFixed(decimals);

  return `${sign}${currency}${formattedValue}${abbreviation}${suffix}`;
};
