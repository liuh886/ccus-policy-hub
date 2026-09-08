/**
 * Standardization command: normalize governed fields through alias tables.
 *
 * Moved verbatim from `logic/manage.mjs` (behavior-preserving split).
 */

import { loadDb } from '../db.mjs';

export async function dbStandardize(SQL) {
  const db = loadDb(SQL);
  db.transaction(() => {
    const policies = db.all('SELECT id, country FROM policies');
    for (const p of policies) {
      const canon = db.get(
        'SELECT canonical FROM dict_country_alias WHERE alias = ?',
        [p.country]
      );
      if (canon)
        db.run('UPDATE policies SET country = ? WHERE id = ?', [
          canon.canonical,
          p.id,
        ]);
    }
    const facilities = db.all('SELECT id, country FROM facilities');
    for (const f of facilities) {
      const canon = db.get(
        'SELECT canonical FROM dict_country_alias WHERE alias = ?',
        [f.country]
      );
      if (canon)
        db.run('UPDATE facilities SET country = ? WHERE id = ?', [
          canon.canonical,
          f.id,
        ]);
    }
  });
  db.save();
  console.log('STANDARDIZE DONE.');
}
