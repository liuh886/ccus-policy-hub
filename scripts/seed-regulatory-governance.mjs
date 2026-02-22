import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import initSqlJs from 'sql.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '../governance/db/ccus_master.sqlite');

// FACT CHECKED DATA - SOURCE OF TRUTH
const GOLDEN_RECORDS = {
  "au-offshore-ghg-act": {
    country: "Australia",
    reg: {
      pore_space_rights: "Commonwealth (Offshore) / State (Onshore)",
      liability_transfer: "Yes, to Commonwealth after closure",
      liability_period: "Min. 15 years post-closure",
      financial_assurance: "Mandatory (Full lifecycle)",
      permitting_lead_time: "3-5 years (Offshore)",
      co2_definition: "Greenhouse Gas Substance",
      cross_border_rules: "Permitted (London Protocol amended)"
    }
  },
  "us-epa-class-vi-primacy": {
    country: "United States",
    reg: {
      pore_space_rights: "Private Ownership (Surface Owner rules)",
      liability_transfer: "No Federal Transfer (Site Care: 50 years)",
      liability_period: "50 years (Default Class VI)",
      financial_assurance: "Mandatory (Trust/Bond/Insurance)",
      permitting_lead_time: "2-6 years (State Primacy accelerates)",
      co2_definition: "Solid waste or commodity (State dependent)",
      cross_border_rules: "Not applicable (Domestic)"
    }
  },
  "eu-ccs-directive": {
    country: "European Union",
    reg: {
      pore_space_rights: "Member State Jurisdiction",
      liability_transfer: "Transfer to Competent Authority",
      liability_period: "Min. 20 years post-closure",
      financial_assurance: "Mandatory (EU Directive Art. 19)",
      permitting_lead_time: "Member State dependent",
      co2_definition: "CO2 Stream (Over 95% purity)",
      cross_border_rules: "TEN-E Regulation / London Protocol"
    }
  },
  "uk-energy-act-2023": {
    country: "United Kingdom",
    reg: {
      pore_space_rights: "Crown Estate (Offshore)",
      liability_transfer: "Transfer to State (conditions apply)",
      liability_period: "Risk-based assessment",
      financial_assurance: "Mandatory (Decommissioning Fund)",
      permitting_lead_time: "Track-1 / Track-2 Clusters process",
      co2_definition: "Carbon Dioxide",
      cross_border_rules: "London Protocol / Bilateral Treaties"
    }
  },
  "no-storage-framework": {
    country: "Norway",
    reg: {
      pore_space_rights: "State Owned (NCS)",
      liability_transfer: "Transfer to State allowed",
      liability_period: "Agreed in Plan for Development (PDO)",
      financial_assurance: "Mandatory",
      permitting_lead_time: "1-3 years (Mature regulatory)",
      co2_definition: "Industrial Gas",
      cross_border_rules: "Permitted (Northern Lights precedent)"
    }
  },
  "id-presidential-reg-14-2024": {
    country: "Indonesia",
    reg: {
      pore_space_rights: "State Owned",
      liability_transfer: "To Government after monitoring period",
      liability_period: "10 years (Proposed)",
      financial_assurance: "Mandatory (Performance Bond)",
      permitting_lead_time: "Developing (PSC amendment)",
      co2_definition: "Carbon Emission",
      cross_border_rules: "Allowed (30% Capacity Cap allocated)"
    }
  },
  "cn-mee-env-guidance-2024": {
    country: "China",
    reg: {
      pore_space_rights: "State Owned (Mineral Resources Law)",
      liability_transfer: "Pending specific legislation",
      liability_period: "Project lifetime + Post-closure (TBD)",
      financial_assurance: "Project-level assessment",
      permitting_lead_time: "2-3 years (Pilot projects)",
      co2_definition: "Industrial Resource / Pollutant",
      cross_border_rules: "Pending / Bilateral"
    }
  },
  "br-law-14993-2024": {
    country: "Brazil",
    reg: {
      pore_space_rights: "Union (State) Owned",
      liability_transfer: "Transfer to Union allowed",
      liability_period: "Permanent monitoring required until transfer",
      financial_assurance: "Mandatory",
      permitting_lead_time: "ANP Bidding Rounds",
      co2_definition: "Greenhouse Gas",
      cross_border_rules: "Pending regulation"
    }
  },
  "alberta-tier": {
    country: "Canada",
    reg: {
      pore_space_rights: "Crown (Provincial)",
      liability_transfer: "Yes, to Province (PICS Fund)",
      liability_period: "Post-closure Stewardship Fund",
      financial_assurance: "Mandatory payments to Fund",
      permitting_lead_time: "High (Competitive Hub selection)",
      co2_definition: "Sequestered Substance",
      cross_border_rules: "Provincial/Federal regulated"
    }
  }
};

function loadDb(SQL) {
  const buffer = fs.readFileSync(DB_PATH);
  return new SQL.Database(new Uint8Array(buffer));
}

function saveDb(db) {
  const data = db.export();
  fs.writeFileSync(DB_PATH, data);
}

async function run() {
  const SQL = await initSqlJs();
  const db = loadDb(SQL);
  
  console.log("Seeding Governance Data...");

  db.exec("BEGIN TRANSACTION;");
  
  try {
    for (const [policyId, data] of Object.entries(GOLDEN_RECORDS)) {
      const json = JSON.stringify(data.reg);
      console.log(`Updating ${policyId} (${data.country})...`);
      
      // Update Policy I18N (Both EN and ZH to ensure sync picks it up)
      db.run(`UPDATE policy_i18n SET regulatory_json = ? WHERE policy_id = ?`, [json, policyId]);
      
      // Force update Country I18N directly as well to be double sure
      // Note: This relies on us knowing the country name mapping.
      // We'll update the EN record for the country.
      
      // Find country ID by English Name
      const countryRow = db.exec(`SELECT id FROM country_profiles WHERE id = '${data.country}'`);
      if (countryRow.length > 0 && countryRow[0].values.length > 0) {
        const cId = countryRow[0].values[0][0];
        const r = data.reg;
        console.log(`  -> Direct injection into Country Profile: ${cId}`);
        
        ['en', 'zh'].forEach(lang => {
             db.run(`UPDATE country_i18n SET 
                pore_space_rights = ?,
                liability_transfer = ?,
                liability_period = ?,
                financial_assurance = ?,
                permitting_lead_time = ?,
                co2_definition = ?,
                cross_border_rules = ?
                WHERE country_id = ? AND lang = ?`, 
                [r.pore_space_rights, r.liability_transfer, r.liability_period, r.financial_assurance, r.permitting_lead_time, r.co2_definition, r.cross_border_rules, cId, lang]
            );
        });
      }
    }
    
    db.exec("COMMIT;");
    saveDb(db);
    console.log("Governance Data Seeded Successfully.");
  } catch (e) {
    console.error("Error seeding data:", e);
    db.exec("ROLLBACK;");
  }
}

run();
