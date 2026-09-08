/**
 * Seed/sync commands: bootstrap country governance profiles and roll up
 * regulatory pillars from the newest policy in each jurisdiction.
 *
 * Moved verbatim from `logic/manage.mjs` (behavior-preserving split).
 */

import fs from 'fs';
import path from 'path';
import { LOGIC_DIR, loadDb } from '../db.mjs';

export async function dbSeedCountries(SQL) {
  const db = loadDb(SQL);
  const countriesData = JSON.parse(
    fs.readFileSync(
      path.join(LOGIC_DIR, '../../../src/data/countries.json'),
      'utf8'
    )
  );
  const MAJOR = {
    'United States': {
      en: {
        summary: 'US leader in CCUS...',
        reg: {
          pore_space_rights: 'Private',
          liability_transfer: 'Permitted',
          liability_period: '50 years',
          financial_assurance: 'Mandatory',
          permitting_lead_time: '3-6 years',
          co2_definition: 'Managed Substance',
          cross_border_rules: 'London Protocol aligned',
        },
      },
      zh: {
        summary: '美国领先...',
        reg: {
          pore_space_rights: '私有',
          liability_transfer: '允许转移',
          liability_period: '50年',
          financial_assurance: '强制要求',
          permitting_lead_time: '3-6年',
          co2_definition: '受控物质',
          cross_border_rules: '对齐伦敦议定书',
        },
      },
    },
    China: {
      en: {
        summary: 'China scaling clusters...',
        reg: {
          pore_space_rights: 'State Owned',
          liability_transfer: 'Pending',
          liability_period: 'TBD',
          financial_assurance: 'Project-level',
          permitting_lead_time: '2-3 years',
          co2_definition: 'Industrial Resource',
          cross_border_rules: 'Bilateral',
        },
      },
      zh: {
        summary: '中国规模化发展...',
        reg: {
          pore_space_rights: '国家所有',
          liability_transfer: '待定',
          liability_period: '待定',
          financial_assurance: '项目级要求',
          permitting_lead_time: '2-3年',
          co2_definition: '工业资源',
          cross_border_rules: '双边协议',
        },
      },
    },
  };
  db.transaction(() => {
    for (const [id, trans] of Object.entries(countriesData)) {
      db.run(
        'INSERT OR REPLACE INTO country_profiles (id, region) VALUES (?,?)',
        [id, 'Global']
      );
      ['en', 'zh'].forEach((l) => {
        const m = MAJOR[id]?.[l] || {
          summary: `Profile for ${trans[l]}`,
          reg: {},
        };
        db.run(
          `INSERT OR REPLACE INTO country_i18n (country_id, lang, name, summary, pore_space_rights, liability_transfer, liability_period, financial_assurance, permitting_lead_time, co2_definition, cross_border_rules) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
          [
            id,
            l,
            trans[l],
            m.summary,
            m.reg.pore_space_rights || 'Pending',
            m.reg.liability_transfer || 'Pending',
            m.reg.liability_period || 'Pending',
            m.reg.financial_assurance || 'Pending',
            m.reg.permitting_lead_time || 'Pending',
            m.reg.co2_definition || 'Pending',
            m.reg.cross_border_rules || 'Pending',
          ]
        );
      });
    }
  });
  db.save();
  console.log('SEED COUNTRIES DONE.');
}

export async function dbSyncCountryProfiles(SQL) {
  const db = loadDb(SQL);
  const fields = [
    'pore_space_rights',
    'liability_transfer',
    'liability_period',
    'financial_assurance',
    'permitting_lead_time',
    'co2_definition',
    'cross_border_rules',
  ];
  db.transaction(() => {
    db.all('SELECT id FROM country_profiles').forEach((c) => {
      ['en', 'zh'].forEach((lang) => {
        const policies = db.all(
          `SELECT i.regulatory_json FROM policies p JOIN policy_i18n i ON p.id = i.policy_id WHERE p.country = ? AND i.lang = ? ORDER BY p.year DESC`,
          [c.id, lang]
        );
        const updates = {};
        fields.forEach((f) => {
          for (const p of policies) {
            try {
              const reg = JSON.parse(p.regulatory_json || '{}');
              if (reg[f] && !['Pending', '---', '待定', ''].includes(reg[f])) {
                updates[f] = reg[f];
                break;
              }
            } catch (e) {}
          }
        });
        if (Object.keys(updates).length > 0) {
          const sql = `UPDATE country_i18n SET ${Object.keys(updates)
            .map((k) => `${k}=?`)
            .join(',')} WHERE country_id=? AND lang=?`;
          db.run(sql, [...Object.values(updates), c.id, lang]);
        }
      });
    });
  });
  db.save();
  console.log('SYNC COUNTRIES DONE.');
}
