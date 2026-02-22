async function dbExportMd(SQL) {
  console.log('EXPORT: Markdown Content...');
  const db = loadDb(SQL);
  const auditPass = db.get("SELECT value FROM db_meta WHERE key = 'last_audit_pass'");
  if (!auditPass || auditPass.value !== 'true') throw new Error('Export blocked. Last audit failed. (Gate B2)');

  const deepClean = (obj) => {
    if (Array.isArray(obj)) return obj.map(deepClean);
    if (obj !== null && typeof obj === 'object') {
      const newObj = {};
      Object.keys(obj).sort().forEach(k => {
        const val = deepClean(obj[k]);
        if (val !== undefined) newObj[k] = val;
      });
      return Object.keys(newObj).length > 0 ? newObj : undefined;
    }
    return obj === null ? undefined : obj;
  };
  const cleanStr = (s) => (s || "").replace(/\n/g, '\n').trim();

  // Load dictionary for translation
  let dict = { countries: {}, ui: { status: {}, categories: {} } };
  try {
    dict = JSON.parse(fs.readFileSync(LEGACY_I18N_PATH, 'utf8'));
  } catch (e) {}

  const translate = (key, domain, lang) => {
    if (lang === 'en' || !key) return key;
    if (domain === 'country') {
      for (const [alias, canon] of Object.entries(dict.countries)) {
        if (canon === key && /[\u4e00-\u9fa5]/.test(alias)) return alias;
      }
    }
    if (domain === 'status' && dict.ui.status[key]?.zh) return dict.ui.status[key].zh;
    if (domain === 'category' && dict.ui.categories[key]?.zh) return dict.ui.categories[key].zh;
    return key;
  };

  // 1. Policies
  db.all('SELECT * FROM policies ORDER BY id').forEach(p => {
    const analysis = {};
    db.all('SELECT * FROM policy_analysis WHERE policy_id = ? ORDER BY dimension', [p.id]).forEach(r => {
      analysis[r.dimension] = { score: r.score || 0, label: r.label || "Pending", evidence: r.evidence || "No evidence provided yet.", citation: r.citation || "", auditNote: r.audit_note || "" };
    });
    const relatedFacs = db.all('SELECT facility_id FROM policy_facility_links WHERE policy_id = ? ORDER BY facility_id', [p.id]).map(r => r.facility_id);
    
    ['en', 'zh'].forEach(lang => {
      const i18n = db.get('SELECT * FROM policy_i18n WHERE policy_id = ? AND lang = ?', [p.id, lang]);
      if (!i18n) return;
      
      const safeParse = (str) => {
        if (!str) return undefined;
        try { return JSON.parse(str); } catch (e) { return undefined; }
      };

      const frontmatter = deepClean({
        id: p.id,
        title: i18n.title,
        country: translate(p.country, 'country', lang),
        year: p.year,
        status: translate(p.status, 'status', lang),
        category: translate(p.category, 'category', lang),
        pubDate: p.pub_date || "2026-01-01",
        reviewStatus: p.review_status,
        legalWeight: p.legal_weight || "Guideline/Policy",
        source: p.source || "",
        sectors: [],
        description: (i18n.description || "").substring(0, 500).replace(/\n/g, ' '),
        analysis,
        impactAnalysis: safeParse(i18n.impact_analysis_json),
        interpretation: i18n.interpretation,
        evolution: safeParse(i18n.evolution_json),
        regulatory: safeParse(i18n.regulatory_json),
        relatedFacilities: relatedFacs,
        provenance: { author: p.provenance_author || "System", reviewer: p.provenance_reviewer || "Human Audit Pending", lastAuditDate: p.provenance_last_audit_date || "" }
      });

      if (p.url && p.url.startsWith('http')) frontmatter.url = p.url;
      const contentDir = path.join(__dirname, '../src/content/policies', lang);
      if (!fs.existsSync(contentDir)) fs.mkdirSync(contentDir, { recursive: true });
      fs.writeFileSync(path.join(contentDir, `${p.id}.md`), `---
${JSON.stringify(frontmatter, null, 2)}
---

${cleanStr(i18n.description)}
`);
    });
  });

  // 2. Facilities
  db.all('SELECT * FROM facilities ORDER BY id').forEach(f => {
    const relatedPols = db.all('SELECT policy_id FROM policy_facility_links WHERE facility_id = ? ORDER BY policy_id', [f.id]).map(r => r.policy_id);
    ['en', 'zh'].forEach(lang => {
      const i18n = db.get('SELECT * FROM facility_i18n WHERE facility_id = ? AND lang = ?', [f.id, lang]);
      if (!i18n) return;
      const partners = db.all('SELECT partner FROM facility_partners WHERE facility_id = ? AND lang = ? ORDER BY order_index', [f.id, lang]).map(r => r.partner);
      const links = db.all('SELECT link FROM facility_links WHERE facility_id = ? AND lang = ? ORDER BY order_index', [f.id, lang]).map(r => r.link);
      
      const displayCountry = translate(f.country, 'country', lang);
      const displayStatus = translate(f.status, 'status', lang);

      let description = i18n.description;
      if (!description || description.trim() === i18n.name) {
        if (lang === 'zh') {
          description = `### 项目概览

该项目位于 ${displayCountry}${i18n.region ? ` (${i18n.region})` : ''}，属于 ${i18n.sector || 'CCUS'} 领域。设施类型为 ${i18n.type || '捕集设施'}，当前状态为 ${displayStatus}。${i18n.hub ? `作为 ${i18n.hub} 枢纽的一部分，` : ''}${i18n.operator ? `由 ${i18n.operator} 负责运营。` : ''}`;
        } else {
          description = `### Project Overview

This project is located in ${displayCountry}${i18n.region ? ` (${i18n.region})` : ''}, within the ${i18n.sector || 'CCUS'} sector. The facility is classified as ${i18n.type || 'Capture'} and is currently ${displayStatus}. ${i18n.hub ? `As part of the ${i18n.hub} hub, ` : ''}${i18n.operator ? `it is operated by ${i18n.operator}.` : ''}`;
        }
      }

      const frontmatter = deepClean({
        id: f.id, name: i18n.name, lang, country: displayCountry, region: i18n.region || "", type: i18n.type || "", status: displayStatus,
        announcedCapacityMin: f.announced_capacity_min || 0,
        announcedCapacityMax: f.announced_capacity_max || 0,
        announcedCapacityRaw: f.announced_capacity_raw || "",
        estimatedCapacity: f.estimated_capacity || 0,
        coordinates: [f.lat || 0, f.lng || 0], precision: f.precision || "approximate", sector: i18n.sector || "",
        fateOfCarbon: i18n.fate_of_carbon || "", hub: i18n.hub || "", phase: i18n.phase || "",
        announcement: i18n.announcement || "",
        operator: i18n.operator,
        captureTechnology: i18n.capture_technology,
        storageType: i18n.storage_type,
        investmentScale: f.investment_scale,
        fid: i18n.fid || "", operation: i18n.operation || "", suspensionDate: i18n.suspension_date || "",
        partners: partners.sort(), links: links.filter(l => l.startsWith('http')).sort(), relatedPolicies: relatedPols.sort(),
        provenance: { author: f.provenance_author || "IEA Ingestion", reviewer: f.provenance_reviewer || "Human Audit Pending", lastAuditDate: f.provenance_last_audit_date || "" }
      });

      if (f.url && f.url.startsWith('http')) frontmatter.url = f.url;
      const contentDir = path.join(__dirname, '../src/content/facilities', lang);
      if (!fs.existsSync(contentDir)) fs.mkdirSync(contentDir, { recursive: true });
      fs.writeFileSync(path.join(contentDir, `${f.id}.md`), `---
${JSON.stringify(frontmatter, null, 2)}
---

${cleanStr(description)}
`);
    });
  });

  // 3. Country Profiles
  db.all('SELECT * FROM country_profiles ORDER BY id').forEach(c => {
    ['en', 'zh'].forEach(lang => {
      const i18n = db.get('SELECT * FROM country_i18n WHERE country_id = ? AND lang = ?', [c.id, lang]);
      if (!i18n) return;

      const frontmatter = deepClean({
        id: c.id,
        name: i18n.name,
        lang,
        region: c.region || "",
        summary: i18n.summary || "",
        regulatory: {
          pore_space_rights: i18n.pore_space_rights,
          liability_transfer: i18n.liability_transfer,
          liability_period: i18n.liability_period,
          financial_assurance: i18n.financial_assurance,
          permitting_lead_time: i18n.permitting_lead_time,
          co2_definition: i18n.co2_definition,
          cross_border_rules: i18n.cross_border_rules
        },
        strategicTargets: {
          capture2030: c.capture_2030,
          storage2050: c.storage_2050,
          netZeroYear: c.net_zero_year ? parseInt(c.net_zero_year) : undefined
        },
        provenance: {
          author: c.provenance_author || "System",
          reviewer: c.provenance_reviewer || "Human Audit Pending",
          lastAuditDate: c.provenance_last_audit_date || ""
        }
      });

      const contentDir = path.join(__dirname, '../src/content/countries', lang);
      if (!fs.existsSync(contentDir)) fs.mkdirSync(contentDir, { recursive: true });
      fs.writeFileSync(path.join(contentDir, `${c.id.toLowerCase().replace(/ /g, '-')}.md`), `---
${JSON.stringify(frontmatter, null, 2)}
---

${cleanStr(i18n.summary)}
`);
    });
  });

  console.log('DONE.');
}
