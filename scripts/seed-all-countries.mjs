import fs from 'fs';
import path from 'path';
import initSqlJs from 'sql.js';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '../governance/db/ccus_master.sqlite');

const MAJOR_COUNTRY_DATA = {
  "United States": {
    en: {
      summary: "Global leader in CCUS deployment, driven by the Section 45Q tax credit and established EPA Class VI permitting for geological storage.",
      regulatory: {
        pore_space_rights: "Private Ownership (Surface owner in most states)",
        liability_transfer: "Permitted under specific state/federal frameworks (Class VI)",
        liability_period: "50 years (standard)",
        financial_assurance: "Mandatory (Trust fund, insurance, or bond)",
        permitting_lead_time: "3-6 years (Class VI timeline)",
        co2_definition: "Managed Substance / Commodity",
        cross_border_rules: "London Protocol aligned; bilateral allowed"
      }
    },
    zh: {
      summary: "全球 CCUS 部署的领跑者，主要由 45Q 税收抵免政策和成熟的 EPA Class VI 封存许可体系驱动。",
      regulatory: {
        pore_space_rights: "私有为主（多数州归地表权人所有）",
        liability_transfer: "在特定州/联邦框架下允许转移 (Class VI)",
        liability_period: "50 年（标准期）",
        financial_assurance: "强制性要求（信托基金、保险或保证金）",
        permitting_lead_time: "3-6 年 (Class VI 流程)",
        co2_definition: "受控物质 / 工业商品",
        cross_border_rules: "符合《伦敦议定书》；允许双边跨境"
      }
    }
  },
  "China": {
    en: {
      summary: "China is rapidly scaling CCUS clusters in key industrial provinces, focused on EOR and new methodologies under the voluntary CCER market.",
      regulatory: {
        pore_space_rights: "State Owned",
        liability_transfer: "Pending national framework",
        liability_period: "TBD",
        financial_assurance: "Project-level requirements",
        permitting_lead_time: "2-3 years",
        co2_definition: "Industrial Resource",
        cross_border_rules: "Bilateral agreements permitted"
      }
    },
    zh: {
      summary: "中国正加速在主要工业省份部署 CCUS 集群，重点关注 EOR 以及 CCER 自愿碳市场下的新方法学。",
      regulatory: {
        pore_space_rights: "国家所有",
        liability_transfer: "待国家级框架明确",
        liability_period: "待定",
        financial_assurance: "项目级审批要求",
        permitting_lead_time: "2-3 年",
        co2_definition: "工业资源",
        cross_border_rules: "允许双边协议框架下的跨境"
      }
    }
  },
  "Norway": {
    en: {
      summary: "Pioneer in offshore CO2 storage through the Longship project and the Northern Lights infrastructure, acting as Europe's central storage hub.",
      regulatory: {
        pore_space_rights: "State Owned (Continental Shelf)",
        liability_transfer: "Transfer to State after 20 years (EU aligned)",
        liability_period: "20 years post-closure",
        financial_assurance: "Mandatory security for closure and leakages",
        permitting_lead_time: "2-4 years",
        co2_definition: "Managed Substance",
        cross_border_rules: "London Protocol pioneer (EU Hub model)"
      }
    },
    zh: {
      summary: "通过“长船”计划和“北光”基础设施，挪威成为离岸封存的先驱，扮演着欧洲中央封存枢纽的角色。",
      regulatory: {
        pore_space_rights: "国家所有（大陆架）",
        liability_transfer: "20 年后转移至国家（与欧盟对齐）",
        liability_period: "闭坑后 20 年",
        financial_assurance: "强制性的闭坑与泄漏财务担保",
        permitting_lead_time: "2-4 年",
        co2_definition: "受控物质",
        cross_border_rules: "《伦敦议定书》先驱（欧盟枢纽模式）"
      }
    }
  },
  "European Union": {
    en: {
      summary: "Governance centered on the CCS Directive and the Net-Zero Industry Act, creating a harmonized framework for European industrial decarbonization.",
      regulatory: {
        pore_space_rights: "Member State determined (usually State)",
        liability_transfer: "Transferable to Member State post-closure",
        liability_period: "20 years minimum",
        financial_assurance: "Mandatory under CCS Directive",
        permitting_lead_time: "Varies (Directive targets faster paths)",
        co2_definition: "Non-Waste (under specified conditions)",
        cross_border_rules: "Integrated Single Market rules"
      }
    },
    zh: {
      summary: "治理核心为欧盟 CCS 指令与《净零工业法案》，旨在为欧洲工业脱碳建立统一的监管框架。",
      regulatory: {
        pore_space_rights: "成员国自行决定（通常为国家所有）",
        liability_transfer: "闭坑后可转移至成员国",
        liability_period: "至少 20 年",
        financial_assurance: "CCS 指令下的强制要求",
        permitting_lead_time: "因成员国而异（法案目标是缩短路径）",
        co2_definition: "非废弃物（特定条件下）",
        cross_border_rules: "统一的单一市场规则"
      }
    }
  }
};

async function main() {
  const SQL = await initSqlJs();
  const buffer = fs.readFileSync(DB_PATH);
  const db = new SQL.Database(buffer);
  
  const countriesData = JSON.parse(fs.readFileSync('src/data/countries.json', 'utf8'));

  db.run("BEGIN TRANSACTION");
  try {
    for (const [id, translations] of Object.entries(countriesData)) {
      const major = MAJOR_COUNTRY_DATA[id];
      
      // Upsert Country Profile
      db.run("INSERT OR REPLACE INTO country_profiles (id, region) VALUES (?, ?)", [id, "Global"]);
      
      ['en', 'zh'].forEach(lang => {
        const name = translations[lang] || id;
        const summary = major?.[lang]?.summary || `National CCUS governance profile for ${name}.`;
        const reg = major?.[lang]?.regulatory || {
          pore_space_rights: "Pending",
          liability_transfer: "Pending",
          liability_period: "Pending",
          financial_assurance: "Pending",
          permitting_lead_time: "Pending",
          co2_definition: "Pending",
          cross_border_rules: "Pending"
        };

        db.run(`INSERT OR REPLACE INTO country_i18n (
          country_id, lang, name, summary, 
          pore_space_rights, liability_transfer, liability_period, 
          financial_assurance, permitting_lead_time, co2_definition, cross_border_rules
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, lang, name, summary, reg.pore_space_rights, reg.liability_transfer, reg.liability_period, reg.financial_assurance, reg.permitting_lead_time, reg.co2_definition, reg.cross_border_rules]);
      });
    }
    db.run("COMMIT");
    const data = db.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
    console.log(`Initialized ${Object.keys(countriesData).length} country profiles.`);
  } catch (e) {
    db.run("ROLLBACK");
    console.error(e);
  }
}

main();
