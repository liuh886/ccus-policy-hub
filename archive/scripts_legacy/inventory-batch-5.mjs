import fs from 'fs';

const DB_PATH = 'src/data/policy_database.json';
const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));

const batch5 = [
    {
        id: "us-la-primacy-rules",
        zh: {
            title: "美国路易斯安那州 Class VI 封存管辖规则 (LAC 43:XVII)",
            country: "美国",
            scope: "Sub-national",
            region: "Louisiana",
            legalWeight: "Administrative Regulation",
            year: 2023,
            status: "Active",
            category: "Regulatory Framework",
            tags: ["路州Primacy", "封存许可", "财务担保"],
            description: "路易斯安那州获得的 EPA 授权规则，允许该州自然资源部 (DNR) 独立签发 Class VI 注入井许可，包含严格的财务担保和监测要求。",
            pubDate: "2023-12-28",
            url: "https://www.dnr.louisiana.gov/assets/OC/uic_rule_comp/29N6FinalRule.pdf",
            source: "Louisiana DNR",
            analysis: {
                frameworkVersion: "5.0",
                incentive: { score: 40, label: "Permit Acceleration", evidence: "Reduces federal bureaucratic overhead, providing faster pathway for Gulf Coast hubs.", citation: "LAC 43:XVII.3601" },
                statutory: { score: 95, label: "State Primacy Authority", evidence: "Louisiana is one of the few states with full delegated authority for Class VI wells.", citation: "LAC 43:XVII Subpart 6", auditNote: "High S-score due to direct jurisdictional power." },
                liability: { score: 85, label: "State Trust Fund", evidence: "Establishes the Carbon Dioxide Geologic Storage Trust Fund for long-term monitoring.", citation: "LAC 43:XVII.3609" },
                mrv: { score: 90, label: "Stringent Monitoring", evidence: "Requires site-specific seismic and pressure monitoring beyond federal minimums.", citation: "LAC 43:XVII.3615" },
                market: { score: 60, label: "Hub Enablement", evidence: "Designed to support the 'Direct Air Capture' and 'Blue Hydrogen' hubs in the state.", citation: "Chapter 36 Policy Goals" }
            }
        },
        en: {
            title: "Louisiana Class VI Well Primacy Rules (LAC 43:XVII)",
            country: "United States",
            scope: "Sub-national",
            region: "Louisiana",
            legalWeight: "Administrative Regulation",
            year: 2023,
            status: "Active",
            category: "Regulatory Framework",
            tags: ["Louisiana Primacy", "Storage Permit", "DNR"],
            description: "The regulatory framework governing Louisiana's independent authority over Class VI CO2 injection wells.",
            pubDate: "2023-12-28",
            url: "https://www.dnr.louisiana.gov/assets/OC/uic_rule_comp/29N6FinalRule.pdf",
            source: "Louisiana DNR",
            analysis: {
                frameworkVersion: "5.0",
                incentive: { score: 40, label: "Permit Acceleration", evidence: "Localized permitting streamlines hub development.", citation: "LAC 43:XVII.3601" },
                statutory: { score: 95, label: "State Authority", evidence: "Delegated primacy from US EPA.", citation: "40 CFR Part 147 Subpart T" },
                liability: { score: 85, label: "Long-term Fund", evidence: "Operator-funded state trust for post-injection stewardship.", citation: "LAC 43:XVII.3609" },
                mrv: { score: 90, label: "Advanced Monitoring", evidence: "Requires high-frequency plume tracking and seismic verification.", citation: "LAC 43:XVII.3615" },
                market: { score: 60, label: "Gulf Coast Integration", evidence: "Positions Louisiana as a premier CCS destination in the US.", citation: "Strategic Plan" }
            }
        }
    },
    {
        id: "cn-gd-carbon-inclusive",
        zh: {
            title: "广东省碳普惠交易管理办法 (2024 修订)",
            country: "中国",
            scope: "Sub-national",
            region: "广东省",
            legalWeight: "Administrative Regulation",
            year: 2024,
            status: "Active",
            category: "Market Mechanism",
            tags: ["碳普惠", "地方信用", "方法学"],
            description: "广东省发布的创新性减排激励机制，允许将小微项目和特定工业 CCUS 减排量转化为可交易的“碳普惠核证减排量”(PHU)。",
            pubDate: "2024-01-01",
            url: "https://gdee.gd.gov.cn/zwgk/content/post_4281415.html",
            source: "广东省生态环境厅",
            analysis: {
                frameworkVersion: "5.0",
                incentive: { score: 70, label: "PHU Monetization", evidence: "Provides a secondary income stream for CCUS projects not covered by national ETS.", citation: "第四章：核证减排量管理" },
                statutory: { score: 75, label: "Provincial Mandate", evidence: "Backed by provincial government order with clear administrative rules.", citation: "第二条：适用范围", auditNote: "Strong local governance benchmark." },
                liability: { score: 40, label: "Monitoring Period", evidence: "Focuses on credit validity period; long-term geological liability is handled via national standards.", citation: "第十八条" },
                mrv: { score: 85, label: "Standardized Methodology", evidence: "Requires project-specific methodologies filed with the provincial department.", citation: "第三章：方法学管理" },
                market: { score: 80, label: "Local ETS Link", evidence: "PHU credits can be used for compliance in the Guangdong Pilot ETS.", citation: "第三十条" }
            }
        },
        en: {
            title: "Guangdong Carbon Inclusive Trading Management Measures (2024)",
            country: "China",
            scope: "Sub-national",
            region: "Guangdong",
            legalWeight: "Administrative Regulation",
            year: 2024,
            status: "Active",
            category: "Market Mechanism",
            tags: ["Carbon PHU", "Local Offset", "Incentive"],
            description: "A specialized incentive mechanism in Guangdong enabling CCUS and micro-projects to generate tradable local carbon credits.",
            pubDate: "2024-01-01",
            url: "https://gdee.gd.gov.cn/zwgk/content/post_4281415.html",
            source: "Guangdong EE Department",
            analysis: {
                frameworkVersion: "5.0",
                incentive: { score: 70, label: "Credit Revenue", evidence: "Enables monetization of avoided emissions via local PHU credits.", citation: "Chapter 4" },
                statutory: { score: 75, label: "Provincial Authority", evidence: "Solid legal standing within the provincial pilot framework.", citation: "Article 2" },
                liability: { score: 40, label: "Standard Compliance", evidence: "Standard credit-based liability rules.", citation: "Article 18" },
                mrv: { score: 85, label: "Rigorous Verification", evidence: "Third-party verification mandatory for all PHU issuances.", citation: "Chapter 3" },
                market: { score: 80, label: "Pilot ETS Link", evidence: "Integrated with Guangdong's provincial carbon market.", citation: "Article 30" }
            }
        }
    },
    {
        id: "ca-ab-sequestration-tenure",
        zh: {
            title: "加拿大阿尔伯塔省碳封存租让条例",
            country: "加拿大",
            scope: "Sub-national",
            region: "Alberta",
            legalWeight: "Administrative Regulation",
            year: 2011,
            status: "Active",
            category: "Regulatory Framework",
            tags: ["孔隙权租让", "AB省", "枢纽模型"],
            description: "阿尔伯塔省关于地下孔隙空间所有权和封存租赁的核心条例，确立了“封存枢纽” (Sequestration Hubs) 的竞争性选址和管理机制。",
            pubDate: "2011-04-27",
            url: "https://kings-printer.alberta.ca/1266.cfm?page=2011_068.cfm&leg_type=Regs&isbncln=9780779758418",
            source: "Alberta King's Printer",
            analysis: {
                frameworkVersion: "5.0",
                incentive: { score: 50, label: "Lease Certainty", evidence: "Grants 15-year renewable leases specifically for carbon sequestration.", citation: "Section 10: Sequestration Leases" },
                statutory: { score: 100, label: "Pore Space Sovereignty", evidence: "Alberta's Mines and Minerals Act explicitly vests all pore space in the Crown.", citation: "Section 15.1 of MMA", auditNote: "Global benchmark for S dimension (Pore Space Rights)." },
                liability: { score: 95, label: "Closure Certificate Transfer", evidence: "The provincial government assumes long-term liability once a closure certificate is issued.", citation: "Part 4: Site Closure", auditNote: "Global gold standard for R dimension." },
                mrv: { score: 85, label: "Monitoring Mandates", evidence: "Requires detailed Monitoring, Measurement and Verification (MMV) plans for each hub.", citation: "Section 14" },
                market: { score: 75, label: "Hub Leasing System", evidence: "Uses a competitive tenure process to enable multi-user hub infrastructure.", citation: "Part 2: Evaluation of Proposals" }
            }
        },
        en: {
            title: "Alberta Carbon Sequestration Tenure Regulation",
            country: "Canada",
            scope: "Sub-national",
            region: "Alberta",
            legalWeight: "Administrative Regulation",
            year: 2011,
            status: "Active",
            category: "Regulatory Framework",
            tags: ["Pore Space", "Alberta Hubs", "MMA"],
            description: "Regulates the rights to the subsurface pore space for CO2 sequestration in Alberta.",
            pubDate: "2011-04-27",
            url: "https://kings-printer.alberta.ca/1266.cfm?page=2011_068.cfm&leg_type=Regs&isbncln=9780779758418",
            source: "Government of Alberta",
            analysis: {
                frameworkVersion: "5.0",
                incentive: { score: 50, label: "Tenure Stability", evidence: "Provides long-term legal rights to sequester CO2.", citation: "Section 10" },
                statutory: { score: 100, label: "Crown Ownership", evidence: "Crown owns all pore space under the Mines and Minerals Act.", citation: "MMA Section 15.1" },
                liability: { score: 95, label: "State Transfer", evidence: "Province accepts liability post-closure certificate.", citation: "Part 4" },
                mrv: { score: 85, label: "MMV Requirements", evidence: "Mandatory MMV plans for hub operators.", citation: "Section 14" },
                market: { score: 75, label: "Hub Tendering", evidence: "Competitive process for hub selection and development.", citation: "Part 2" }
            }
        }
    }
];

batch5.forEach(np => {
    if (!db.policies.some(p => p.id === np.id)) {
        db.policies.push(np);
        console.log(`[Inventory] Added Sub-national benchmark: ${np.id}`);
    }
});

db.lastUpdated = new Date().toISOString();
fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
