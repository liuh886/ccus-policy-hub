import test from 'node:test';
import assert from 'node:assert/strict';

import { getCountryCoordinateFallback, normalizeCoordinates } from './content-export-utils.mjs';

test('normalizeCoordinates falls back when coordinates are missing or zeroed', () => {
  assert.deepEqual(normalizeCoordinates(null, null), [0.001, 0.001]);
  assert.deepEqual(normalizeCoordinates(undefined, 12.5), [0.001, 0.001]);
  assert.deepEqual(normalizeCoordinates('', ''), [0.001, 0.001]);
  assert.deepEqual(normalizeCoordinates(0, 0), [0.001, 0.001]);
  assert.deepEqual(normalizeCoordinates('0', '0'), [0.001, 0.001]);
});

test('normalizeCoordinates preserves valid numeric coordinate pairs', () => {
  assert.deepEqual(normalizeCoordinates(1.23, 4.56), [1.23, 4.56]);
  assert.deepEqual(normalizeCoordinates('1.23', '4.56'), [1.23, 4.56]);
  assert.deepEqual(normalizeCoordinates(0, 103.8198), [0, 103.8198]);
  assert.deepEqual(normalizeCoordinates(-6.2088, 106.8456), [-6.2088, 106.8456]);
});

test('getCountryCoordinateFallback returns a centroid for known countries', () => {
  assert.deepEqual(getCountryCoordinateFallback('Sweden'), [62.0, 15.0]);
  assert.deepEqual(getCountryCoordinateFallback('United States'), [37.09, -95.71]);
});

test('getCountryCoordinateFallback uses the first resolvable country in composite names', () => {
  assert.deepEqual(getCountryCoordinateFallback('South Korea-Malaysia'), [36.5, 127.8]);
  assert.deepEqual(getCountryCoordinateFallback('Oman-United Arab Emirates'), [21.0, 57.0]);
});

test('normalizeCoordinates prefers a country centroid fallback over the generic placeholder', () => {
  const countryFallback = getCountryCoordinateFallback('Sweden');
  assert.deepEqual(normalizeCoordinates(null, null, countryFallback), [62.0, 15.0]);
  assert.deepEqual(normalizeCoordinates(0, 0, countryFallback), [62.0, 15.0]);
});
