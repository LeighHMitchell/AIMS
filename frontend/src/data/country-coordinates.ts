// Country center coordinates for map centering
// Coordinates are approximate geographic centers suitable for map views

export interface CountryCoordinates {
  code: string;
  name: string;
  center: [number, number]; // [latitude, longitude]
  zoom: number; // recommended zoom level for country view
}

// Map of country ISO codes to their geographic centers
export const COUNTRY_COORDINATES: Record<string, CountryCoordinates> = {
  // Southeast Asia
  MM: { code: "MM", name: "Myanmar", center: [21.9162, 95.9560], zoom: 6 },
  TH: { code: "TH", name: "Thailand", center: [15.8700, 100.9925], zoom: 6 },
  VN: { code: "VN", name: "Vietnam", center: [14.0583, 108.2772], zoom: 6 },
  KH: { code: "KH", name: "Cambodia", center: [12.5657, 104.9910], zoom: 7 },
  LA: { code: "LA", name: "Laos", center: [19.8563, 102.4955], zoom: 7 },
  PH: { code: "PH", name: "Philippines", center: [12.8797, 121.7740], zoom: 6 },
  ID: { code: "ID", name: "Indonesia", center: [-0.7893, 113.9213], zoom: 5 },
  MY: { code: "MY", name: "Malaysia", center: [4.2105, 101.9758], zoom: 6 },
  SG: { code: "SG", name: "Singapore", center: [1.3521, 103.8198], zoom: 11 },
  BN: { code: "BN", name: "Brunei", center: [4.5353, 114.7277], zoom: 9 },
  TL: { code: "TL", name: "Timor-Leste", center: [-8.8742, 125.7275], zoom: 9 },

  // South Asia
  IN: { code: "IN", name: "India", center: [20.5937, 78.9629], zoom: 5 },
  BD: { code: "BD", name: "Bangladesh", center: [23.6850, 90.3563], zoom: 7 },
  LK: { code: "LK", name: "Sri Lanka", center: [7.8731, 80.7718], zoom: 8 },
  NP: { code: "NP", name: "Nepal", center: [28.3949, 84.1240], zoom: 7 },
  PK: { code: "PK", name: "Pakistan", center: [30.3753, 69.3451], zoom: 6 },
  AF: { code: "AF", name: "Afghanistan", center: [33.9391, 67.7100], zoom: 6 },
  MV: { code: "MV", name: "Maldives", center: [3.2028, 73.2207], zoom: 7 },
  BT: { code: "BT", name: "Bhutan", center: [27.5142, 90.4336], zoom: 8 },

  // East Asia
  JP: { code: "JP", name: "Japan", center: [36.2048, 138.2529], zoom: 5 },
  KR: { code: "KR", name: "South Korea", center: [35.9078, 127.7669], zoom: 7 },
  CN: { code: "CN", name: "China", center: [35.8617, 104.1954], zoom: 4 },
  HK: { code: "HK", name: "Hong Kong", center: [22.3193, 114.1694], zoom: 11 },
  TW: { code: "TW", name: "Taiwan", center: [23.6978, 120.9605], zoom: 8 },
  MO: { code: "MO", name: "Macau", center: [22.1987, 113.5439], zoom: 13 },
  MN: { code: "MN", name: "Mongolia", center: [46.8625, 103.8467], zoom: 5 },
  KP: { code: "KP", name: "North Korea", center: [40.3399, 127.5101], zoom: 7 },

  // Central Asia
  KZ: { code: "KZ", name: "Kazakhstan", center: [48.0196, 66.9237], zoom: 5 },
  UZ: { code: "UZ", name: "Uzbekistan", center: [41.3775, 64.5853], zoom: 6 },
  TM: { code: "TM", name: "Turkmenistan", center: [38.9697, 59.5563], zoom: 6 },
  TJ: { code: "TJ", name: "Tajikistan", center: [38.8610, 71.2761], zoom: 7 },
  KG: { code: "KG", name: "Kyrgyzstan", center: [41.2044, 74.7661], zoom: 7 },

  // Middle East
  TR: { code: "TR", name: "Turkey", center: [38.9637, 35.2433], zoom: 6 },
  SA: { code: "SA", name: "Saudi Arabia", center: [23.8859, 45.0792], zoom: 5 },
  AE: { code: "AE", name: "United Arab Emirates", center: [23.4241, 53.8478], zoom: 7 },
  IL: { code: "IL", name: "Israel", center: [31.0461, 34.8516], zoom: 8 },
  JO: { code: "JO", name: "Jordan", center: [30.5852, 36.2384], zoom: 8 },
  LB: { code: "LB", name: "Lebanon", center: [33.8547, 35.8623], zoom: 9 },
  SY: { code: "SY", name: "Syria", center: [34.8021, 38.9968], zoom: 7 },
  IQ: { code: "IQ", name: "Iraq", center: [33.2232, 43.6793], zoom: 6 },
  IR: { code: "IR", name: "Iran", center: [32.4279, 53.6880], zoom: 5 },
  KW: { code: "KW", name: "Kuwait", center: [29.3117, 47.4818], zoom: 9 },
  QA: { code: "QA", name: "Qatar", center: [25.3548, 51.1839], zoom: 9 },
  BH: { code: "BH", name: "Bahrain", center: [26.0667, 50.5577], zoom: 10 },
  OM: { code: "OM", name: "Oman", center: [21.4735, 55.9754], zoom: 6 },
  YE: { code: "YE", name: "Yemen", center: [15.5527, 48.5164], zoom: 6 },

  // Africa - East
  KE: { code: "KE", name: "Kenya", center: [-0.0236, 37.9062], zoom: 6 },
  TZ: { code: "TZ", name: "Tanzania", center: [-6.3690, 34.8888], zoom: 6 },
  UG: { code: "UG", name: "Uganda", center: [1.3733, 32.2903], zoom: 7 },
  RW: { code: "RW", name: "Rwanda", center: [-1.9403, 29.8739], zoom: 9 },
  BI: { code: "BI", name: "Burundi", center: [-3.3731, 29.9189], zoom: 9 },
  ET: { code: "ET", name: "Ethiopia", center: [9.1450, 40.4897], zoom: 6 },
  DJ: { code: "DJ", name: "Djibouti", center: [11.8251, 42.5903], zoom: 9 },
  SO: { code: "SO", name: "Somalia", center: [5.1521, 46.1996], zoom: 6 },
  ER: { code: "ER", name: "Eritrea", center: [15.1794, 39.7823], zoom: 7 },
  SS: { code: "SS", name: "South Sudan", center: [6.8770, 31.3070], zoom: 6 },

  // Africa - Southern
  ZA: { code: "ZA", name: "South Africa", center: [-30.5595, 22.9375], zoom: 6 },
  ZW: { code: "ZW", name: "Zimbabwe", center: [-19.0154, 29.1549], zoom: 7 },
  ZM: { code: "ZM", name: "Zambia", center: [-13.1339, 27.8493], zoom: 6 },
  MW: { code: "MW", name: "Malawi", center: [-13.2543, 34.3015], zoom: 7 },
  MZ: { code: "MZ", name: "Mozambique", center: [-18.6657, 35.5296], zoom: 6 },
  BW: { code: "BW", name: "Botswana", center: [-22.3285, 24.6849], zoom: 6 },
  NA: { code: "NA", name: "Namibia", center: [-22.9576, 18.4904], zoom: 6 },
  SZ: { code: "SZ", name: "Eswatini", center: [-26.5225, 31.4659], zoom: 9 },
  LS: { code: "LS", name: "Lesotho", center: [-29.6100, 28.2336], zoom: 9 },
  AO: { code: "AO", name: "Angola", center: [-11.2027, 17.8739], zoom: 6 },
  MG: { code: "MG", name: "Madagascar", center: [-18.7669, 46.8691], zoom: 6 },
  MU: { code: "MU", name: "Mauritius", center: [-20.3484, 57.5522], zoom: 10 },
  SC: { code: "SC", name: "Seychelles", center: [-4.6796, 55.4920], zoom: 10 },
  KM: { code: "KM", name: "Comoros", center: [-11.6455, 43.3333], zoom: 10 },

  // Africa - Central
  CD: { code: "CD", name: "Democratic Republic of the Congo", center: [-4.0383, 21.7587], zoom: 5 },
  CG: { code: "CG", name: "Republic of the Congo", center: [-0.2280, 15.8277], zoom: 6 },
  CM: { code: "CM", name: "Cameroon", center: [7.3697, 12.3547], zoom: 6 },
  CF: { code: "CF", name: "Central African Republic", center: [6.6111, 20.9394], zoom: 6 },
  TD: { code: "TD", name: "Chad", center: [15.4542, 18.7322], zoom: 5 },
  GA: { code: "GA", name: "Gabon", center: [-0.8037, 11.6094], zoom: 7 },
  GQ: { code: "GQ", name: "Equatorial Guinea", center: [1.6508, 10.2679], zoom: 9 },
  ST: { code: "ST", name: "Sao Tome and Principe", center: [0.1864, 6.6131], zoom: 10 },

  // Africa - West
  NG: { code: "NG", name: "Nigeria", center: [9.0820, 8.6753], zoom: 6 },
  GH: { code: "GH", name: "Ghana", center: [7.9465, -1.0232], zoom: 7 },
  CI: { code: "CI", name: "Cote d'Ivoire", center: [7.5400, -5.5471], zoom: 7 },
  SN: { code: "SN", name: "Senegal", center: [14.4974, -14.4524], zoom: 7 },
  ML: { code: "ML", name: "Mali", center: [17.5707, -3.9962], zoom: 5 },
  BF: { code: "BF", name: "Burkina Faso", center: [12.2383, -1.5616], zoom: 7 },
  NE: { code: "NE", name: "Niger", center: [17.6078, 8.0817], zoom: 6 },
  BJ: { code: "BJ", name: "Benin", center: [9.3077, 2.3158], zoom: 7 },
  TG: { code: "TG", name: "Togo", center: [8.6195, 0.8248], zoom: 8 },
  GN: { code: "GN", name: "Guinea", center: [9.9456, -9.6966], zoom: 7 },
  SL: { code: "SL", name: "Sierra Leone", center: [8.4606, -11.7799], zoom: 8 },
  LR: { code: "LR", name: "Liberia", center: [6.4281, -9.4295], zoom: 8 },
  GM: { code: "GM", name: "Gambia", center: [13.4432, -15.3101], zoom: 9 },
  GW: { code: "GW", name: "Guinea-Bissau", center: [11.8037, -15.1804], zoom: 9 },
  MR: { code: "MR", name: "Mauritania", center: [21.0079, -10.9408], zoom: 6 },
  CV: { code: "CV", name: "Cape Verde", center: [16.5388, -23.0418], zoom: 9 },

  // Africa - North
  EG: { code: "EG", name: "Egypt", center: [26.8206, 30.8025], zoom: 6 },
  MA: { code: "MA", name: "Morocco", center: [31.7917, -7.0926], zoom: 6 },
  DZ: { code: "DZ", name: "Algeria", center: [28.0339, 1.6596], zoom: 5 },
  TN: { code: "TN", name: "Tunisia", center: [33.8869, 9.5375], zoom: 7 },
  LY: { code: "LY", name: "Libya", center: [26.3351, 17.2283], zoom: 5 },
  SD: { code: "SD", name: "Sudan", center: [12.8628, 30.2176], zoom: 5 },

  // Europe - Western
  GB: { code: "GB", name: "United Kingdom", center: [55.3781, -3.4360], zoom: 6 },
  FR: { code: "FR", name: "France", center: [46.2276, 2.2137], zoom: 6 },
  DE: { code: "DE", name: "Germany", center: [51.1657, 10.4515], zoom: 6 },
  IT: { code: "IT", name: "Italy", center: [41.8719, 12.5674], zoom: 6 },
  ES: { code: "ES", name: "Spain", center: [40.4637, -3.7492], zoom: 6 },
  PT: { code: "PT", name: "Portugal", center: [39.3999, -8.2245], zoom: 7 },
  NL: { code: "NL", name: "Netherlands", center: [52.1326, 5.2913], zoom: 8 },
  BE: { code: "BE", name: "Belgium", center: [50.5039, 4.4699], zoom: 8 },
  CH: { code: "CH", name: "Switzerland", center: [46.8182, 8.2275], zoom: 8 },
  AT: { code: "AT", name: "Austria", center: [47.5162, 14.5501], zoom: 7 },
  IE: { code: "IE", name: "Ireland", center: [53.1424, -7.6921], zoom: 7 },
  LU: { code: "LU", name: "Luxembourg", center: [49.8153, 6.1296], zoom: 10 },

  // Europe - Northern
  SE: { code: "SE", name: "Sweden", center: [60.1282, 18.6435], zoom: 5 },
  NO: { code: "NO", name: "Norway", center: [60.4720, 8.4689], zoom: 5 },
  DK: { code: "DK", name: "Denmark", center: [56.2639, 9.5018], zoom: 7 },
  FI: { code: "FI", name: "Finland", center: [61.9241, 25.7482], zoom: 5 },
  IS: { code: "IS", name: "Iceland", center: [64.9631, -19.0208], zoom: 6 },

  // Europe - Eastern
  PL: { code: "PL", name: "Poland", center: [51.9194, 19.1451], zoom: 6 },
  CZ: { code: "CZ", name: "Czech Republic", center: [49.8175, 15.4730], zoom: 7 },
  HU: { code: "HU", name: "Hungary", center: [47.1625, 19.5033], zoom: 7 },
  RO: { code: "RO", name: "Romania", center: [45.9432, 24.9668], zoom: 7 },
  BG: { code: "BG", name: "Bulgaria", center: [42.7339, 25.4858], zoom: 7 },
  GR: { code: "GR", name: "Greece", center: [39.0742, 21.8243], zoom: 7 },
  UA: { code: "UA", name: "Ukraine", center: [48.3794, 31.1656], zoom: 6 },
  BY: { code: "BY", name: "Belarus", center: [53.7098, 27.9534], zoom: 7 },
  MD: { code: "MD", name: "Moldova", center: [47.4116, 28.3699], zoom: 8 },
  RU: { code: "RU", name: "Russia", center: [61.5240, 105.3188], zoom: 3 },
  SK: { code: "SK", name: "Slovakia", center: [48.6690, 19.6990], zoom: 8 },
  SI: { code: "SI", name: "Slovenia", center: [46.1512, 14.9955], zoom: 8 },
  HR: { code: "HR", name: "Croatia", center: [45.1000, 15.2000], zoom: 7 },
  BA: { code: "BA", name: "Bosnia and Herzegovina", center: [43.9159, 17.6791], zoom: 8 },
  RS: { code: "RS", name: "Serbia", center: [44.0165, 21.0059], zoom: 7 },
  ME: { code: "ME", name: "Montenegro", center: [42.7087, 19.3744], zoom: 9 },
  MK: { code: "MK", name: "North Macedonia", center: [41.5124, 21.7453], zoom: 9 },
  AL: { code: "AL", name: "Albania", center: [41.1533, 20.1683], zoom: 8 },
  XK: { code: "XK", name: "Kosovo", center: [42.6026, 20.9030], zoom: 9 },
  LT: { code: "LT", name: "Lithuania", center: [55.1694, 23.8813], zoom: 7 },
  LV: { code: "LV", name: "Latvia", center: [56.8796, 24.6032], zoom: 7 },
  EE: { code: "EE", name: "Estonia", center: [58.5953, 25.0136], zoom: 7 },
  MT: { code: "MT", name: "Malta", center: [35.9375, 14.3754], zoom: 11 },
  CY: { code: "CY", name: "Cyprus", center: [35.1264, 33.4299], zoom: 9 },

  // North America
  US: { code: "US", name: "United States", center: [37.0902, -95.7129], zoom: 4 },
  CA: { code: "CA", name: "Canada", center: [56.1304, -106.3468], zoom: 4 },
  MX: { code: "MX", name: "Mexico", center: [23.6345, -102.5528], zoom: 5 },

  // Central America & Caribbean
  GT: { code: "GT", name: "Guatemala", center: [15.7835, -90.2308], zoom: 8 },
  BZ: { code: "BZ", name: "Belize", center: [17.1899, -88.4976], zoom: 9 },
  SV: { code: "SV", name: "El Salvador", center: [13.7942, -88.8965], zoom: 9 },
  HN: { code: "HN", name: "Honduras", center: [15.2000, -86.2419], zoom: 7 },
  NI: { code: "NI", name: "Nicaragua", center: [12.8654, -85.2072], zoom: 7 },
  CR: { code: "CR", name: "Costa Rica", center: [9.7489, -83.7534], zoom: 8 },
  PA: { code: "PA", name: "Panama", center: [8.5380, -80.7821], zoom: 8 },
  CU: { code: "CU", name: "Cuba", center: [21.5218, -77.7812], zoom: 7 },
  JM: { code: "JM", name: "Jamaica", center: [18.1096, -77.2975], zoom: 9 },
  HT: { code: "HT", name: "Haiti", center: [18.9712, -72.2852], zoom: 8 },
  DO: { code: "DO", name: "Dominican Republic", center: [18.7357, -70.1627], zoom: 8 },
  TT: { code: "TT", name: "Trinidad and Tobago", center: [10.6918, -61.2225], zoom: 10 },
  BB: { code: "BB", name: "Barbados", center: [13.1939, -59.5432], zoom: 11 },

  // South America
  BR: { code: "BR", name: "Brazil", center: [-14.2350, -51.9253], zoom: 4 },
  AR: { code: "AR", name: "Argentina", center: [-38.4161, -63.6167], zoom: 4 },
  CO: { code: "CO", name: "Colombia", center: [4.5709, -74.2973], zoom: 6 },
  PE: { code: "PE", name: "Peru", center: [-9.1900, -75.0152], zoom: 6 },
  CL: { code: "CL", name: "Chile", center: [-35.6751, -71.5430], zoom: 4 },
  VE: { code: "VE", name: "Venezuela", center: [6.4238, -66.5897], zoom: 6 },
  EC: { code: "EC", name: "Ecuador", center: [-1.8312, -78.1834], zoom: 7 },
  BO: { code: "BO", name: "Bolivia", center: [-16.2902, -63.5887], zoom: 6 },
  PY: { code: "PY", name: "Paraguay", center: [-23.4425, -58.4438], zoom: 7 },
  UY: { code: "UY", name: "Uruguay", center: [-32.5228, -55.7658], zoom: 7 },
  GY: { code: "GY", name: "Guyana", center: [4.8604, -58.9302], zoom: 7 },
  SR: { code: "SR", name: "Suriname", center: [3.9193, -56.0278], zoom: 8 },
  GF: { code: "GF", name: "French Guiana", center: [3.9339, -53.1258], zoom: 8 },

  // Oceania
  AU: { code: "AU", name: "Australia", center: [-25.2744, 133.7751], zoom: 4 },
  NZ: { code: "NZ", name: "New Zealand", center: [-40.9006, 174.8860], zoom: 5 },
  FJ: { code: "FJ", name: "Fiji", center: [-17.7134, 178.0650], zoom: 8 },
  PG: { code: "PG", name: "Papua New Guinea", center: [-6.3150, 143.9555], zoom: 6 },
  SB: { code: "SB", name: "Solomon Islands", center: [-9.6457, 160.1562], zoom: 7 },
  VU: { code: "VU", name: "Vanuatu", center: [-15.3767, 166.9592], zoom: 7 },
  NC: { code: "NC", name: "New Caledonia", center: [-20.9043, 165.6180], zoom: 8 },
  PF: { code: "PF", name: "French Polynesia", center: [-17.6797, -149.4068], zoom: 7 },
  WS: { code: "WS", name: "Samoa", center: [-13.7590, -172.1046], zoom: 9 },
  TO: { code: "TO", name: "Tonga", center: [-21.1790, -175.1982], zoom: 9 },
  PW: { code: "PW", name: "Palau", center: [7.5150, 134.5825], zoom: 10 },
  FM: { code: "FM", name: "Micronesia", center: [7.4256, 150.5508], zoom: 7 },
  MH: { code: "MH", name: "Marshall Islands", center: [7.1315, 171.1845], zoom: 8 },
  KI: { code: "KI", name: "Kiribati", center: [-3.3704, -168.7340], zoom: 6 },
  NR: { code: "NR", name: "Nauru", center: [-0.5228, 166.9315], zoom: 13 },
  TV: { code: "TV", name: "Tuvalu", center: [-7.1095, 179.1940], zoom: 10 },
};

// Default coordinates to use as fallback (Myanmar)
export const DEFAULT_MAP_CENTER: [number, number] = [21.9162, 95.9560];
export const DEFAULT_MAP_ZOOM = 6;

/**
 * Get map center coordinates for a country code
 * @param countryCode ISO 3166-1 alpha-2 country code
 * @returns Country coordinates or default (Myanmar) if not found
 */
export function getCountryCoordinates(countryCode: string | undefined | null): CountryCoordinates {
  if (!countryCode) {
    return {
      code: "MM",
      name: "Myanmar",
      center: DEFAULT_MAP_CENTER,
      zoom: DEFAULT_MAP_ZOOM,
    };
  }

  const coords = COUNTRY_COORDINATES[countryCode.toUpperCase()];
  if (coords) {
    return coords;
  }

  // Return default if country not found
  return {
    code: countryCode,
    name: countryCode,
    center: DEFAULT_MAP_CENTER,
    zoom: DEFAULT_MAP_ZOOM,
  };
}

/**
 * Get just the center coordinates for a country
 * @param countryCode ISO 3166-1 alpha-2 country code
 * @returns [latitude, longitude] tuple
 */
export function getCountryCenter(countryCode: string | undefined | null): [number, number] {
  return getCountryCoordinates(countryCode).center;
}

/**
 * Get the recommended zoom level for a country
 * @param countryCode ISO 3166-1 alpha-2 country code
 * @returns zoom level number
 */
export function getCountryZoom(countryCode: string | undefined | null): number {
  return getCountryCoordinates(countryCode).zoom;
}
