const DEFAULT_COORDINATE_FALLBACK = null;

const COUNTRY_CENTROIDS = {
  Algeria: [28.03, 1.66],
  Australia: [-25.27, 133.77],
  Austria: [47.52, 14.55],
  Bahrain: [26.07, 50.56],
  Belgium: [50.83, 4.47],
  Brazil: [-14.24, -51.93],
  Bulgaria: [42.73, 25.49],
  Canada: [56.13, -106.34],
  Chile: [-35.68, -71.54],
  China: [35.86, 104.19],
  'Chinese Taipei': [23.7, 121.0],
  Croatia: [45.1, 15.2],
  Denmark: [56.26, 9.5],
  'European Union': [50.0, 10.0],
  Finland: [61.92, 25.75],
  France: [46.23, 2.21],
  Georgia: [42.32, 43.36],
  Germany: [51.17, 10.45],
  Greece: [39.07, 21.82],
  Hungary: [47.16, 19.5],
  Iceland: [64.96, -19.02],
  India: [20.59, 78.96],
  Indonesia: [-0.79, 113.92],
  International: [20.0, 0.0],
  Ireland: [53.41, -8.24],
  Italy: [41.87, 12.57],
  Japan: [36.2, 138.25],
  Kenya: [0.02, 37.91],
  Latvia: [56.88, 24.6],
  Libya: [26.34, 17.23],
  Lithuania: [55.17, 23.88],
  Luxembourg: [49.82, 6.13],
  Malaysia: [4.21, 101.98],
  Mexico: [23.63, -102.55],
  'Multiple Europe': [54.53, 15.26],
  Netherlands: [52.13, 5.29],
  'New Zealand': [-40.9, 174.89],
  Norway: [60.47, 8.46],
  Oman: [21.0, 57.0],
  'Papua New Guinea': [-6.31, 143.96],
  Poland: [51.92, 19.15],
  Portugal: [39.4, -8.22],
  Qatar: [25.35, 51.18],
  'Republic of Korea': [36.5, 127.8],
  Romania: [45.94, 24.97],
  Russia: [61.52, 105.32],
  'Saudi Arabia': [23.89, 45.08],
  Singapore: [1.35, 103.82],
  Slovakia: [48.67, 19.7],
  'South Korea': [36.5, 127.8],
  Spain: [40.46, -3.75],
  Sweden: [62.0, 15.0],
  Switzerland: [46.82, 8.23],
  Thailand: [15.87, 100.99],
  'United Arab Emirates': [23.42, 53.85],
  'United Kingdom': [55.37, -3.43],
  'United States': [37.09, -95.71],
  Uruguay: [-32.52, -55.77],
  Vietnam: [14.06, 108.28],
};

function cloneCoordinatePair(value) {
  return Array.isArray(value) ? [...value] : null;
}

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

function averageCoordinatePairs(pairs) {
  if (!pairs.length) return null;
  if (pairs.length === 1) return [...pairs[0]];

  const lat =
    pairs.reduce((sum, [pairLat]) => sum + pairLat, 0) / pairs.length;
  const lng =
    pairs.reduce((sum, [, pairLng]) => sum + pairLng, 0) / pairs.length;

  return [Number(lat.toFixed(4)), Number(lng.toFixed(4))];
}

export function hasMeaningfulCoordinates(lat, lng) {
  const latNum = toFiniteNumber(lat);
  const lngNum = toFiniteNumber(lng);

  if (latNum === null || lngNum === null) return false;

  return !(Math.abs(latNum) < 0.01 && Math.abs(lngNum) < 0.01);
}

export function isMeaningfulCoordinatePair(pair) {
  if (!Array.isArray(pair) || pair.length < 2) return false;
  return hasMeaningfulCoordinates(pair[0], pair[1]);
}

export function getCountryCoordinateFallback(
  country,
  defaultFallback = DEFAULT_COORDINATE_FALLBACK
) {
  if (!country) return cloneCoordinatePair(defaultFallback);

  if (COUNTRY_CENTROIDS[country]) {
    return [...COUNTRY_CENTROIDS[country]];
  }

  // Use the first part of a composite country string (e.g., "South Korea-Malaysia" -> "South Korea")
  // instead of averaging them, to ensure the marker stays within a lead country boundary.
  const parts = splitCompositeCountry(country);
  for (const part of parts) {
    if (COUNTRY_CENTROIDS[part]) {
      return [...COUNTRY_CENTROIDS[part]];
    }
  }

  return cloneCoordinatePair(defaultFallback);
}

export function normalizeCoordinates(
  lat,
  lng,
  fallback = DEFAULT_COORDINATE_FALLBACK
) {
  if (!hasMeaningfulCoordinates(lat, lng)) {
    return cloneCoordinatePair(fallback);
  }

  return [Number(lat), Number(lng)];
}

export function resolveFacilityCoordinates({
  country,
  precision,
  lat,
  lng,
  defaultFallback = DEFAULT_COORDINATE_FALLBACK,
}) {
  const fallback = getCountryCoordinateFallback(country, defaultFallback);

  if (precision === 'country' || precision === 'approximate') {
    return cloneCoordinatePair(fallback);
  }

  return normalizeCoordinates(lat, lng, fallback);
}
