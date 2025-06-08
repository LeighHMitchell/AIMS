import React from "react";
import { HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Organization field help texts
export const ORGANIZATION_FIELD_HELP = {
  iatiOrgId: "Enter the IATI Organisation Identifier if available. This will later be used to auto-fill other fields from the IATI Datastore (not yet implemented).",
  fullName: "Enter the official full name of the organisation, as registered or publicly recognised.",
  acronym: "Enter a commonly used abbreviation, e.g., DFAT, UNDP.",
  countryRepresented: "Choose the country the organisation represents or is registered in.",
  organisationType: "Select the type of organisation from the IATI Organisation Type codelist.",
  cooperationModality: "Select the cooperation modality that best describes how this organization cooperates with the focus country.",
  isDevelopmentPartner: "Indicates whether this organization is considered a development partner. Automatically set based on cooperation modality but can be manually adjusted.",
  orgClassification: "Auto-calculated classification based on country, organization type, and development partner status. Used for grouping and filtering organizations.",
  uuid: "This is the system-generated unique identifier (UUID) for this organization. It is used internally for database references and cannot be changed.",
};

// Organization type options with descriptions
export const ORGANIZATION_TYPES = [
  { value: "10", label: "Government", description: "National governments (donor or recipient), including central aid coordination bodies." },
  { value: "11", label: "Local Government", description: "Sub-national public authorities such as provincial or municipal governments." },
  { value: "12", label: "Other Public Sector", description: "Government-linked bodies that are neither central nor local government." },
  { value: "21", label: "International NGO", description: "NGOs operating across countries or internationally affiliated." },
  { value: "22", label: "National NGO", description: "NGOs operating only within one country." },
  { value: "23", label: "Partner Country based NGO", description: "Local CSOs and NGOs operating in the aid recipient country." },
  { value: "31", label: "Public Private Partnership", description: "Hybrid organisations involving both government and private sector." },
  { value: "60", label: "Foundation", description: "Philanthropic or grant-making organisations." },
  { value: "71", label: "Private Sector in Provider Country", description: "Private companies from a donor/provider country." },
  { value: "72", label: "Private Sector in Aid Recipient Country", description: "Private companies operating in a recipient country." },
  { value: "73", label: "Private Sector in Third Country", description: "Private companies from outside both donor and recipient countries." },
  { value: "80", label: "Academic, Training and Research", description: "Universities, training centres, or research institutions." },
  { value: "40", label: "Multilateral", description: "Organisations with multiple member states (e.g., UN agencies, MDBs)." },
  { value: "30", label: "Regional Organisation", description: "Organisations representing a defined group of countries." },
  { value: "90", label: "Other", description: "Catch-all for organisations not listed above." },
];

// Calculate cooperation modality based on country and organization type
export const calculateCooperationModality = (
  country: string, 
  organisationType: string, 
  focusCountry: string = "Myanmar" // Default focus country
): string => {
  if (!country || !organisationType) return "";
  
  const internalTypes = ["10", "11", "22", "23", "72"];
  const externalTypes = ["10", "21", "60", "71"];
  
  // Handle Global/Not Country-Specific
  if (country === "GLOBAL") {
    if (organisationType === "40") {
      return "Multilateral/Global";
    }
    if (organisationType === "30") {
      return "Regional";
    }
    return "Global";
  }
  
  if (organisationType === "40") {
    return "Multilateral/Global";
  }
  
  if (organisationType === "30") {
    return "Regional";
  }
  
  if (country === focusCountry && internalTypes.includes(organisationType)) {
    return "Internal";
  }
  
  if (country !== focusCountry && externalTypes.includes(organisationType)) {
    return "External";
  }
  
  return "Other";
};

// Calculate organization classification based on country, type, and development partner status
export const calculateOrgClassification = (
  country: string,
  organisationType: string,
  isDevelopmentPartner: boolean | null
): string => {
  // Normalize country representation
  const normalizedCountry = country === 'AU' ? 'Australia' : 
                           country === 'MM' ? 'Myanmar' : 
                           country === 'PH' ? 'Philippines' : 
                           country;
  
  // If Myanmar government entities
  if ((normalizedCountry === 'Myanmar' || country === 'MM') && ['10', '11'].includes(organisationType)) {
    return 'Partner Government';
  }
  
  // If explicitly marked as development partner
  if (isDevelopmentPartner === true) {
    return 'Development Partner';
  }
  
  // If organisation_type = '20' (International NGO legacy code)
  if (organisationType === '20') {
    return 'Civil Society – International';
  }
  
  // For government entities (type 10) from non-Myanmar countries, assume development partners
  if (organisationType === '10' && normalizedCountry !== 'Myanmar' && country !== 'MM') {
    return 'Development Partner';
  }
  
  // For multilateral organizations (type 40), assume development partners
  if (organisationType === '40') {
    return 'Development Partner';
  }
  
  // Civil society organizations
  if (['21', '22', '23', '60'].includes(organisationType)) {
    if (normalizedCountry === 'Myanmar' || country === 'MM') {
      return 'Civil Society – Domestic';
    } else {
      return 'Civil Society – International';
    }
  }
  
  // Private sector organizations - specific handling per requirements
  if (organisationType === '71') {
    if (normalizedCountry === 'Myanmar' || country === 'MM') {
      return 'Private Sector – Domestic';
    } else {
      return 'Private Sector – International';
    }
  }
  
  // Type '72' is always domestic per requirements
  if (organisationType === '72') {
    return 'Private Sector – Domestic';
  }
  
  // Legacy handling for '73' (not in new requirements, but keeping for backward compatibility)
  if (organisationType === '73') {
    if (normalizedCountry === 'Myanmar' || country === 'MM') {
      return 'Private Sector – Domestic';
    } else {
      return 'Private Sector – International';
    }
  }
  
  // Default fallback
  return 'Other';
};

interface FieldHelpProps {
  field: string;
  className?: string;
}

export const OrganizationFieldHelp: React.FC<FieldHelpProps> = ({ field, className = "" }) => {
  const helpText = ORGANIZATION_FIELD_HELP[field as keyof typeof ORGANIZATION_FIELD_HELP];
  
  if (!helpText) return null;
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <HelpCircle className={`h-3.5 w-3.5 text-gray-400 hover:text-gray-600 cursor-pointer inline-block ml-1 ${className}`} />
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p>{helpText}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// Countries list (can be expanded)
export const COUNTRIES = [
  { value: "GLOBAL", label: "🌐 Global / Not Country-Specific" },
  { value: "AF", label: "Afghanistan" },
  { value: "AL", label: "Albania" },
  { value: "DZ", label: "Algeria" },
  { value: "AD", label: "Andorra" },
  { value: "AO", label: "Angola" },
  { value: "AG", label: "Antigua and Barbuda" },
  { value: "AR", label: "Argentina" },
  { value: "AM", label: "Armenia" },
  { value: "AU", label: "Australia" },
  { value: "AT", label: "Austria" },
  { value: "AZ", label: "Azerbaijan" },
  { value: "BS", label: "Bahamas" },
  { value: "BH", label: "Bahrain" },
  { value: "BD", label: "Bangladesh" },
  { value: "BB", label: "Barbados" },
  { value: "BY", label: "Belarus" },
  { value: "BE", label: "Belgium" },
  { value: "BZ", label: "Belize" },
  { value: "BJ", label: "Benin" },
  { value: "BT", label: "Bhutan" },
  { value: "BO", label: "Bolivia" },
  { value: "BA", label: "Bosnia and Herzegovina" },
  { value: "BW", label: "Botswana" },
  { value: "BR", label: "Brazil" },
  { value: "BN", label: "Brunei" },
  { value: "BG", label: "Bulgaria" },
  { value: "BF", label: "Burkina Faso" },
  { value: "BI", label: "Burundi" },
  { value: "KH", label: "Cambodia" },
  { value: "CM", label: "Cameroon" },
  { value: "CA", label: "Canada" },
  { value: "CV", label: "Cape Verde" },
  { value: "CF", label: "Central African Republic" },
  { value: "TD", label: "Chad" },
  { value: "CL", label: "Chile" },
  { value: "CN", label: "China" },
  { value: "CO", label: "Colombia" },
  { value: "KM", label: "Comoros" },
  { value: "CG", label: "Congo" },
  { value: "CD", label: "Congo (DRC)" },
  { value: "CR", label: "Costa Rica" },
  { value: "CI", label: "Côte d'Ivoire" },
  { value: "HR", label: "Croatia" },
  { value: "CU", label: "Cuba" },
  { value: "CY", label: "Cyprus" },
  { value: "CZ", label: "Czech Republic" },
  { value: "DK", label: "Denmark" },
  { value: "DJ", label: "Djibouti" },
  { value: "DM", label: "Dominica" },
  { value: "DO", label: "Dominican Republic" },
  { value: "EC", label: "Ecuador" },
  { value: "EG", label: "Egypt" },
  { value: "SV", label: "El Salvador" },
  { value: "GQ", label: "Equatorial Guinea" },
  { value: "ER", label: "Eritrea" },
  { value: "EE", label: "Estonia" },
  { value: "ET", label: "Ethiopia" },
  { value: "FJ", label: "Fiji" },
  { value: "FI", label: "Finland" },
  { value: "FR", label: "France" },
  { value: "GA", label: "Gabon" },
  { value: "GM", label: "Gambia" },
  { value: "GE", label: "Georgia" },
  { value: "DE", label: "Germany" },
  { value: "GH", label: "Ghana" },
  { value: "GR", label: "Greece" },
  { value: "GD", label: "Grenada" },
  { value: "GT", label: "Guatemala" },
  { value: "GN", label: "Guinea" },
  { value: "GW", label: "Guinea-Bissau" },
  { value: "GY", label: "Guyana" },
  { value: "HT", label: "Haiti" },
  { value: "HN", label: "Honduras" },
  { value: "HU", label: "Hungary" },
  { value: "IS", label: "Iceland" },
  { value: "IN", label: "India" },
  { value: "ID", label: "Indonesia" },
  { value: "IR", label: "Iran" },
  { value: "IQ", label: "Iraq" },
  { value: "IE", label: "Ireland" },
  { value: "IL", label: "Israel" },
  { value: "IT", label: "Italy" },
  { value: "JM", label: "Jamaica" },
  { value: "JP", label: "Japan" },
  { value: "JO", label: "Jordan" },
  { value: "KZ", label: "Kazakhstan" },
  { value: "KE", label: "Kenya" },
  { value: "KI", label: "Kiribati" },
  { value: "KP", label: "Korea (North)" },
  { value: "KR", label: "Korea (South)" },
  { value: "KW", label: "Kuwait" },
  { value: "KG", label: "Kyrgyzstan" },
  { value: "LA", label: "Lao PDR" },
  { value: "LV", label: "Latvia" },
  { value: "LB", label: "Lebanon" },
  { value: "LS", label: "Lesotho" },
  { value: "LR", label: "Liberia" },
  { value: "LY", label: "Libya" },
  { value: "LI", label: "Liechtenstein" },
  { value: "LT", label: "Lithuania" },
  { value: "LU", label: "Luxembourg" },
  { value: "MK", label: "Macedonia" },
  { value: "MG", label: "Madagascar" },
  { value: "MW", label: "Malawi" },
  { value: "MY", label: "Malaysia" },
  { value: "MV", label: "Maldives" },
  { value: "ML", label: "Mali" },
  { value: "MT", label: "Malta" },
  { value: "MH", label: "Marshall Islands" },
  { value: "MR", label: "Mauritania" },
  { value: "MU", label: "Mauritius" },
  { value: "MX", label: "Mexico" },
  { value: "FM", label: "Micronesia" },
  { value: "MD", label: "Moldova" },
  { value: "MC", label: "Monaco" },
  { value: "MN", label: "Mongolia" },
  { value: "ME", label: "Montenegro" },
  { value: "MA", label: "Morocco" },
  { value: "MZ", label: "Mozambique" },
  { value: "MM", label: "Myanmar" },
  { value: "NA", label: "Namibia" },
  { value: "NR", label: "Nauru" },
  { value: "NP", label: "Nepal" },
  { value: "NL", label: "Netherlands" },
  { value: "NZ", label: "New Zealand" },
  { value: "NI", label: "Nicaragua" },
  { value: "NE", label: "Niger" },
  { value: "NG", label: "Nigeria" },
  { value: "NO", label: "Norway" },
  { value: "OM", label: "Oman" },
  { value: "PK", label: "Pakistan" },
  { value: "PW", label: "Palau" },
  { value: "PA", label: "Panama" },
  { value: "PG", label: "Papua New Guinea" },
  { value: "PY", label: "Paraguay" },
  { value: "PE", label: "Peru" },
  { value: "PH", label: "Philippines" },
  { value: "PL", label: "Poland" },
  { value: "PT", label: "Portugal" },
  { value: "QA", label: "Qatar" },
  { value: "RO", label: "Romania" },
  { value: "RU", label: "Russia" },
  { value: "RW", label: "Rwanda" },
  { value: "KN", label: "Saint Kitts and Nevis" },
  { value: "LC", label: "Saint Lucia" },
  { value: "VC", label: "Saint Vincent and the Grenadines" },
  { value: "WS", label: "Samoa" },
  { value: "SM", label: "San Marino" },
  { value: "ST", label: "São Tomé and Príncipe" },
  { value: "SA", label: "Saudi Arabia" },
  { value: "SN", label: "Senegal" },
  { value: "RS", label: "Serbia" },
  { value: "SC", label: "Seychelles" },
  { value: "SL", label: "Sierra Leone" },
  { value: "SG", label: "Singapore" },
  { value: "SK", label: "Slovakia" },
  { value: "SI", label: "Slovenia" },
  { value: "SB", label: "Solomon Islands" },
  { value: "SO", label: "Somalia" },
  { value: "ZA", label: "South Africa" },
  { value: "SS", label: "South Sudan" },
  { value: "ES", label: "Spain" },
  { value: "LK", label: "Sri Lanka" },
  { value: "SD", label: "Sudan" },
  { value: "SR", label: "Suriname" },
  { value: "SZ", label: "Swaziland" },
  { value: "SE", label: "Sweden" },
  { value: "CH", label: "Switzerland" },
  { value: "SY", label: "Syria" },
  { value: "TW", label: "Taiwan" },
  { value: "TJ", label: "Tajikistan" },
  { value: "TZ", label: "Tanzania" },
  { value: "TH", label: "Thailand" },
  { value: "TL", label: "Timor-Leste" },
  { value: "TG", label: "Togo" },
  { value: "TO", label: "Tonga" },
  { value: "TT", label: "Trinidad and Tobago" },
  { value: "TN", label: "Tunisia" },
  { value: "TR", label: "Turkey" },
  { value: "TM", label: "Turkmenistan" },
  { value: "TV", label: "Tuvalu" },
  { value: "UG", label: "Uganda" },
  { value: "UA", label: "Ukraine" },
  { value: "AE", label: "United Arab Emirates" },
  { value: "GB", label: "United Kingdom" },
  { value: "US", label: "United States" },
  { value: "UY", label: "Uruguay" },
  { value: "UZ", label: "Uzbekistan" },
  { value: "VU", label: "Vanuatu" },
  { value: "VA", label: "Vatican City" },
  { value: "VE", label: "Venezuela" },
  { value: "VN", label: "Vietnam" },
  { value: "YE", label: "Yemen" },
  { value: "ZM", label: "Zambia" },
  { value: "ZW", label: "Zimbabwe" }
].sort((a, b) => a.label.localeCompare(b.label)); 