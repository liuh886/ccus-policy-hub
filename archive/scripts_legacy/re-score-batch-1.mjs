import fs from 'fs';

const DB_PATH = 'src/data/policy_database.json';
const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));

const reevaluations = [
    {
        id: "us-nd-century-code-38-22",
        zh: {
            title: "美国北达科他州法典第 38-22 章 (二氧化碳地质封存)",
            country: "美国",
            scope: "Sub-national",
            region: "North Dakota",
            legalWeight: "Primary Legislation",
            year: 2009,
            status: "Active",
            category: "Regulatory Framework",
            tags: ["责任移交锚点", "封存许可", "10年移交"],
            description: "全球最具标杆意义的州级 CCS 法律之一，确立了北达科他州对地下封存的监管主权，并首创了 10 年责任移交机制。",
            pubDate: "2009-07-01",
            url: "https://www.ndlegis.gov/cencode/t38c22.pdf",
            source: "ND Legislature",
            analysis: {
                frameworkVersion: "5.0",
                incentive: { score: 40, label: "Primacy speed", evidence: "North Dakota was the first state to receive Class VI primacy, dramatically reducing permitting costs.", citation: "NDCC 38-22-01" },
                statutory: { score: 95, label: "State Primacy Leader", evidence: "Comprehensive state-level authority delegated by EPA.", citation: "NDCC 38-22-03" },
                liability: { score: 100, label: "10-Year Transfer (Gold Standard)", evidence: "State assumes all long-term liability 10 years after injection ends.", citation: "NDCC 38-22-17", auditNote: "World's most aggressive R-dimension benchmark." },
                mrv: { score: 90, label: "Class VI+ Standards", evidence: "State monitoring rules meet or exceed federal mass balance requirements.", citation: "NDCC 38-22-12" },
                market: { score: 65, label: "Coal-CCS Synergy", evidence: "Designed to preserve the state's coal-fired power industry via carbon management.", citation: "NDCC 38-22-01 Policy Statement" }
            }
        },
        en: {
            title: "North Dakota Century Code Chapter 38-22 (Geologic Storage of CO2)",
            country: "United States",
            scope: "Sub-national",
            region: "North Dakota",
            legalWeight: "Primary Legislation",
            year: 2009,
            status: "Active",
            category: "Regulatory Framework",
            tags: ["Liability Benchmark", "10-year Transfer", "ND Law"],
            description: "A foundational state law establishing the regulatory and liability transfer framework for CO2 storage in North Dakota.",
            pubDate: "2009-07-01",
            url: "https://www.ndlegis.gov/cencode/t38c22.pdf",
            source: "ND Legislature",
            analysis: {
                frameworkVersion: "5.0",
                incentive: { score: 40, label: "Permit Certainty", evidence: "First-in-nation primacy provides massive administrative de-risking.", citation: "38-22-01" },
                statutory: { score: 95, label: "Consolidated Authority", evidence: "Full state control over the storage permitting process.", citation: "38-22-03" },
                liability: { score: 100, label: "10-Year Transfer", evidence: "State stewardship assumes liability 10 years post-injection.", citation: "38-22-17" },
                mrv: { score: 90, label: "High Stringency", evidence: "Rigorous monitoring protocols aligned with EPA Class VI.", citation: "38-22-12" },
                market: { score: 65, label: "Energy Security", evidence: "Enables continued coal usage while meeting emissions goals.", citation: "38-22-01" }
            }
        }
    },
    {
        id: "us-wy-hb-0200",
        zh: {
            title: "美国怀俄明州 HB 0200 号法案 (低碳可靠能源标准)",
            country: "美国",
            scope: "Sub-national",
            region: "Wyoming",
            legalWeight: "Primary Legislation",
            year: 2020,
            status: "Active",
            category: "Economic Incentive",
            tags: ["强制性配额", "成本回收", "煤电CCUS"],
            description: "怀俄明州核心能源法，强制要求公用事业公司到 2030 年必须包含一定比例的 CCUS 低碳电力，否则将面临成本回收限制。",
            pubDate: "2020-03-12",
            url: "https://wyoleg.gov/2020/Enroll/HB0200.pdf",
            source: "Wyoming Legislature",
            analysis: {
                frameworkVersion: "5.0",
                incentive: { score: 85, label: "Mandatory Cost Recovery", evidence: "Allows utilities to recover CCUS costs from ratepayers, creating a guaranteed funding pool.", citation: "HB 0200, Section 1", auditNote: "Innovative F-dimension model: Ratepayer-funded CCS." },
                statutory: { score: 90, label: "Portfolio Mandate", evidence: "Legally mandates CCUS as part of the state's energy portfolio standard.", citation: "W.S. 37-18-102" },
                liability: { score: 75, label: "Utility Stewardship", evidence: "Utilities manage operational risk under PSC oversight.", citation: "Section 3" },
                mrv: { score: 80, label: "PSC Audit", evidence: "Requires Public Service Commission verification of low-carbon performance (<650 lbs CO2/MWh).", citation: "W.S. 37-18-101" },
                market: { score: 70, label: "Captive Demand", evidence: "Creates a captive domestic market for CCUS-enabled coal power.", citation: "Policy Intent" }
            }
        },
        en: {
            title: "Wyoming House Bill 0200 (Low-Carbon Reliable Energy Standard)",
            country: "United States",
            scope: "Sub-national",
            region: "Wyoming",
            legalWeight: "Primary Legislation",
            year: 2020,
            status: "Active",
            category: "Economic Incentive",
            tags: ["Mandatory CCUS", "Cost Recovery", "Coal"],
            description: "A state law requiring public utilities to generate a portion of their electricity using CCUS-equipped coal plants.",
            pubDate: "2020-03-12",
            url: "https://wyoleg.gov/2020/Enroll/HB0200.pdf",
            source: "Wyoming Legislature",
            analysis: {
                frameworkVersion: "5.0",
                incentive: { score: 85, label: "Ratepayer Funding", evidence: "Guaranteed cost recovery mechanism for CCUS-equipped plants.", citation: "HB 0200" },
                statutory: { score: 90, label: "Binding Standard", evidence: "First state law to mandate CCUS via a portfolio standard.", citation: "W.S. 37-18-102" },
                liability: { score: 75, label: "Regulated Risk", evidence: "PSC-governed risk management for power producers.", citation: "Section 3" },
                mrv: { score: 80, label: "Intensity Targets", evidence: "Mandatory limit of 650 lbs CO2/MWh for 'low-carbon' designation.", citation: "W.S. 37-18-101" },
                market: { score: 70, label: "Internal Market", evidence: "Protects coal assets in a low-carbon regulatory environment.", citation: "Bill Intent" }
            }
        }
    },
    {
        id: "cn-ordos-pilot-2024",
        zh: {
            title: "国家碳达峰试点 (鄂尔多斯) 实施方案 (2024)",
            country: "中国",
            scope: "Sub-national",
            region: "内蒙古自治区",
            legalWeight: "Administrative Regulation",
            year: 2024,
            status: "Active",
            category: "Strategic Guidance",
            tags: ["碳达峰试点", "能源盆地", "全流程示范"],
            description: "国家发改委批准的试点方案，将鄂尔多斯定位为 CCUS 规模化应用的高地，重点支持煤制油、煤化工全流程示范。",
            pubDate: "2024-04-29",
            url: "http://www.ordos.gov.cn/",
            source: "鄂尔多斯市人民政府",
            analysis: {
                frameworkVersion: "5.0",
                incentive: { score: 75, label: "National & Local Synergies", evidence: "Allocates special pilot funds for advanced green technology demonstration.", citation: "第四章：重点工程" },
                statutory: { score: 80, label: "National Pilot Mandate", evidence: "Backed by NDRC approval as one of the first batch of national carbon peaking pilots.", citation: "发改气候〔2024〕通知", auditNote: "Strong policy-led statutory pillar." },
                liability: { score: 45, label: "Project-level Oversight", evidence: "Site care is managed via existing environmental safety protocols for industrial parks.", citation: "第五章：安全保障" },
                mrv: { score: 85, label: "Digital Platform", evidence: "Mandates the construction of a city-wide carbon emission real-time monitoring platform.", citation: "第三章：基础能力建设" },
                market: { score: 75, label: "Super-Basin Market", evidence: "Leverages the massive concentration of emission sources and storage sinks in the Ordos Basin.", citation: "第二章：总体要求" }
            }
        },
        en: {
            title: "National Carbon Peaking Pilot (Ordos) Implementation Plan (2024)",
            country: "China",
            scope: "Sub-national",
            region: "Inner Mongolia",
            legalWeight: "Administrative Regulation",
            year: 2024,
            status: "Active",
            category: "Strategic Guidance",
            tags: ["Ordos Pilot", "Energy Hub", "Full-chain Demo"],
            description: "A flagship national pilot roadmap positioning Ordos as a global leader in large-scale CCUS applications for coal-based industries.",
            pubDate: "2024-04-29",
            url: "http://www.ordos.gov.cn/",
            source: "Ordos People's Government",
            analysis: {
                frameworkVersion: "5.0",
                incentive: { score: 75, label: "Pilot Grants", evidence: "Dedicated fiscal support for large-scale technology demonstration.", citation: "Chapter 4" },
                statutory: { score: 80, label: "NDRC Approved", evidence: "National-level recognition as a decarbonization test zone.", citation: "NDRC Circular 2024" },
                liability: { score: 45, label: "Safety Protocols", evidence: "Standard industrial site safety and remediation rules.", citation: "Chapter 5" },
                mrv: { score: 85, label: "City-wide Monitoring", evidence: "Implementation of a digital carbon accounting and monitoring platform.", citation: "Chapter 3" },
                market: { score: 75, label: "Resource Synergy", evidence: "Optimizes the linkage between heavy industry and saline aquifer storage assets.", citation: "Chapter 2" }
            }
        }
    }
];

reevaluations.forEach(np => {
    const idx = db.policies.findIndex(p => p.id === np.id);
    if (idx !== -1) {
        db.policies[idx] = np;
        console.log(`[Re-score] Upgraded ${np.id} to high-fidelity evidence.`);
    } else {
        db.policies.push(np);
        console.log(`[New-Audit] Added ${np.id} as a new heartland benchmark.`);
    }
});

db.lastUpdated = new Date().toISOString();
fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
