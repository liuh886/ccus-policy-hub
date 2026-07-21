#!/usr/bin/env node
/**
 * Consolidate duplicate policy families and repair primary-source metadata.
 *
 * Research basis (checked 2026-07-21):
 * - Japan METI CCS Business Act implementation notices (2024-2026)
 * - Malaysia Ministry of Economy / MyCCUS Act 870 implementation record
 * - EUR-Lex Directive 2009/31/EC and Regulation (EU) 2024/1735
 * - MIDA official CCS tax-incentive summary
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import initSqlJs from 'sql.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DB_PATH = path.join(ROOT, 'agent/ccus-ai-agent/db/ccus_master.sqlite');

export const MIGRATION_ID = 'policy-lifecycle-cleanup-2026-07';

export const POLICY_FAMILIES = [
  {
    canonicalId: 'jp-ccs-business-act-2024',
    aliases: ['japan-ccs-act', 'jp-meti-specified-zones-2024'],
  },
  {
    canonicalId: 'my-ccus-act-2025',
    aliases: [
      'my-ccus-bill-2025',
      'my-offshore-ccs-reg-2025',
      'my-ccs-framework',
    ],
  },
  {
    canonicalId: 'eu-ccs-directive',
    aliases: ['eu-ccs-directive-2009'],
  },
];

export const CANONICAL_UPDATES = [
  {
    id: 'jp-ccs-business-act-2024',
    core: {
      country: 'Japan',
      year: 2024,
      status: 'Active',
      category: 'Regulatory',
      reviewStatus: 'verified',
      legalWeight: 'Primary Legislation',
      source: 'Ministry of Economy, Trade and Industry (METI), Japan',
      url: 'https://www.meti.go.jp/english/press/2026/0424_002.html',
      pubDate: '2024-05-17',
    },
    i18n: {
      en: {
        title:
          'Japan Act on Carbon Dioxide Storage Businesses (CCS Business Act)',
        description:
          'Japan enacted the CCS Business Act in May 2024 to establish licensing systems for carbon dioxide storage businesses and exploratory drilling, create legally protected storage and exploratory-drilling rights, and regulate storage operations and pipeline transport of carbon dioxide. Exploration-related provisions entered into force in stages on 5 August and 18 November 2024. METI set 22 May 2026 as the full enforcement date and completed the associated Cabinet Orders, including registration rules for storage rights and technical provisions for offshore storage.',
      },
      zh: {
        title: '日本《二氧化碳储存业务法》（CCS 业务法）',
        description:
          '日本于 2024 年 5 月制定《二氧化碳储存业务法》，建立二氧化碳封存业务与试掘许可制度，确立受法律保护的储集权和试掘权，并对封存业务及管道二氧化碳运输实施经营与安全监管。与勘探和试掘有关的部分条款分别于 2024 年 8 月 5 日和 11 月 18 日分阶段施行。经济产业省随后将 2026 年 5 月 22 日确定为该法全面施行日期，并完成储集权登记、海域封存技术要求等配套政令。',
      },
      evolution: {
        milestones: [
          {
            date: '2024-05',
            event: 'CCS Business Act enacted by the Japanese Diet.',
          },
          {
            date: '2024-08-05',
            event: 'Initial exploration-related provisions entered into force.',
          },
          {
            date: '2024-11-18',
            event: 'Exploratory-drilling provisions entered into force.',
          },
          {
            date: '2026-05-22',
            event: 'Full CCS Business Act enforcement date.',
          },
        ],
        consolidatedFrom: ['japan-ccs-act', 'jp-meti-specified-zones-2024'],
      },
    },
    analysis: {
      statutory: {
        evidence:
          'The Act establishes storage-business and exploratory-drilling licences, registrable storage and exploratory-drilling rights, and business and safety rules for storage and pipeline CO2 transport.',
        citation:
          'METI CCS Business Act overview; METI Cabinet Orders of 23 July 2024, 29 October 2024 and 24 April 2026.',
      },
      mrv: {
        evidence:
          'The statutory and implementing framework requires regulated site operation, monitoring, closure and post-closure controls; detailed implementing rules were completed for full enforcement on 22 May 2026.',
        citation:
          'METI Act on Carbon Dioxide Storage Businesses and 2026 implementing Cabinet Orders.',
      },
    },
  },
  {
    id: 'my-ccus-act-2025',
    core: {
      country: 'Malaysia',
      year: 2025,
      status: 'Active',
      category: 'Regulatory',
      reviewStatus: 'verified',
      legalWeight: 'Primary Legislation',
      source: 'Ministry of Economy / Malaysian CCUS Agency (MyCCUS)',
      url: 'https://myccus.ekonomi.gov.my/activities/',
      pubDate: '2025-08-01',
    },
    i18n: {
      en: {
        title:
          'Malaysia Carbon Capture, Utilisation and Storage Act 2025 (Act 870)',
        description:
          'Malaysia’s Carbon Capture, Utilisation and Storage Act 2025 is Act 870, not Act 859. It was gazetted on 1 August 2025 and came into force on 1 October 2025. The Act establishes the Malaysian Carbon Capture, Utilisation and Storage Agency under section 6 and provides the federal framework for administering and supervising CCUS activities. MyCCUS and designated competent technical entities implement the licensing, permitting, technical and compliance functions, while subsidiary regulations and operational guidance continue to be developed.',
      },
      zh: {
        title: '马来西亚《2025 年碳捕集、利用与封存法》（第 870 号法令）',
        description:
          '马来西亚《2025 年碳捕集、利用与封存法》的正式编号为第 870 号法令，而非第 859 号法令。该法于 2025 年 8 月 1 日刊宪，并于 2025 年 10 月 1 日正式生效。法案第 6 条设立马来西亚碳捕集、利用与封存管理局，为联邦层面的 CCUS 活动管理和监督提供法律框架。MyCCUS 与指定的技术主管机构承担许可、技术与合规职能，相关附属法规和操作指引仍在持续完善。',
      },
      evolution: {
        milestones: [
          {
            date: '2025-08-01',
            event: 'CCUS Act 2025 [Act 870] gazetted.',
          },
          {
            date: '2025-10-01',
            event:
              'Act entered into force and the Malaysian CCUS Agency was established.',
          },
        ],
        consolidatedFrom: [
          'my-ccus-bill-2025',
          'my-offshore-ccs-reg-2025',
          'my-ccs-framework',
        ],
      },
    },
    analysis: {
      statutory: {
        evidence:
          'Act 870 establishes the Malaysian CCUS Agency and a national licensing, permitting and compliance framework for CCUS activities.',
        citation:
          'Malaysia CCUS Act 2025 [Act 870]; MyCCUS official implementation record, 9 October 2025.',
      },
      mrv: {
        evidence:
          'The Act provides the legal basis for risk, liability, registration and post-closure controls; detailed import-permit and registration regulations remained under development in 2026.',
        citation:
          'MyCCUS official activities record, including the 22 June 2026 subsidiary-regulation workshop.',
      },
    },
  },
  {
    id: 'eu-ccs-directive',
    core: {
      country: 'European Union',
      year: 2009,
      status: 'Active',
      category: 'Regulatory',
      reviewStatus: 'verified',
      legalWeight: 'Primary Legislation',
      source: 'European Union (EUR-Lex)',
      url: 'https://eur-lex.europa.eu/eli/dir/2009/31/oj',
      pubDate: '2009-04-23',
    },
    i18n: {
      en: {
        title:
          'EU Directive 2009/31/EC on the Geological Storage of Carbon Dioxide',
        description:
          'Directive 2009/31/EC establishes the European Union legal framework for environmentally safe geological storage of carbon dioxide. It governs storage-site selection, exploration and storage permits, operation, monitoring, corrective measures, closure, post-closure obligations, financial security and transfer of responsibility to the competent authority. EUR-Lex identifies the Directive as in force and provides a consolidated version current to 24 December 2018. Later EU industrial-carbon-management measures complement the Directive but should not be described as amendments unless supported by a formal legal act.',
      },
      zh: {
        title: '欧盟《二氧化碳地质封存指令》（2009/31/EC）',
        description:
          '欧盟 2009/31/EC 指令建立了环境安全型二氧化碳地质封存的法律框架，涵盖封存场选址、勘探与封存许可、运行监测、纠正措施、关闭与关闭后义务、财务担保，以及在满足条件后向主管机关移交责任。EUR-Lex 显示该指令仍然有效，当前公开的合并文本更新至 2018 年 12 月 24 日。后续欧盟工业碳管理政策对该指令形成补充，但除非存在正式法律修订，不应表述为对指令本身的修订。',
      },
      evolution: {
        consolidatedFrom: ['eu-ccs-directive-2009'],
        currentConsolidatedVersion: '2018-12-24',
      },
    },
    analysis: {
      statutory: {
        evidence:
          'Directive 2009/31/EC creates the EU-wide permitting and lifecycle-liability framework for geological CO2 storage.',
        citation:
          'Directive 2009/31/EC, Chapters 2-5; Article 18 on transfer of responsibility.',
      },
      mrv: {
        evidence:
          'Operators must monitor the injection facilities, storage complex and surrounding environment and implement corrective measures where required.',
        citation: 'Directive 2009/31/EC, Article 13 and Annex II.',
      },
    },
  },
  {
    id: 'eu-nzia',
    core: {
      country: 'European Union',
      year: 2024,
      status: 'Active',
      category: 'Regulatory',
      reviewStatus: 'verified',
      legalWeight: 'Primary Legislation',
      source: 'European Union (EUR-Lex)',
      url: 'https://eur-lex.europa.eu/eli/reg/2024/1735/oj',
      pubDate: '2024-06-28',
    },
    analysis: {
      statutory: {
        evidence:
          'Regulation (EU) 2024/1735 sets a Union objective of at least 50 Mtpa of available CO2 injection capacity by 2030 and imposes pro-rata contribution obligations on authorised oil and gas producers.',
        citation:
          'Regulation (EU) 2024/1735, Articles 20 and 23; Commission Delegated Regulation (EU) 2025/1477.',
      },
      strategic: {
        evidence:
          'The legally defined 2030 objective requires at least 50 million tonnes of annual operational CO2 injection capacity in qualifying EU storage sites.',
        citation: 'Regulation (EU) 2024/1735, Article 20.',
      },
      market: {
        evidence:
          'Authorised oil and gas producers are assigned individual pro-rata contributions to available injection capacity, supporting a market for CO2 storage services.',
        citation:
          'Regulation (EU) 2024/1735, Article 23; Delegated Regulation (EU) 2025/1477.',
      },
    },
  },
  {
    id: 'my-mida-incentives',
    core: {
      country: 'Malaysia',
      year: 2023,
      status: 'Active',
      category: 'Incentive',
      reviewStatus: 'verified',
      legalWeight: 'Fiscal Incentive',
      source: 'Malaysian Investment Development Authority (MIDA)',
      url: 'https://www.mida.gov.my/equilibrium-through-carbon-capture-malaysias-path-to-net-zero-emissions/',
      pubDate: '2023-05-31',
    },
    i18n: {
      en: {
        title: 'Malaysia CCS Tax Incentives (Budget 2023)',
        description:
          'Malaysia introduced dedicated CCS tax incentives for applications from 25 February 2023 to 31 December 2027. In-house CCS projects and CCS service providers may receive an Investment Tax Allowance equal to 100% of qualifying capital expenditure for ten years, offset against up to 100% of statutory income. CCS service providers may alternatively receive a 70% statutory-income tax exemption for ten years. Eligible equipment receives import-duty and sales-tax exemptions, and users of CCS services may deduct qualifying service fees.',
      },
      zh: {
        title: '马来西亚 CCS 税收激励（2023 年预算）',
        description:
          '马来西亚为 2023 年 2 月 25 日至 2027 年 12 月 31 日期间提交的申请设置了专项 CCS 税收激励。企业自建 CCS 项目和 CCS 服务提供商可在十年内获得相当于合格资本支出 100% 的投资税收抵免，并最高抵扣 100% 的法定收入；CCS 服务提供商也可选择十年期、70% 法定收入免税。符合条件的 CCS 设备可享进口税和销售税豁免，使用 CCS 服务的企业还可扣除相关服务费用。',
      },
      evolution: {
        effectiveApplicationWindow: '2023-02-25/2027-12-31',
        sourcePublicationDate: '2023-05-31',
      },
    },
    analysis: {
      incentive: {
        score: 95,
        label: '100% ITA / 10 years',
        evidence:
          'Official MIDA guidance provides a 100% Investment Tax Allowance on qualifying capital expenditure for ten years, plus equipment-duty exemptions and service-fee deductions, subject to eligibility and application windows.',
        citation: 'MIDA official CCS incentive summary, 31 May 2023.',
      },
    },
  },
];

function execute(db, sql, params = []) {
  const statement = db.prepare(sql);
  statement.run(params);
  statement.free();
}

function scalar(db, sql, params = []) {
  const statement = db.prepare(sql);
  statement.bind(params);
  const value = statement.step() ? statement.get()[0] : null;
  statement.free();
  return value;
}

function policyExists(db, id) {
  return (
    Number(scalar(db, 'SELECT COUNT(*) FROM policies WHERE id = ?', [id])) > 0
  );
}

function mergeAlias(db, canonicalId, aliasId) {
  if (!policyExists(db, aliasId)) {
    return { aliasId, existed: false, linksMoved: 0 };
  }

  const linksBefore = Number(
    scalar(
      db,
      'SELECT COUNT(*) FROM policy_facility_links WHERE policy_id = ?',
      [aliasId]
    ) || 0
  );

  execute(
    db,
    `INSERT OR IGNORE INTO policy_facility_links (policy_id, facility_id)
     SELECT ?, facility_id
     FROM policy_facility_links
     WHERE policy_id = ?`,
    [canonicalId, aliasId]
  );
  execute(db, 'DELETE FROM policies WHERE id = ?', [aliasId]);

  return { aliasId, existed: true, linksMoved: linksBefore };
}

function updateCanonicalPolicy(db, update, auditDate) {
  if (!policyExists(db, update.id)) {
    throw new Error(`Canonical policy is missing: ${update.id}`);
  }

  const core = update.core;
  execute(
    db,
    `UPDATE policies
     SET country = ?, year = ?, status = ?, category = ?, review_status = ?,
         legal_weight = ?, source = ?, url = ?, pub_date = ?,
         provenance_reviewer = ?, provenance_last_audit_date = ?
     WHERE id = ?`,
    [
      core.country,
      core.year,
      core.status,
      core.category,
      core.reviewStatus,
      core.legalWeight,
      core.source,
      core.url,
      core.pubDate,
      'Primary-source audit',
      auditDate,
      update.id,
    ]
  );

  if (update.i18n) {
    const evolutionJson = JSON.stringify(update.i18n.evolution || {});
    for (const lang of ['en', 'zh']) {
      const localized = update.i18n[lang];
      if (!localized) continue;
      execute(
        db,
        `UPDATE policy_i18n
         SET title = ?, description = ?, evolution_json = ?
         WHERE policy_id = ? AND lang = ?`,
        [localized.title, localized.description, evolutionJson, update.id, lang]
      );
    }
  }

  if (update.analysis) {
    for (const [dimension, values] of Object.entries(update.analysis)) {
      const assignments = [];
      const params = [];
      for (const field of ['score', 'label', 'evidence', 'citation']) {
        if (values[field] === undefined) continue;
        assignments.push(`${field} = ?`);
        params.push(values[field]);
      }
      if (assignments.length === 0) continue;
      params.push(update.id, dimension);
      execute(
        db,
        `UPDATE policy_analysis SET ${assignments.join(', ')}
         WHERE policy_id = ? AND dimension = ?`,
        params
      );
    }
  }
}

export function applyPolicyLifecycleMigration(
  db,
  { auditDate = '2026-07-21' } = {}
) {
  db.run('PRAGMA foreign_keys = ON');
  const beforeCount = Number(scalar(db, 'SELECT COUNT(*) FROM policies') || 0);
  const aliasResults = [];

  db.run('BEGIN TRANSACTION');
  try {
    for (const family of POLICY_FAMILIES) {
      if (!policyExists(db, family.canonicalId)) {
        throw new Error(`Canonical policy is missing: ${family.canonicalId}`);
      }
      for (const aliasId of family.aliases) {
        aliasResults.push(mergeAlias(db, family.canonicalId, aliasId));
      }
    }

    for (const update of CANONICAL_UPDATES) {
      updateCanonicalPolicy(db, update, auditDate);
    }

    execute(db, 'INSERT OR REPLACE INTO db_meta (key, value) VALUES (?, ?)', [
      `migration:${MIGRATION_ID}`,
      auditDate,
    ]);
    db.run('COMMIT');
  } catch (error) {
    db.run('ROLLBACK');
    throw error;
  }

  const afterCount = Number(scalar(db, 'SELECT COUNT(*) FROM policies') || 0);
  return {
    migrationId: MIGRATION_ID,
    beforeCount,
    afterCount,
    removedCount: beforeCount - afterCount,
    aliases: aliasResults,
  };
}

async function main() {
  if (!fs.existsSync(DB_PATH)) {
    throw new Error(`Database not found: ${DB_PATH}`);
  }

  const SQL = await initSqlJs();
  const db = new SQL.Database(new Uint8Array(fs.readFileSync(DB_PATH)));
  const summary = applyPolicyLifecycleMigration(db);
  const output = db.export();
  db.close();
  fs.writeFileSync(DB_PATH, new Uint8Array(output));

  console.log(JSON.stringify(summary, null, 2));
}

const isDirectRun =
  process.argv[1] &&
  path.resolve(process.argv[1]) ===
    path.resolve(fileURLToPath(import.meta.url));

if (isDirectRun) {
  main().catch((error) => {
    console.error(`Policy lifecycle migration failed: ${error.message}`);
    process.exit(1);
  });
}
