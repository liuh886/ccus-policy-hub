/**
 * compare-presets.test.mjs
 *
 * Unit tests and data-contract guards for src/lib/comparePresets.mjs:
 * shareable /compare/ presets, URL token resolution, and query serialization.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  COMPARE_PRESETS,
  DEFAULT_COMPARE_COUNTRIES,
  MAX_COMPARE_COUNTRIES,
  countriesToQuery,
  countryKeyOf,
  queryToCountries,
  resolveCountryToken,
  slugifyCountry,
} from '../src/lib/comparePresets.mjs';
import { governanceComparisonCopy } from '../src/lib/governanceCopy.mjs';

const countriesData = JSON.parse(
  fs.readFileSync(
    new URL('../src/data/countries.json', import.meta.url),
    'utf8'
  )
);

describe('comparePresets constants & immutability', () => {
  it('fixes MAX_COMPARE_COUNTRIES to 6', () => {
    assert.strictEqual(MAX_COMPARE_COUNTRIES, 6);
  });

  it('freezes DEFAULT_COMPARE_COUNTRIES', () => {
    assert.ok(Object.isFrozen(DEFAULT_COMPARE_COUNTRIES));
    assert.deepStrictEqual(DEFAULT_COMPARE_COUNTRIES, [
      'United States',
      'China',
      'United Kingdom',
      'Norway',
    ]);
    assert.ok(DEFAULT_COMPARE_COUNTRIES.length <= MAX_COMPARE_COUNTRIES);
  });

  it('deeply freezes COMPARE_PRESETS and their country lists', () => {
    assert.ok(Object.isFrozen(COMPARE_PRESETS));
    assert.ok(COMPARE_PRESETS.length > 0);
    for (const preset of COMPARE_PRESETS) {
      assert.ok(Object.isFrozen(preset), `preset ${preset.id} is frozen`);
      assert.ok(
        Object.isFrozen(preset.countries),
        `preset ${preset.id}.countries is frozen`
      );
      assert.ok(
        preset.countries.length > 0 &&
          preset.countries.length <= MAX_COMPARE_COUNTRIES,
        `preset ${preset.id} has between 1 and ${MAX_COMPARE_COUNTRIES} countries`
      );
    }
  });
});

describe('slugifyCountry', () => {
  it('trims, lowercases, collapses whitespace/underscores, and strips punctuation', () => {
    assert.strictEqual(slugifyCountry('  United States  '), 'united-states');
    assert.strictEqual(
      slugifyCountry('United_Arab   Emirates'),
      'united-arab-emirates'
    );
    assert.strictEqual(
      slugifyCountry("Cote d'Ivoire, (West)!"),
      'cote-divoire-west'
    );
    assert.strictEqual(
      slugifyCountry('Poland, Latvia, Lithuania'),
      'poland-latvia-lithuania'
    );
    assert.strictEqual(slugifyCountry('CO2_Hub__01'), 'co2-hub-01');
  });

  it('returns empty string for null, undefined, empty, or punctuation-only input', () => {
    assert.strictEqual(slugifyCountry(null), '');
    assert.strictEqual(slugifyCountry(undefined), '');
    assert.strictEqual(slugifyCountry(''), '');
    assert.strictEqual(slugifyCountry('   '), '');
    assert.strictEqual(slugifyCountry('!!!'), '');
  });
});

describe('countryKeyOf', () => {
  const customMap = {
    ...countriesData,
    'Republic of Korea': {
      en: 'South Korea (ROK)',
      zh: '大韩民国',
    },
  };

  it('resolves exact canonical keys', () => {
    assert.strictEqual(
      countryKeyOf('United States', countriesData),
      'United States'
    );
    assert.strictEqual(countryKeyOf('  Norway  ', countriesData), 'Norway');
  });

  it('resolves case-insensitive canonical keys', () => {
    assert.strictEqual(
      countryKeyOf('united kingdom', countriesData),
      'United Kingdom'
    );
    assert.strictEqual(countryKeyOf('CHINA', countriesData), 'China');
  });

  it('resolves English labels case-insensitively and by slugified form', () => {
    assert.strictEqual(
      countryKeyOf('south korea (rok)', customMap),
      'Republic of Korea'
    );
    assert.strictEqual(
      countryKeyOf('united-arab-emirates', countriesData),
      'United Arab Emirates'
    );
    assert.strictEqual(
      countryKeyOf('saudi_arabia', countriesData),
      'Saudi Arabia'
    );
    assert.strictEqual(
      countryKeyOf('south-korea-rok', customMap),
      'Republic of Korea'
    );
  });

  it('resolves Chinese labels', () => {
    assert.strictEqual(countryKeyOf('美国', countriesData), 'United States');
    assert.strictEqual(
      countryKeyOf('阿联酋', countriesData),
      'United Arab Emirates'
    );
    assert.strictEqual(countryKeyOf('挪威', countriesData), 'Norway');
    assert.strictEqual(
      countryKeyOf('大韩民国', customMap),
      'Republic of Korea'
    );
  });

  it('returns null for unknown, empty, or punctuation-only values', () => {
    assert.strictEqual(countryKeyOf('', countriesData), null);
    assert.strictEqual(countryKeyOf('   ', countriesData), null);
    assert.strictEqual(countryKeyOf(null, countriesData), null);
    assert.strictEqual(countryKeyOf(undefined, countriesData), null);
    assert.strictEqual(countryKeyOf('Atlantis', countriesData), null);
    assert.strictEqual(countryKeyOf('!!!', countriesData), null);
    assert.strictEqual(countryKeyOf('United States'), null);
  });
});

describe('resolveCountryToken', () => {
  it('resolves ISO2 codes (case-insensitive and trimmed) when canonical country is present', () => {
    assert.strictEqual(
      resolveCountryToken('us', countriesData),
      'United States'
    );
    assert.strictEqual(
      resolveCountryToken(' US ', countriesData),
      'United States'
    );
    assert.strictEqual(
      resolveCountryToken('gb', countriesData),
      'United Kingdom'
    );
    assert.strictEqual(
      resolveCountryToken('uk', countriesData),
      'United Kingdom'
    );
    assert.strictEqual(resolveCountryToken('cn', countriesData), 'China');
    assert.strictEqual(
      resolveCountryToken('ae', countriesData),
      'United Arab Emirates'
    );
    assert.strictEqual(resolveCountryToken('kr', countriesData), 'South Korea');
  });

  it('rejects an ISO2 code when its canonical country is absent from countryMap', () => {
    const partialMap = {
      China: countriesData.China,
      Norway: countriesData.Norway,
    };
    assert.strictEqual(resolveCountryToken('us', partialMap), null);
    assert.strictEqual(resolveCountryToken('gb', partialMap), null);
    assert.strictEqual(resolveCountryToken('uk', partialMap), null);
    assert.strictEqual(resolveCountryToken('kr', partialMap), null);
    assert.strictEqual(resolveCountryToken('cn', partialMap), 'China');
  });

  it('falls back to countryKeyOf for non-ISO2 tokens', () => {
    assert.strictEqual(
      resolveCountryToken('united-states', countriesData),
      'United States'
    );
    assert.strictEqual(resolveCountryToken('德国', countriesData), 'Germany');
    assert.strictEqual(
      resolveCountryToken('Iceland', countriesData),
      'Iceland'
    );
    assert.strictEqual(resolveCountryToken('', countriesData), null);
    assert.strictEqual(resolveCountryToken(null, countriesData), null);
    assert.strictEqual(
      resolveCountryToken('unknown-land', countriesData),
      null
    );
  });
});

describe('countriesToQuery & queryToCountries', () => {
  it('round-trips canonical country lists through query strings', () => {
    const query = countriesToQuery(DEFAULT_COMPARE_COUNTRIES);
    assert.strictEqual(query, 'united-states,china,united-kingdom,norway');
    assert.deepStrictEqual(
      queryToCountries(query, countriesData),
      DEFAULT_COMPARE_COUNTRIES
    );
  });

  it('handles empty and default arguments cleanly', () => {
    assert.strictEqual(countriesToQuery(), '');
    assert.strictEqual(countriesToQuery([]), '');
    assert.deepStrictEqual(queryToCountries('', countriesData), []);
    assert.deepStrictEqual(queryToCountries(null, countriesData), []);
  });

  it('parses mixed ISO2, slug, zh, and canonical tokens while deduplicating in order', () => {
    const query =
      'kr,united-states,中国,US,United Kingdom,英国,ae,south-korea,Norway';
    assert.deepStrictEqual(queryToCountries(query, countriesData), [
      'South Korea',
      'United States',
      'China',
      'United Kingdom',
      'United Arab Emirates',
      'Norway',
    ]);
  });

  it('drops blanks and unknown tokens and caps results at MAX_COMPARE_COUNTRIES', () => {
    const query = ', ,us,unknown,,cn,gb,no,de,au,ca,jp,invalid-country';
    const resolved = queryToCountries(query, countriesData);
    assert.strictEqual(resolved.length, MAX_COMPARE_COUNTRIES);
    assert.deepStrictEqual(resolved, [
      'United States',
      'China',
      'United Kingdom',
      'Norway',
      'Germany',
      'Australia',
    ]);
  });
});

describe('comparePresets data contracts', () => {
  it('ensures every country in DEFAULT_COMPARE_COUNTRIES exists in src/data/countries.json', () => {
    for (const country of DEFAULT_COMPARE_COUNTRIES) {
      assert.ok(
        Object.hasOwn(countriesData, country),
        `DEFAULT_COMPARE_COUNTRIES entry "${country}" must exist in countries.json`
      );
    }
  });

  it('ensures every country in COMPARE_PRESETS exists in src/data/countries.json', () => {
    for (const preset of COMPARE_PRESETS) {
      for (const country of preset.countries) {
        assert.ok(
          Object.hasOwn(countriesData, country),
          `preset "${preset.id}" country "${country}" must exist in countries.json`
        );
      }
    }
  });

  it('ensures every preset.copyKey exists in both governanceComparisonCopy.zh and .en', () => {
    for (const preset of COMPARE_PRESETS) {
      assert.strictEqual(
        typeof governanceComparisonCopy.zh[preset.copyKey],
        'string',
        `governanceComparisonCopy.zh.${preset.copyKey} must be a string`
      );
      assert.ok(
        governanceComparisonCopy.zh[preset.copyKey].length > 0,
        `governanceComparisonCopy.zh.${preset.copyKey} must be non-empty`
      );
      assert.strictEqual(
        typeof governanceComparisonCopy.en[preset.copyKey],
        'string',
        `governanceComparisonCopy.en.${preset.copyKey} must be a string`
      );
      assert.ok(
        governanceComparisonCopy.en[preset.copyKey].length > 0,
        `governanceComparisonCopy.en.${preset.copyKey} must be non-empty`
      );
    }
  });
});
