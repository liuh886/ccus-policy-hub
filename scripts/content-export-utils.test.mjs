import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getCountryCoordinateFallback,
  hasMeaningfulCoordinates,
  normalizeCoordinates,
  resolveFacilityCoordinates,
} from './content-export-utils.mjs';

test('hasMeaningfulCoordinates rejects null, zeroed, and placeholder pairs', () => {
  assert.equal(hasMeaningfulCoordinates(null, null), false);
  assert.equal(hasMeaningfulCoordinates(undefined, 12.5), false);
  assert.equal(hasMeaningfulCoordinates('', ''), false);
  assert.equal(hasMeaningfulCoordinates(0, 0), false);
  assert.equal(hasMeaningfulCoordinates('0', '0'), false);
  assert.equal(hasMeaningfulCoordinates(0.001, 0.001), false);
});

test('normalizeCoordinates preserves valid numeric coordinate pairs', () => {
  assert.deepEqual(normalizeCoordinates(1.23, 4.56), [1.23, 4.56]);
  assert.deepEqual(normalizeCoordinates('1.23', '4.56'), [1.23, 4.56]);
  assert.deepEqual(normalizeCoordinates(0, 103.8198), [0, 103.8198]);
  assert.deepEqual(normalizeCoordinates(-6.2088, 106.8456), [-6.2088, 106.8456]);
});

test('normalizeCoordinates returns null when no fallback is available', () => {
  assert.equal(normalizeCoordinates(null, null), null);
  assert.equal(normalizeCoordinates(0.001, 0.001), null);
});

test('getCountryCoordinateFallback returns centroids for known countries', () => {
  assert.deepEqual(getCountryCoordinateFallback('Sweden'), [62.0, 15.0]);
  assert.deepEqual(getCountryCoordinateFallback('United States'), [37.09, -95.71]);
  assert.deepEqual(getCountryCoordinateFallback('Chinese Taipei'), [23.7, 121.0]);
});

test('getCountryCoordinateFallback returns the first resolvable part for composite countries', () => {
  assert.deepEqual(getCountryCoordinateFallback('South Korea-Malaysia'), [36.5, 127.8]);
  assert.deepEqual(getCountryCoordinateFallback('Latvia-Lithuania'), [56.88, 24.6]);
});

test('resolveFacilityCoordinates uses country anchors for country-precision facilities', () => {
  assert.deepEqual(
    resolveFacilityCoordinates({
      country: 'Sweden',
      precision: 'country',
      lat: null,
      lng: null,
    }),
    [62.0, 15.0]
  );
});

test('resolveFacilityCoordinates preserves valid precise coordinates when precision is unset', () => {
  assert.deepEqual(
    resolveFacilityCoordinates({
      country: 'Sweden',
      precision: null,
      lat: 57.7089,
      lng: 11.9746,
    }),
    [57.7089, 11.9746]
  );
});

test('resolveFacilityCoordinates returns null when no coordinate and no fallback exist', () => {
  assert.equal(
    resolveFacilityCoordinates({
      country: 'Unknown',
      precision: 'country',
      lat: null,
      lng: null,
    }),
    null
  );
});
