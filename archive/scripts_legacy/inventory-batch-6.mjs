import fs from 'fs';

const DB_PATH = 'src/data/policy_database.json';
const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));

const batch6 = [
    {
        id: "eu-ets-mrr-2018",
        zh: {
            title: "欧盟 ETS 监测与报告条例 (MRR - 2018/2066)",
            country: "欧盟",
            scope: "National",
            legalWeight: "Administrative Regulation",
            year: 2018,
            status: "Active",
            category: "Technical Standard",
            tags: ["MRV基础", "碳核算", "永久封存"],
            description: "欧盟排放交易体系的核心技术规范，详细规定了如何监测和报告捕集、运输及封存的二氧化碳，是 T 维度的全球基石。",
            pubDate: "2018-12-19",
            url: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32018R2066",
            source: "European Commission",
            analysis: {
                frameworkVersion: "5.0",
                incentive: { score: 30, label: "Compliance Asset", evidence: "Avoidance of ETS surrender costs by proving permanent storage.", citation: "Article 49" },
                statutory: { score: 85, label: "Technical Mandate", evidence: "Compulsory for all ETS installations involved in CCS activities.", citation: "Annex IV, Section 21" },
                liability: { score: 60, label: "Operational Integrity", evidence: "Mandates reporting of any leakage as immediate emissions to be surrendered.", citation: "Article 49(1)" },
                mrv: { score: 100, label: "Global Technical Benchmark", evidence: "Sets the world's most rigorous continuous monitoring (CEMS) and verification rules for CCS.", citation: "Guidance Document No. 7", auditNote: "The ultimate reference for T-dimension (MRV Rigor)." },
                market: { score: 70, label: "Accounting Backbone", evidence: "Provides the accounting infrastructure for the world's largest carbon market.", citation: "Article 12" }
            }
        },
        en: {
            title: "EU ETS Monitoring and Reporting Regulation (MRR - 2018/2066)",
            country: "European Union",
            scope: "National",
            legalWeight: "Administrative Regulation",
            year: 2018,
            status: "Active",
            category: "Technical Standard",
            tags: ["MRV Foundation", "Carbon Accounting", "CEMS"],
            description: "The technical cornerstone of the EU ETS, defining the rules for monitoring and reporting captured, transported, and stored CO2.",
            pubDate: "2018-12-19",
            url: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32018R2066",
            source: "European Commission",
            analysis: {
                frameworkVersion: "5.0",
                incentive: { score: 30, label: "Compliance Asset", evidence: "Allows subtraction of stored CO2 from total taxable emissions.", citation: "Article 49" },
                statutory: { score: 85, label: "Binding Technical Rules", evidence: "Directly applicable in all Member States for industrial installations.", citation: "Annex IV" },
                liability: { score: 60, label: "Performance Monitoring", evidence: "Leaks must be accounted for as emissions.", citation: "Article 49" },
                mrv: { score: 100, label: "Maximum Rigor", evidence: "Requires high-precision mass balance and verified monitoring systems.", citation: "Guidance Document No. 7" },
                market: { score: 70, label: "Market Integrity", evidence: "Ensures one ton captured equals one ton of credit.", citation: "General Principles" }
            }
        }
    },
    {
        id: "cn-miit-industrial-plan-2022",
        zh: {
            title: "工业领域碳达峰实施方案 (工信部 2022)",
            country: "中国",
            scope: "National",
            legalWeight: "Departmental Rules",
            year: 2022,
            status: "Active",
            category: "Strategic Guidance",
            tags: ["工业脱碳", "规模化应用", "钢铁/水泥"],
            description: "中国工信部发布的工业转型蓝图，明确提出加强 CCUS 关键技术研发和规模化示范，重塑钢铁、建材等高耗能行业流程。",
            pubDate: "2022-08-01",
            url: "https://www.miit.gov.cn/jgsj/jns/wjfb/art/2022/art_0e86e068060446008800ba8800088000.html",
            source: "工信部",
            analysis: {
                frameworkVersion: "5.0",
                incentive: { score: 65, label: "Grant-heavy Support", evidence: "Encourages financial institutions to support industrial CCUS demonstration via green finance.", citation: "Section 5: Policy Support" },
                statutory: { score: 75, label: "Industrial Mandates", evidence: "Sets specific efficiency and emission reduction targets for key sectors (Steel, Cement).", citation: "Section 3: Key Actions" },
                liability: { score: 40, label: "Nascent Requirements", evidence: "Focuses on deployment and energy intensity; long-term site liability is secondary.", citation: "Annex: Tech Roadmap" },
                mrv: { score: 75, label: "Standardized Reporting", evidence: "Mandates the establishment of carbon emission management systems in key enterprises.", citation: "Section 4: Capacity Building" },
                market: { score: 60, label: "Supply Chain Pull", evidence: "Aims to create low-carbon industrial supply chains, providing a market pull for CCUS products.", citation: "Section 3.2" }
            }
        },
        en: {
            title: "Implementation Plan for Carbon Peaking in the Industrial Sector (MIIT 2022)",
            country: "China",
            scope: "National",
            legalWeight: "Departmental Rules",
            year: 2022,
            status: "Active",
            category: "Strategic Guidance",
            tags: ["Industrial Decarb", "Steel/Cement", "Targets"],
            description: "The strategic blueprint for China's industrial decarbonization, emphasizing CCUS as a core 're-engineering' technology.",
            pubDate: "2022-08-01",
            url: "https://www.miit.gov.cn/jgsj/jns/wjfb/art/2022/art_0e86e068060446008800ba8800088000.html",
            source: "MIIT China",
            analysis: {
                frameworkVersion: "5.0",
                incentive: { score: 65, label: "Deployment Funding", evidence: "Directs fiscal and financial support to large-scale demonstrations.", citation: "Section 5" },
                statutory: { score: 75, label: "Policy Directives", evidence: "Integrates CCUS into sectoral carbon peaking pathways.", citation: "Section 3" },
                liability: { score: 40, label: "Process Focus", evidence: "Emphasis on capture efficiency over long-term storage stewardship.", citation: "Technical Roadmap" },
                mrv: { score: 75, label: "Management Systems", evidence: "Requires mandatory carbon footprinting for industrial leaders.", citation: "Section 4" },
                market: { score: 60, label: "Strategic Demand", evidence: "Creates demand for 'Green Steel' and 'Green Cement' via CCUS.", citation: "Section 3.2" }
            }
        }
    },
    {
        id: "ca-sk-ccs-directives",
        zh: {
            title: "萨斯喀彻温省 CCS 指令与许可框架 (基于 Boundary Dam)",
            country: "加拿大",
            scope: "Sub-national",
            region: "Saskatchewan",
            legalWeight: "Administrative Regulation",
            year: 2015,
            status: "Active",
            category: "Regulatory Framework",
            tags: ["运营许可", "EOR封存", "萨省"],
            description: "萨省能源与资源部发布的 CCS 项目专项监管指令，基于 Boundary Dam 项目实践，确立了项目、设施、井和管道的独立许可机制。",
            pubDate: "2015-07-01",
            url: "https://www.saskatchewan.ca/business/agriculture-natural-resources-and-industry/oil-and-gas/",
            source: "Saskatchewan ER",
            analysis: {
                frameworkVersion: "5.0",
                incentive: { score: 40, label: "Operational Stability", evidence: "Provides a predictable regulatory path for long-term project licensing.", citation: "Ministerial Orders via Directives" },
                statutory: { score: 90, label: "Mature Permitting", evidence: "Defines distinct licenses for projects, wells, and pipelines - the world's first operational baseline.", citation: "Oil and Gas Conservation Act", auditNote: "The premier sub-national operational anchor." },
                liability: { score: 85, label: "Stewardship Legacy", evidence: "First framework to manage large-scale CO2-EOR and saline storage liability synergy.", citation: "Pipelines Act Regulations" },
                mrv: { score: 85, label: "Proven Field Monitoring", evidence: "Requires the MMV (Monitoring, Measurement and Verification) standards used at Boundary Dam.", citation: "Directive PNG001" },
                market: { score: 70, label: "EOR Market Link", evidence: "Strongly integrated with the provincial oil production and royalty market.", citation: "Royalty Credits Section" }
            }
        },
        en: {
            title: "Saskatchewan CCS Licensing & Directive Framework",
            country: "Canada",
            scope: "Sub-national",
            region: "Saskatchewan",
            legalWeight: "Administrative Regulation",
            year: 2015,
            status: "Active",
            category: "Regulatory Framework",
            tags: ["Operating License", "EOR", "Boundary Dam"],
            description: "The regulatory foundation for Saskatchewan's world-leading CCS projects, defining multi-tier licensing for full-chain operations.",
            pubDate: "2015-07-01",
            url: "https://www.saskatchewan.ca/business/agriculture-natural-resources-and-industry/oil-and-gas/",
            source: "Gov of Saskatchewan",
            analysis: {
                frameworkVersion: "5.0",
                incentive: { score: 40, label: "Regulatory Clarity", evidence: "Reduces administrative risk for major coal-to-CCS retrofits.", citation: "Ministerial Orders" },
                statutory: { score: 90, label: "Operational Authority", evidence: "Comprehensive licensing framework for capture, transport, and injection.", citation: "Oil and Gas Conservation Act" },
                liability: { score: 85, label: "Long-term Oversight", evidence: "Established state-managed liability for the world's first large-scale project.", citation: "Pipelines Act" },
                mrv: { score: 85, label: "Field-tested MMV", evidence: "Mandates rigorous monitoring standards developed via the Aquistore project.", citation: "Directive PNG001" },
                market: { score: 70, label: "Industrial Integration", evidence: "Critical for maintaining coal-fired power assets in a carbon-constrained market.", citation: "Regulatory Impact Statement" }
            }
        }
    }
];

batch6.forEach(np => {
    if (!db.policies.some(p => p.id === np.id)) {
        db.policies.push(np);
        console.log(`[Inventory] Added Tech/Industrial benchmark: ${np.id}`);
    }
});

db.lastUpdated = new Date().toISOString();
fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
