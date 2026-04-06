import { IATI_COUNTRIES } from '@/data/iati-countries';

const DEFAULT_HOME_COUNTRY = 'MM';

/**
 * Fetch the system home country code (ISO 3166-1 alpha-2) from database settings.
 * Falls back to 'MM' if settings are unavailable.
 */
export async function getSystemHomeCountry(supabase: any): Promise<string> {
  try {
    const { data: settings, error } = await supabase
      .from('system_settings')
      .select('home_country')
      .single();

    if (error) {
      console.log('Error fetching system settings, using default:', error.message);
      return DEFAULT_HOME_COUNTRY;
    }

    return settings?.home_country || DEFAULT_HOME_COUNTRY;
  } catch (error) {
    console.log('System settings not found, using default');
    return DEFAULT_HOME_COUNTRY;
  }
}

/**
 * Fetch the system home country full name (e.g., 'Myanmar') from database settings.
 * Resolves the 2-letter code to a human-readable name.
 * Falls back to 'Myanmar' if settings are unavailable.
 */
export async function getSystemHomeCountryName(supabase: any): Promise<string> {
  const code = await getSystemHomeCountry(supabase);
  const country = IATI_COUNTRIES.find(c => c.code === code);
  return country?.name || code;
}
