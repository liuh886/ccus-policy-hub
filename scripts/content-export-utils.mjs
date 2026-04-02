const DEFAULT_COORDINATE_FALLBACK = [0.001, 0.001];
const COUNTRY_CENTROIDS = {
  Australia: [-25.27, 133.77],
  Belgium: [50.83, 4.47],
  Brazil: [-14.24, -51.93],
  Bulgaria: [42.73, 25.49],
  Canada: [56.13, -106.34],
  China: [35.86, 104.19],
  Denmark: [56.26, 9.5],
  'European Union': [50.0, 10.0],
  Finland: [61.92, 25.75],
  France: [46.23, 2.21],
  Germany: [51.17, 10.45],
  Greece: [39.07, 21.82],
  Italy: [41.87, 12.57],
  Japan: [36.2, 138.25],
  Kenya: [0.02, 37.91],
  Malaysia: [4.21, 101.98],
  Netherlands: [52.13, 5.29],
  Norway: [60.47, 8.46],
  Oman: [21.0, 57.0],
  'Republic of Korea': [36.5, 127.8],
  Romania: [45.94, 24.97],
  Singapore: [1.35, 103.82],
  Slovakia: [48.67, 19.7],
  'South Korea': [36.5, 127.8],
  Spain: [40.46, -3.75],
  Sweden: [62.0, 15.0],
  Switzerland: [46.82, 8.23],
  'United Arab Emirates': [23.42, 53.85],
  'United Kingdom': [55.37, -3.43],
  'United States': [37.09, -95.71],
  Vietnam: [14.06, 108.28],
};

function toFiniteNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const normalized = value.trim();
    if (normalized === '') return null;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function splitCompositeCountry(country) {
  return String(country)
    .split(/\s*(?:,|\/|;|-)\s*/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function getCountryCoordinateFallback(country, defaultFallback = DEFAULT_COORDINATE_FALLBACK) {
  if (!country) return [...defaultFallback];

  if (COUNTRY_CENTROIDS[country]) {
    return [...COUNTRY_CENTROIDS[country]];
  }

  for (const part of splitCompositeCountry(country)) {
    if (COUNTRY_CENTROIDS[part]) {
      return [...COUNTRY_CENTROIDS[part]];
    }
  }

  return [...defaultFallback];
}

export function normalizeCoordinates(lat, lng, fallback = DEFAULT_COORDINATE_FALLBACK) {
  const latNum = toFiniteNumber(lat);
  const lngNum = toFiniteNumber(lng);

  if (latNum === null || lngNum === null) return [...fallback];
  if (latNum === 0 && lngNum === 0) return [...fallback];

  return [latNum, lngNum];
}

export function resolveFacilityCoordinates({
  country,
  precision,
  lat,
  lng,
  defaultFallback = DEFAULT_COORDINATE_FALLBACK,
}) {
  const fallback = getCountryCoordinateFallback(country, defaultFallback);

  // Country-precision facilities should always share a single canonical anchor.
  if (precision === 'country' || precision === 'approximate' || !precision) {
    return fallback;
  }

  return normalizeCoordinates(lat, lng, fallback);
}
