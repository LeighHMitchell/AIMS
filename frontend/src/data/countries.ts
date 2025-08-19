// Country data with IDD codes and flag information for international phone input
export interface Country {
  code: string; // ISO 3166-1 alpha-2 code
  name: string;
  dialCode: string;
  format?: string; // Optional format pattern
}

export const countries: Country[] = [
  // Southeast Asia (prioritized for AIMS)
  { code: "MM", name: "Myanmar", dialCode: "+95", format: "### ### ####" },
  { code: "TH", name: "Thailand", dialCode: "+66", format: "## ### ####" },
  { code: "VN", name: "Vietnam", dialCode: "+84", format: "### ### ####" },
  { code: "KH", name: "Cambodia", dialCode: "+855", format: "### ### ###" },
  { code: "LA", name: "Laos", dialCode: "+856", format: "## ### ###" },
  { code: "PH", name: "Philippines", dialCode: "+63", format: "### ### ####" },
  { code: "ID", name: "Indonesia", dialCode: "+62", format: "###-###-####" },
  { code: "MY", name: "Malaysia", dialCode: "+60", format: "##-### ####" },
  { code: "SG", name: "Singapore", dialCode: "+65", format: "#### ####" },
  { code: "BN", name: "Brunei", dialCode: "+673", format: "### ####" },
  
  // Other important countries
  { code: "FR", name: "France", dialCode: "+33", format: "## ## ## ## ##" },
  { code: "DE", name: "Germany", dialCode: "+49", format: "### #### ####" },
  { code: "GB", name: "United Kingdom", dialCode: "+44", format: "#### ### ####" },
  { code: "US", name: "United States", dialCode: "+1", format: "(###) ###-####" },
  { code: "CA", name: "Canada", dialCode: "+1", format: "(###) ###-####" },
  { code: "AU", name: "Australia", dialCode: "+61", format: "#### ### ###" },
  { code: "JP", name: "Japan", dialCode: "+81", format: "###-####-####" },
  { code: "KR", name: "South Korea", dialCode: "+82", format: "###-####-####" },
  { code: "CN", name: "China", dialCode: "+86", format: "### #### ####" },
  { code: "IN", name: "India", dialCode: "+91", format: "##### #####" },
  { code: "BD", name: "Bangladesh", dialCode: "+880", format: "####-######" },
  { code: "LK", name: "Sri Lanka", dialCode: "+94", format: "## ### ####" },
  { code: "NP", name: "Nepal", dialCode: "+977", format: "###-### ####" },
  { code: "PK", name: "Pakistan", dialCode: "+92", format: "###-#######" },
  { code: "AF", name: "Afghanistan", dialCode: "+93", format: "## ### ####" },
  
  // European countries
  { code: "IT", name: "Italy", dialCode: "+39", format: "### ### ####" },
  { code: "ES", name: "Spain", dialCode: "+34", format: "### ## ## ##" },
  { code: "NL", name: "Netherlands", dialCode: "+31", format: "## ### ####" },
  { code: "BE", name: "Belgium", dialCode: "+32", format: "### ## ## ##" },
  { code: "CH", name: "Switzerland", dialCode: "+41", format: "## ### ## ##" },
  { code: "AT", name: "Austria", dialCode: "+43", format: "### ######" },
  { code: "SE", name: "Sweden", dialCode: "+46", format: "##-### ## ##" },
  { code: "NO", name: "Norway", dialCode: "+47", format: "### ## ###" },
  { code: "DK", name: "Denmark", dialCode: "+45", format: "## ## ## ##" },
  { code: "FI", name: "Finland", dialCode: "+358", format: "## ### ####" },
  
  // African countries (development partners)
  { code: "KE", name: "Kenya", dialCode: "+254", format: "### ######" },
  { code: "TZ", name: "Tanzania", dialCode: "+255", format: "### ### ###" },
  { code: "UG", name: "Uganda", dialCode: "+256", format: "### ######" },
  { code: "RW", name: "Rwanda", dialCode: "+250", format: "### ######" },
  { code: "ET", name: "Ethiopia", dialCode: "+251", format: "### ######" },
  { code: "GH", name: "Ghana", dialCode: "+233", format: "### ### ####" },
  { code: "NG", name: "Nigeria", dialCode: "+234", format: "### ### ####" },
  { code: "ZA", name: "South Africa", dialCode: "+27", format: "## ### ####" },
  { code: "EG", name: "Egypt", dialCode: "+20", format: "### ### ####" },
  { code: "MA", name: "Morocco", dialCode: "+212", format: "###-######" },
  
  // Latin American countries
  { code: "BR", name: "Brazil", dialCode: "+55", format: "## #####-####" },
  { code: "MX", name: "Mexico", dialCode: "+52", format: "### ### ####" },
  { code: "AR", name: "Argentina", dialCode: "+54", format: "## ####-####" },
  { code: "CO", name: "Colombia", dialCode: "+57", format: "### ### ####" },
  { code: "PE", name: "Peru", dialCode: "+51", format: "### ### ###" },
  { code: "CL", name: "Chile", dialCode: "+56", format: "## #### ####" },
  
  // Middle East
  { code: "TR", name: "Turkey", dialCode: "+90", format: "### ### ####" },
  { code: "SA", name: "Saudi Arabia", dialCode: "+966", format: "## ### ####" },
  { code: "AE", name: "United Arab Emirates", dialCode: "+971", format: "## ### ####" },
  { code: "IL", name: "Israel", dialCode: "+972", format: "##-###-####" },
  { code: "JO", name: "Jordan", dialCode: "+962", format: "## #### ####" },
  { code: "LB", name: "Lebanon", dialCode: "+961", format: "## ######" },
  
  // Other regions
  { code: "RU", name: "Russia", dialCode: "+7", format: "### ###-##-##" },
  { code: "NZ", name: "New Zealand", dialCode: "+64", format: "## ### ####" },
  { code: "FJ", name: "Fiji", dialCode: "+679", format: "### ####" },
  { code: "PG", name: "Papua New Guinea", dialCode: "+675", format: "### ####" },
];

// Get default country from context instead of hardcoding
// export const DEFAULT_COUNTRY = countries.find(c => c.code === "MM") || countries[0];

// Function to find country by dial code
export const findCountryByDialCode = (dialCode: string): Country | undefined => {
  return countries.find(country => dialCode.startsWith(country.dialCode));
};

// Function to search countries by name or dial code
export const searchCountries = (query: string): Country[] => {
  const lowercaseQuery = query.toLowerCase();
  return countries.filter(country =>
    country.name.toLowerCase().includes(lowercaseQuery) ||
    country.dialCode.includes(query) ||
    country.code.toLowerCase().includes(lowercaseQuery)
  );
};

// Function to format phone number according to country format
export const formatPhoneNumber = (phoneNumber: string, country: Country): string => {
  if (!country.format) return phoneNumber;
  
  // Remove any non-digit characters
  const digits = phoneNumber.replace(/\D/g, '');
  
  // Apply the format pattern
  let formatted = '';
  let digitIndex = 0;
  
  for (let i = 0; i < country.format.length && digitIndex < digits.length; i++) {
    if (country.format[i] === '#') {
      formatted += digits[digitIndex];
      digitIndex++;
    } else {
      formatted += country.format[i];
    }
  }
  
  // Add remaining digits if any
  while (digitIndex < digits.length) {
    formatted += digits[digitIndex];
    digitIndex++;
  }
  
  return formatted;
};
