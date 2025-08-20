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
  
  // Major world countries
  { code: "US", name: "United States", dialCode: "+1", format: "(###) ###-####" },
  { code: "CA", name: "Canada", dialCode: "+1", format: "(###) ###-####" },
  { code: "GB", name: "United Kingdom", dialCode: "+44", format: "#### ### ####" },
  { code: "FR", name: "France", dialCode: "+33", format: "## ## ## ## ##" },
  { code: "DE", name: "Germany", dialCode: "+49", format: "### #### ####" },
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
  { code: "PL", name: "Poland", dialCode: "+48", format: "### ### ###" },
  { code: "CZ", name: "Czech Republic", dialCode: "+420", format: "### ### ###" },
  { code: "HU", name: "Hungary", dialCode: "+36", format: "## ### ####" },
  { code: "RO", name: "Romania", dialCode: "+40", format: "### ### ####" },
  { code: "BG", name: "Bulgaria", dialCode: "+359", format: "### ### ###" },
  { code: "GR", name: "Greece", dialCode: "+30", format: "### ### ####" },
  { code: "PT", name: "Portugal", dialCode: "+351", format: "### ### ###" },
  { code: "IE", name: "Ireland", dialCode: "+353", format: "### ### ####" },
  { code: "LU", name: "Luxembourg", dialCode: "+352", format: "### ### ###" },
  
  // Asia Pacific
  { code: "AU", name: "Australia", dialCode: "+61", format: "#### ### ###" },
  { code: "NZ", name: "New Zealand", dialCode: "+64", format: "## ### ####" },
  { code: "JP", name: "Japan", dialCode: "+81", format: "###-####-####" },
  { code: "KR", name: "South Korea", dialCode: "+82", format: "###-####-####" },
  { code: "CN", name: "China", dialCode: "+86", format: "### #### ####" },
  { code: "HK", name: "Hong Kong", dialCode: "+852", format: "#### ####" },
  { code: "TW", name: "Taiwan", dialCode: "+886", format: "### ### ###" },
  { code: "MO", name: "Macau", dialCode: "+853", format: "#### ####" },
  { code: "IN", name: "India", dialCode: "+91", format: "##### #####" },
  { code: "BD", name: "Bangladesh", dialCode: "+880", format: "####-######" },
  { code: "LK", name: "Sri Lanka", dialCode: "+94", format: "## ### ####" },
  { code: "NP", name: "Nepal", dialCode: "+977", format: "###-### ####" },
  { code: "PK", name: "Pakistan", dialCode: "+92", format: "###-#######" },
  { code: "AF", name: "Afghanistan", dialCode: "+93", format: "## ### ####" },
  { code: "MV", name: "Maldives", dialCode: "+960", format: "###-####" },
  { code: "BT", name: "Bhutan", dialCode: "+975", format: "## ### ###" },
  
  // Middle East
  { code: "TR", name: "Turkey", dialCode: "+90", format: "### ### ####" },
  { code: "SA", name: "Saudi Arabia", dialCode: "+966", format: "## ### ####" },
  { code: "AE", name: "United Arab Emirates", dialCode: "+971", format: "## ### ####" },
  { code: "IL", name: "Israel", dialCode: "+972", format: "##-###-####" },
  { code: "JO", name: "Jordan", dialCode: "+962", format: "## #### ####" },
  { code: "LB", name: "Lebanon", dialCode: "+961", format: "## ######" },
  { code: "SY", name: "Syria", dialCode: "+963", format: "### ### ###" },
  { code: "IQ", name: "Iraq", dialCode: "+964", format: "### ### ####" },
  { code: "IR", name: "Iran", dialCode: "+98", format: "### ### ####" },
  { code: "KW", name: "Kuwait", dialCode: "+965", format: "#### ####" },
  { code: "QA", name: "Qatar", dialCode: "+974", format: "#### ####" },
  { code: "BH", name: "Bahrain", dialCode: "+973", format: "#### ####" },
  { code: "OM", name: "Oman", dialCode: "+968", format: "#### ####" },
  { code: "YE", name: "Yemen", dialCode: "+967", format: "### ### ###" },
  
  // Africa
  { code: "ZA", name: "South Africa", dialCode: "+27", format: "## ### ####" },
  { code: "DZ", name: "Algeria", dialCode: "+213", format: "### ### ###" },
  { code: "TN", name: "Tunisia", dialCode: "+216", format: "## ### ###" },
  { code: "LY", name: "Libya", dialCode: "+218", format: "###-#######" },
  { code: "SD", name: "Sudan", dialCode: "+249", format: "### ### ###" },
  { code: "SS", name: "South Sudan", dialCode: "+211", format: "### ### ###" },
  { code: "DJ", name: "Djibouti", dialCode: "+253", format: "## ## ## ##" },
  { code: "SO", name: "Somalia", dialCode: "+252", format: "### ### ###" },
  { code: "ER", name: "Eritrea", dialCode: "+291", format: "### ####" },
  { code: "MG", name: "Madagascar", dialCode: "+261", format: "## ## ### ##" },
  { code: "MU", name: "Mauritius", dialCode: "+230", format: "#### ####" },
  { code: "SC", name: "Seychelles", dialCode: "+248", format: "### ####" },
  { code: "KM", name: "Comoros", dialCode: "+269", format: "### ####" },
  { code: "ZW", name: "Zimbabwe", dialCode: "+263", format: "### ######" },
  { code: "ZM", name: "Zambia", dialCode: "+260", format: "### ######" },
  { code: "MW", name: "Malawi", dialCode: "+265", format: "### ### ###" },
  { code: "MZ", name: "Mozambique", dialCode: "+258", format: "### ### ###" },
  { code: "BW", name: "Botswana", dialCode: "+267", format: "### ####" },
  { code: "NA", name: "Namibia", dialCode: "+264", format: "## ### ####" },
  { code: "SZ", name: "Eswatini", dialCode: "+268", format: "#### ####" },
  { code: "LS", name: "Lesotho", dialCode: "+266", format: "#### ####" },
  { code: "AO", name: "Angola", dialCode: "+244", format: "### ### ###" },
  { code: "CM", name: "Cameroon", dialCode: "+237", format: "#### ####" },
  { code: "TD", name: "Chad", dialCode: "+235", format: "## ## ## ##" },
  { code: "CF", name: "Central African Republic", dialCode: "+236", format: "## ## ## ##" },
  { code: "CG", name: "Republic of the Congo", dialCode: "+242", format: "## ### ####" },
  { code: "CD", name: "Democratic Republic of the Congo", dialCode: "+243", format: "### ### ###" },
  { code: "GA", name: "Gabon", dialCode: "+241", format: "## ## ## ##" },
  { code: "GQ", name: "Equatorial Guinea", dialCode: "+240", format: "### ### ###" },
  { code: "ST", name: "São Tomé and Príncipe", dialCode: "+239", format: "### ####" },
  { code: "BF", name: "Burkina Faso", dialCode: "+226", format: "## ## ## ##" },
  { code: "ML", name: "Mali", dialCode: "+223", format: "## ## ## ##" },
  { code: "NE", name: "Niger", dialCode: "+227", format: "## ## ## ##" },
  { code: "SN", name: "Senegal", dialCode: "+221", format: "## ### ## ##" },
  { code: "GM", name: "Gambia", dialCode: "+220", format: "### ####" },
  { code: "GW", name: "Guinea-Bissau", dialCode: "+245", format: "### ####" },
  { code: "GN", name: "Guinea", dialCode: "+224", format: "### ### ###" },
  { code: "SL", name: "Sierra Leone", dialCode: "+232", format: "## ######" },
  { code: "LR", name: "Liberia", dialCode: "+231", format: "### ### ###" },
  { code: "CI", name: "Côte d'Ivoire", dialCode: "+225", format: "## ## ## ##" },
  { code: "TG", name: "Togo", dialCode: "+228", format: "## ## ## ##" },
  { code: "BJ", name: "Benin", dialCode: "+229", format: "## ## ## ##" },
  
  // Latin America & Caribbean
  { code: "BR", name: "Brazil", dialCode: "+55", format: "## #####-####" },
  { code: "MX", name: "Mexico", dialCode: "+52", format: "### ### ####" },
  { code: "AR", name: "Argentina", dialCode: "+54", format: "## ####-####" },
  { code: "CO", name: "Colombia", dialCode: "+57", format: "### ### ####" },
  { code: "PE", name: "Peru", dialCode: "+51", format: "### ### ###" },
  { code: "CL", name: "Chile", dialCode: "+56", format: "## #### ####" },
  { code: "VE", name: "Venezuela", dialCode: "+58", format: "###-#######" },
  { code: "EC", name: "Ecuador", dialCode: "+593", format: "### ### ####" },
  { code: "BO", name: "Bolivia", dialCode: "+591", format: "### #####" },
  { code: "PY", name: "Paraguay", dialCode: "+595", format: "### ######" },
  { code: "UY", name: "Uruguay", dialCode: "+598", format: "#### ####" },
  { code: "GY", name: "Guyana", dialCode: "+592", format: "### ####" },
  { code: "SR", name: "Suriname", dialCode: "+597", format: "###-####" },
  { code: "GF", name: "French Guiana", dialCode: "+594", format: "### ## ## ##" },
  { code: "CR", name: "Costa Rica", dialCode: "+506", format: "#### ####" },
  { code: "PA", name: "Panama", dialCode: "+507", format: "#### ####" },
  { code: "NI", name: "Nicaragua", dialCode: "+505", format: "#### ####" },
  { code: "HN", name: "Honduras", dialCode: "+504", format: "#### ####" },
  { code: "SV", name: "El Salvador", dialCode: "+503", format: "#### ####" },
  { code: "GT", name: "Guatemala", dialCode: "+502", format: "#### ####" },
  { code: "BZ", name: "Belize", dialCode: "+501", format: "###-####" },
  { code: "CU", name: "Cuba", dialCode: "+53", format: "### #####" },
  { code: "JM", name: "Jamaica", dialCode: "+1876", format: "###-####" },
  { code: "HT", name: "Haiti", dialCode: "+509", format: "## ## ####" },
  { code: "DO", name: "Dominican Republic", dialCode: "+1809", format: "###-####" },
  { code: "TT", name: "Trinidad and Tobago", dialCode: "+1868", format: "###-####" },
  { code: "BB", name: "Barbados", dialCode: "+1246", format: "###-####" },
  
  // Europe (additional)
  { code: "RU", name: "Russia", dialCode: "+7", format: "### ###-##-##" },
  { code: "UA", name: "Ukraine", dialCode: "+380", format: "## ### ## ##" },
  { code: "BY", name: "Belarus", dialCode: "+375", format: "## ###-##-##" },
  { code: "MD", name: "Moldova", dialCode: "+373", format: "#### ####" },
  { code: "LT", name: "Lithuania", dialCode: "+370", format: "### #####" },
  { code: "LV", name: "Latvia", dialCode: "+371", format: "## ### ###" },
  { code: "EE", name: "Estonia", dialCode: "+372", format: "#### ####" },
  { code: "SK", name: "Slovakia", dialCode: "+421", format: "### ### ###" },
  { code: "SI", name: "Slovenia", dialCode: "+386", format: "## ### ###" },
  { code: "HR", name: "Croatia", dialCode: "+385", format: "## ### ####" },
  { code: "BA", name: "Bosnia and Herzegovina", dialCode: "+387", format: "## ####" },
  { code: "RS", name: "Serbia", dialCode: "+381", format: "## ### ####" },
  { code: "ME", name: "Montenegro", dialCode: "+382", format: "## ### ###" },
  { code: "MK", name: "North Macedonia", dialCode: "+389", format: "## ### ###" },
  { code: "AL", name: "Albania", dialCode: "+355", format: "### ### ###" },
  { code: "XK", name: "Kosovo", dialCode: "+383", format: "## ### ###" },
  { code: "MT", name: "Malta", dialCode: "+356", format: "#### ####" },
  { code: "CY", name: "Cyprus", dialCode: "+357", format: "## ######" },
  { code: "IS", name: "Iceland", dialCode: "+354", format: "### ####" },
  
  // Africa (comprehensive)
  { code: "KE", name: "Kenya", dialCode: "+254", format: "### ######" },
  { code: "TZ", name: "Tanzania", dialCode: "+255", format: "### ### ###" },
  { code: "UG", name: "Uganda", dialCode: "+256", format: "### ######" },
  { code: "RW", name: "Rwanda", dialCode: "+250", format: "### ######" },
  { code: "BI", name: "Burundi", dialCode: "+257", format: "## ## ## ##" },
  { code: "ET", name: "Ethiopia", dialCode: "+251", format: "### ######" },
  { code: "GH", name: "Ghana", dialCode: "+233", format: "### ### ####" },
  { code: "NG", name: "Nigeria", dialCode: "+234", format: "### ### ####" },
  { code: "EG", name: "Egypt", dialCode: "+20", format: "### ### ####" },
  { code: "MA", name: "Morocco", dialCode: "+212", format: "###-######" },
  { code: "DZ", name: "Algeria", dialCode: "+213", format: "### ### ###" },
  { code: "TN", name: "Tunisia", dialCode: "+216", format: "## ### ###" },
  { code: "LY", name: "Libya", dialCode: "+218", format: "###-#######" },
  { code: "SD", name: "Sudan", dialCode: "+249", format: "### ### ###" },
  { code: "SS", name: "South Sudan", dialCode: "+211", format: "### ### ###" },
  { code: "DJ", name: "Djibouti", dialCode: "+253", format: "## ## ## ##" },
  { code: "SO", name: "Somalia", dialCode: "+252", format: "### ### ###" },
  { code: "ER", name: "Eritrea", dialCode: "+291", format: "### ####" },
  { code: "MG", name: "Madagascar", dialCode: "+261", format: "## ## ### ##" },
  { code: "MU", name: "Mauritius", dialCode: "+230", format: "#### ####" },
  { code: "SC", name: "Seychelles", dialCode: "+248", format: "### ####" },
  { code: "KM", name: "Comoros", dialCode: "+269", format: "### ####" },
  { code: "ZW", name: "Zimbabwe", dialCode: "+263", format: "### ######" },
  { code: "ZM", name: "Zambia", dialCode: "+260", format: "### ######" },
  { code: "MW", name: "Malawi", dialCode: "+265", format: "### ### ###" },
  { code: "MZ", name: "Mozambique", dialCode: "+258", format: "### ### ###" },
  { code: "BW", name: "Botswana", dialCode: "+267", format: "### ####" },
  { code: "NA", name: "Namibia", dialCode: "+264", format: "## ### ####" },
  { code: "SZ", name: "Eswatini", dialCode: "+268", format: "#### ####" },
  { code: "LS", name: "Lesotho", dialCode: "+266", format: "#### ####" },
  { code: "AO", name: "Angola", dialCode: "+244", format: "### ### ###" },
  { code: "CM", name: "Cameroon", dialCode: "+237", format: "#### ####" },
  { code: "TD", name: "Chad", dialCode: "+235", format: "## ## ## ##" },
  { code: "CF", name: "Central African Republic", dialCode: "+236", format: "## ## ## ##" },
  { code: "CG", name: "Republic of the Congo", dialCode: "+242", format: "## ### ####" },
  { code: "CD", name: "Democratic Republic of the Congo", dialCode: "+243", format: "### ### ###" },
  { code: "GA", name: "Gabon", dialCode: "+241", format: "## ## ## ##" },
  { code: "GQ", name: "Equatorial Guinea", dialCode: "+240", format: "### ### ###" },
  { code: "ST", name: "São Tomé and Príncipe", dialCode: "+239", format: "### ####" },
  { code: "BF", name: "Burkina Faso", dialCode: "+226", format: "## ## ## ##" },
  { code: "ML", name: "Mali", dialCode: "+223", format: "## ## ## ##" },
  { code: "NE", name: "Niger", dialCode: "+227", format: "## ## ## ##" },
  { code: "SN", name: "Senegal", dialCode: "+221", format: "## ### ## ##" },
  { code: "GM", name: "Gambia", dialCode: "+220", format: "### ####" },
  { code: "GW", name: "Guinea-Bissau", dialCode: "+245", format: "### ####" },
  { code: "GN", name: "Guinea", dialCode: "+224", format: "### ### ###" },
  { code: "SL", name: "Sierra Leone", dialCode: "+232", format: "## ######" },
  { code: "LR", name: "Liberia", dialCode: "+231", format: "### ### ###" },
  { code: "CI", name: "Côte d'Ivoire", dialCode: "+225", format: "## ## ## ##" },
  { code: "TG", name: "Togo", dialCode: "+228", format: "## ## ## ##" },
  { code: "BJ", name: "Benin", dialCode: "+229", format: "## ## ## ##" },
  
  // Oceania
  { code: "FJ", name: "Fiji", dialCode: "+679", format: "### ####" },
  { code: "PG", name: "Papua New Guinea", dialCode: "+675", format: "### ####" },
  { code: "SB", name: "Solomon Islands", dialCode: "+677", format: "### ####" },
  { code: "VU", name: "Vanuatu", dialCode: "+678", format: "### ####" },
  { code: "NC", name: "New Caledonia", dialCode: "+687", format: "## ## ##" },
  { code: "PF", name: "French Polynesia", dialCode: "+689", format: "## ## ##" },
  { code: "WS", name: "Samoa", dialCode: "+685", format: "### ####" },
  { code: "TO", name: "Tonga", dialCode: "+676", format: "### ####" },
  { code: "CK", name: "Cook Islands", dialCode: "+682", format: "## ###" },
  { code: "NU", name: "Niue", dialCode: "+683", format: "####" },
  { code: "PW", name: "Palau", dialCode: "+680", format: "### ####" },
  { code: "FM", name: "Micronesia", dialCode: "+691", format: "### ####" },
  { code: "MH", name: "Marshall Islands", dialCode: "+692", format: "###-####" },
  { code: "KI", name: "Kiribati", dialCode: "+686", format: "## ###" },
  { code: "NR", name: "Nauru", dialCode: "+674", format: "### ####" },
  { code: "TV", name: "Tuvalu", dialCode: "+688", format: "### ###" },
  
  // Central Asia
  { code: "KZ", name: "Kazakhstan", dialCode: "+7", format: "### ###-##-##" },
  { code: "UZ", name: "Uzbekistan", dialCode: "+998", format: "## ### ## ##" },
  { code: "TM", name: "Turkmenistan", dialCode: "+993", format: "## ######" },
  { code: "TJ", name: "Tajikistan", dialCode: "+992", format: "### ######" },
  { code: "KG", name: "Kyrgyzstan", dialCode: "+996", format: "### ######" },
  { code: "MN", name: "Mongolia", dialCode: "+976", format: "#### ####" },
  
  // Additional Asian countries
  { code: "KP", name: "North Korea", dialCode: "+850", format: "### ### ####" },
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
