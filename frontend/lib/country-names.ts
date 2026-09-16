/**
 * ISO 3166-1 alpha-2 country codes → English names.
 * Used to match `/geo/ip` results (proxy header codes like "DE") against the
 * seeded/discovered region data, which uses full English country names.
 */
const ISO_TO_NAME: Record<string, string> = {
  US: "United States", GB: "United Kingdom", DE: "Germany", FR: "France", IT: "Italy",
  ES: "Spain", PT: "Portugal", NL: "Netherlands", BE: "Belgium", AT: "Austria",
  CH: "Switzerland", SE: "Sweden", NO: "Norway", DK: "Denmark", FI: "Finland",
  IS: "Iceland", IE: "Ireland", PL: "Poland", CZ: "Czechia", HU: "Hungary",
  UA: "Ukraine", GR: "Greece", HR: "Croatia", RO: "Romania", BG: "Bulgaria",
  TR: "Turkey", EG: "Egypt", MA: "Morocco", NG: "Nigeria", GH: "Ghana",
  KE: "Kenya", ET: "Ethiopia", ZA: "South Africa", IL: "Israel", AE: "United Arab Emirates",
  SA: "Saudi Arabia", IN: "India", PK: "Pakistan", BD: "Bangladesh", LK: "Sri Lanka",
  CN: "China", JP: "Japan", KR: "South Korea", SG: "Singapore", MY: "Malaysia",
  ID: "Indonesia", TH: "Thailand", VN: "Vietnam", PH: "Philippines", AU: "Australia",
  NZ: "New Zealand", BR: "Brazil", AR: "Argentina", CL: "Chile", CO: "Colombia",
  PE: "Peru", VE: "Venezuela", UY: "Uruguay", MX: "Mexico", CA: "Canada",
};

export function isoCountryName(code: string): string | null {
  return ISO_TO_NAME[code.toUpperCase()] ?? null;
}