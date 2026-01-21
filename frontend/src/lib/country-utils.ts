// ISO 3166-1 alpha-2 country codes mapping
export const COUNTRY_ISO_CODES: Record<string, string> = {
  'Myanmar': 'MM',
  'Cambodia': 'KH',
  'Thailand': 'TH',
  'Philippines': 'PH',
  'Indonesia': 'ID',
  'Vietnam': 'VN',
  'Laos': 'LA',
  'Malaysia': 'MY',
  'Singapore': 'SG',
  'Brunei': 'BN',
  'Timor-Leste': 'TL',
  'Australia': 'AU',
  'New Zealand': 'NZ',
  'Japan': 'JP',
  'South Korea': 'KR',
  'China': 'CN',
  'India': 'IN',
  'Bangladesh': 'BD',
  'Pakistan': 'PK',
  'Afghanistan': 'AF',
  'Sri Lanka': 'LK',
  'Nepal': 'NP',
  'Bhutan': 'BT',
  'United States': 'US',
  'United States of America': 'US',
  'United States of America (the)': 'US',
  'United Kingdom': 'GB',
  'Germany': 'DE',
  'France': 'FR',
  'Canada': 'CA',
  'Netherlands': 'NL',
  'Belgium': 'BE',
  'Switzerland': 'CH',
  'Sweden': 'SE',
  'Norway': 'NO',
  'Denmark': 'DK',
  'Finland': 'FI',
  'Italy': 'IT',
  'Spain': 'ES',
  'Austria': 'AT',
  'Global': 'UN', // For global organizations
}

export const getCountryCode = (country: string | null | undefined): string | null => {
  if (!country) return null
  const normalizedCountry = country.trim()
  return COUNTRY_ISO_CODES[normalizedCountry] || null
}

export const getCountryFullName = (countryCode: string | null | undefined): string => {
  if (!countryCode) return ''
  // Find the country name from the COUNTRY_ISO_CODES mapping
  const entry = Object.entries(COUNTRY_ISO_CODES).find(([_, code]) => code === countryCode)
  return entry ? entry[0] : countryCode
} 