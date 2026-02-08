import fs from 'fs';

const DB_PATH = 'src/data/policy_database.json';
const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));

const batch9 = [
    {
        id: "au-offshore-ghg-safety-2024",
        zh: {
            title: "澳大利亚离岸石油与温室气体封存安全修正案 (2024)",
            country: "澳大利亚",
            scope: "National",
            legalWeight: "Primary Legislation",
            year: 2024,
            status: "Active",
            category: "Regulatory Framework",
            tags: ["离岸封存", "职业安全", "监管现代化"],
            description: "对 2006 年主法案的重大修订，将离岸温室气体封存的安全标准与国家工作健康与安全法对齐，强化了离岸作业的监管合规性。",
            pubDate: "2024-06-19",
            url: "https://www.legislation.gov.au/Details/C2024A00042",
            source: "澳大利亚议会",
            analysis: {
                frameworkVersion: "5.0",
                incentive: { score: 30, label: "Stability focus", evidence: "Focuses on safety and labor compliance rather than fiscal subsidy.", citation: "Schedule 1: Safety Management" },
                statutory: { score: 90, label: "Updated Storage Law", evidence: "Modernizes the 2006 baseline to support massive offshore GHG hubs.", citation: "Part 1: Amendments to the 2006 Act", auditNote: "High score for regulatory durability." },
                liability: { score: 75, label: "Operator Safety Liability", evidence: "Strengthens operator accountability for offshore safety incidents.", citation: "Section 12: Worker Protection" },
                mrv: { score: 85, label: "Safety-linked Monitoring", evidence: "Mandates rigorous safety management documents and reviews for injection activities.", citation: "Schedule 2: Diving and Safety" },
                market: { score: 65, label: "Regional Hub Support", evidence: "Ensures Australian offshore storage remains attractive via world-class safety standards.", citation: "Explanatory Memorandum" }
            }
        },
        en: {
            title: "Australia Offshore Petroleum and GHG Storage Amendment (Safety) Act 2024",
            country: "Australia",
            scope: "National",
            legalWeight: "Primary Legislation",
            year: 2024,
            status: "Active",
            category: "Regulatory Framework",
            tags: ["Offshore Storage", "Worker Safety", "Compliance"],
            description: "Amends the national offshore storage framework to ensure safety standards meet modernized national labor laws.",
            pubDate: "2024-06-19",
            url: "https://www.legislation.gov.au/Details/C2024A00042",
            source: "Australian Parliament",
            analysis: {
                frameworkVersion: "5.0",
                incentive: { score: 30, label: "Stability focus", evidence: "Regulatory focus on operational de-risking.", citation: "Schedule 1" },
                statutory: { score: 90, label: "Modernized Framework", evidence: "Integrates the OPGGS Act with modern WHS standards.", citation: "Act No. 42 of 2024" },
                liability: { score: 75, label: "Safety Accountability", evidence: "Enhanced protections and responsibilities for offshore operators.", citation: "Section 12" },
                mrv: { score: 85, label: "High-integrity Safety", evidence: "Rigorous reporting and auditing of safety-critical systems.", citation: "Schedule 2" },
                market: { score: 65, label: "Licensing Integrity", evidence: "Increases social license for offshore storage activities.", citation: "Strategic Objective" }
            }
        }
    },
    {
        id: "ng-nuprc-decarb-2024",
        zh: {
            title: "尼日利亚 NUPRC 脱碳与能源可持续性政策 (2024)",
            country: "尼日利亚",
            scope: "National",
            legalWeight: "Departmental Rules",
            year: 2024,
            status: "Active",
            category: "Regulatory Framework",
            tags: ["非洲枢纽", "油气脱碳", "CCUS强制要求"],
            description: "尼日利亚上游石油监管委员会 (NUPRC) 发布的突破性政策，要求从 2025 年起所有上游许可申请必须包含 CCUS 或碳管理计划。",
            pubDate: "2023-12-01",
            url: "https://nuprc.gov.ng/",
            source: "NUPRC Nigeria",
            analysis: {
                frameworkVersion: "5.0",
                incentive: { score: 55, label: "Asset-linked Incentives", evidence: "Implicitly links carbon monetization (credits) to oil/gas production licenses.", citation: "Section 3: Carbon Monetization" },
                statutory: { score: 80, label: "Mandatory CCUS Plans", evidence: "Requires CCUS initiatives in all new upstream applications starting Jan 2025.", citation: "Decarbonisation Policy, Article 1.2", auditNote: "A massive leap for African CCUS governance." },
                liability: { score: 45, label: "Emerging Stewardship", evidence: "Adopts environmental management plans (EMP) as the basis for liability.", citation: "PIA 2021 Integration" },
                mrv: { score: 75, label: "Methane & GHG Rules", evidence: "Mandates reporting of fugitive emissions and capture throughput.", citation: "2022 GHG Management Guidelines" },
                market: { score: 80, label: "Carbon Credit Focus", evidence: "Aims to integrate Nigeria's upstream into global green energy markets via credits.", citation: "Section 4: Market Strategy" }
            }
        },
        en: {
            title: "Nigeria NUPRC Decarbonisation and Energy Sustainability Policy (2024)",
            country: "Nigeria",
            scope: "National",
            legalWeight: "Departmental Rules",
            year: 2024,
            status: "Active",
            category: "Regulatory Framework",
            tags: ["Nigeria Hub", "Petroleum Industry", "CCUS Mandate"],
            description: "New regulatory framework mandating CCUS initiatives for all upstream license applications in Nigeria.",
            pubDate: "2023-12-01",
            url: "https://nuprc.gov.ng/",
            source: "NUPRC Nigeria",
            analysis: {
                frameworkVersion: "5.0",
                incentive: { score: 55, label: "Credit Monetization", evidence: "Enables carbon credits as a revenue stream for oil operators.", citation: "Section 3" },
                statutory: { score: 80, label: "Upstream Mandate", evidence: "Mandatory CCUS plans for permits starting 2025.", citation: "Art 1.2" },
                liability: { score: 45, label: "EMP Baseline", evidence: "Utilizes Environmental Management Plans for stewardship oversight.", citation: "PIA 2021" },
                mrv: { score: 75, label: "Fugitive Monitoring", evidence: "Strict guidelines for methane and GHG reporting.", citation: "2022 Guidelines" },
                market: { score: 80, label: "International Trading", evidence: "Focuses on global carbon credit strategy for the oil sector.", citation: "Section 4" }
            }
        }
    },
    {
        id: "intl-gcca-net-zero-2050",
        zh: {
            title: "全球水泥与混凝土协会 (GCCA) 2050 净零路线图",
            country: "国际",
            scope: "International",
            legalWeight: "Guideline/Policy",
            year: 2021,
            status: "Active",
            category: "Strategic Guidance",
            tags: ["水泥行业", "行业自律", "10个示范厂目标"],
            description: "水泥行业最重要的全球性脱碳蓝图，将 CCUS 确定为消除过程排放的关键技术，承诺到 2030 年建立 10 个工业规模捕集厂。",
            pubDate: "2021-10-12",
            url: "https://gccassociation.org/concretefuture/net-zero-roadmap/",
            source: "GCCA",
            analysis: {
                frameworkVersion: "5.0",
                incentive: { score: 50, label: "Financial Advocacy", evidence: "Advocates for public-private financing mechanisms for cement CCUS.", citation: "Roadmap: Policy Frameworks" },
                statutory: { score: 40, label: "Industry Accord", evidence: "A voluntary but high-impact industry agreement signed by global majors.", citation: "Net Zero Commitment" },
                liability: { score: 35, label: "Safety Guidelines", evidence: "Emphasizes the need for safe storage but defers to national laws.", citation: "Operational Standards" },
                mrv: { score: 80, label: "CO2 Transparency", evidence: "Mandates reporting of carbon intensity and capture performance across members.", citation: "GCCA Sustainability Guidelines", auditNote: "Strong T-dimension for industry transparency." },
                market: { score: 85, label: "Green Concrete Demand", evidence: "Creating a global market for low-carbon and carbon-negative concrete.", citation: "Demand Side Pillar" }
            }
        },
        en: {
            title: "GCCA 2050 Net Zero Roadmap (CCUS Commitment)",
            country: "International",
            scope: "International",
            legalWeight: "Guideline/Policy",
            year: 2021,
            status: "Active",
            category: "Strategic Guidance",
            tags: ["Cement Sector", "Industry Roadmap", "10 Scale Plants"],
            description: "The global cement industry's strategic roadmap identifying CCUS as the key lever for process emission elimination.",
            pubDate: "2021-10-12",
            url: "https://gccassociation.org/concretefuture/net-zero-roadmap/",
            source: "GCCA",
            analysis: {
                frameworkVersion: "5.0",
                incentive: { score: 50, label: "Financing Support", evidence: "Industry-led advocacy for capital support.", citation: "Policy Frameworks" },
                statutory: { score: 40, label: "Voluntary Standard", evidence: "Global industry consensus signed by leading cement producers.", citation: "Roadmap Intro" },
                liability: { score: 35, label: "Compliance Based", evidence: "Refers to national frameworks for long-term stewardship.", citation: "Technical Annex" },
                mrv: { score: 80, label: "Performance Tracking", evidence: "Unified reporting metrics for carbon intensity and capture rates.", citation: "Sustainability Pillar" },
                market: { score: 85, label: "Green Procurement", evidence: "Drives demand for low-carbon cement products.", citation: "Market Access Section" }
            }
        }
    }
];

batch9.forEach(np => {
    if (!db.policies.some(p => p.id === np.id)) {
        db.policies.push(np);
        console.log(`[Inventory] Added Oceania/Africa/Sector benchmark: ${np.id}`);
    }
});

db.lastUpdated = new Date().toISOString();
fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
