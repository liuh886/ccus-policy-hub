import fs from 'fs';
import path from 'path';
import initSqlJs from 'sql.js';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '../governance/db/ccus_master.sqlite');

async function seed() {
  const SQL = await initSqlJs();
  const buffer = fs.readFileSync(DB_PATH);
  const db = new SQL.Database(buffer);

  const countries = [
    {
      id: "China",
      region: "Asia",
      net_zero_year: 2060,
      capture_2030: "50-100 Mtpa",
      en: {
        name: "China",
        summary: "China's CCUS framework is rapidly evolving from pilot demonstrations to industrial-scale clusters, guided by the 2024 National Roadmap.",
        regulatory: {
          pore_space_rights: "State Owned",
          liability_transfer: "Pending national regulation",
          liability_period: "TBD",
          financial_assurance: "Project-specific bonding",
          permitting_lead_time: "2-3 years",
          co2_definition: "Industrial Resource",
          cross_border_rules: "Bilateral agreements permitted"
        }
      },
      zh: {
        name: "中国",
        summary: "中国的 CCUS 治理体系正从早期试点向工业集群化阶段跨越，以 2024 版国家技术路线图为战略指引。",
        regulatory: {
          pore_space_rights: "国家所有",
          liability_transfer: "待国家级法律明确",
          liability_period: "待定",
          financial_assurance: "基于项目的保证金制度",
          permitting_lead_time: "2-3 年",
          co2_definition: "工业资源/商品",
          cross_border_rules: "允许双边协议框架下的跨境"
        }
      }
    },
    {
      id: "United States",
      region: "North America",
      net_zero_year: 2050,
      capture_2030: "100+ Mtpa",
      en: {
        name: "United States",
        summary: "The US leads global CCUS deployment through robust fiscal incentives (45Q) and a mature EPA-led regulatory framework.",
        regulatory: {
          pore_space_rights: "Private / Surface Owner (State varies)",
          liability_transfer: "Transferable under Class VI framework",
          liability_period: "50 years (standard)",
          financial_assurance: "Mandatory Trust/Insurance",
          permitting_lead_time: "3-6 years (Class VI)",
          co2_definition: "Managed Substance",
          cross_border_rules: "London Protocol consistent"
        }
      },
      zh: {
        name: "美国",
        summary: "美国凭借 45Q 强力财政激励与成熟的 EPA 监管框架，在全产业链部署规模上处于全球领先地位。",
        regulatory: {
          pore_space_rights: "私有/地表权人所有 (因州而异)",
          liability_transfer: "Class VI 框架下可转移至州/联邦",
          liability_period: "50 年 (标准期)",
          financial_assurance: "强制性信托/保险要求",
          permitting_lead_time: "3-6 年 (Class VI)",
          co2_definition: "受控物质",
          cross_border_rules: "符合《伦敦议定书》框架"
        }
      }
    }
  ];

  db.run("BEGIN TRANSACTION");
  try {
    for (const c of countries) {
      db.run(`INSERT OR REPLACE INTO country_profiles (id, region, net_zero_year, capture_2030) VALUES (?, ?, ?, ?)`,
        [c.id, c.region, c.net_zero_year, c.capture_2030]);
      
      ['en', 'zh'].forEach(lang => {
        const i = c[lang];
        db.run(`INSERT OR REPLACE INTO country_i18n (country_id, lang, name, summary, pore_space_rights, liability_transfer, liability_period, financial_assurance, permitting_lead_time, co2_definition, cross_border_rules)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [c.id, lang, i.name, i.summary, i.regulatory.pore_space_rights, i.regulatory.liability_transfer, i.regulatory.liability_period, i.regulatory.financial_assurance, i.regulatory.permitting_lead_time, i.regulatory.co2_definition, i.regulatory.cross_border_rules]);
      });
    }
    db.run("COMMIT");
    const data = db.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
    console.log("Seeded initial countries.");
  } catch (e) {
    db.run("ROLLBACK");
    console.error(e);
  }
}

seed();
