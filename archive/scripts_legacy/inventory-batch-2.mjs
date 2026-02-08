import fs from 'fs';

const DB_PATH = 'src/data/policy_database.json';
const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));

const batch2 = [
    {
        id: "us-cifia-lpo",
        zh: {
            title: "美国二氧化碳运输基础设施融资与创新法 (CIFIA)",
            country: "美国",
            scope: "National",
            legalWeight: "Primary Legislation",
            year: 2021,
            status: "Active",
            category: "Economic Incentive",
            tags: ["LPO贷款", "基础设施", "运输枢纽"],
            description: "通过 LPO 贷款项目办公室提供低息贷款和贷款担保，专门支持大规模二氧化碳共用运输基础设施建设。",
            pubDate: "2021-11-15",
            url: "https://www.energy.gov/lpo/carbon-dioxide-transportation-infrastructure-finance-and-innovation-act-cifia",
            source: "US DOE",
            analysis: {
                frameworkVersion: "5.0",
                incentive: { score: 90, label: "Low-interest Loans (CIFIA)", evidence: "Provides loans up to 80% of project costs with deferred repayment options.", citation: "IIJA Section 40304" },
                statutory: { score: 75, label: "Common Carrier Rules", evidence: "Prioritizes common carrier infrastructure to prevent regional monopolies.", citation: "49 U.S.C. Chapter 601" },
                liability: { score: 60, label: "Standard Infrastructure Liability", evidence: "Standard pipeline liability rules apply; focuses on economic viability.", citation: "PHMSA Regulations" },
                mrv: { score: 70, label: "Usage-linked Reporting", evidence: "Mandatory reporting of throughput to trigger loan compliance.", citation: "LPO Lending Terms" },
                market: { score: 85, label: "Infrastructure De-risking", evidence: "Derisks the transport bottleneck, enabling a competitive capture market.", citation: "CIFIA Program Guidance" }
            }
        },
        en: {
            title: "Carbon Dioxide Transportation Infrastructure Finance and Innovation Act (CIFIA)",
            country: "United States",
            scope: "National",
            legalWeight: "Primary Legislation",
            year: 2021,
            status: "Active",
            category: "Economic Incentive",
            tags: ["LPO Loans", "Infrastructure", "Common Carrier"],
            description: "A major federal loan program managed by the DOE LPO to scale up CO2 transport networks.",
            pubDate: "2021-11-15",
            url: "https://www.energy.gov/lpo/carbon-dioxide-transportation-infrastructure-finance-and-innovation-act-cifia",
            source: "US DOE",
            analysis: {
                frameworkVersion: "5.0",
                incentive: { score: 90, label: "Low-interest Loans (CIFIA)", evidence: "Finances up to 80% of total project costs.", citation: "IIJA Section 40304" },
                statutory: { score: 75, label: "Common Carrier Rules", evidence: "Encourages open-access transport infrastructure.", citation: "49 U.S.C. Chapter 601" },
                liability: { score: 60, label: "Standard Infrastructure Liability", evidence: "Standard industrial transport liability rules.", citation: "PHMSA" },
                mrv: { score: 70, label: "Operational Reporting", evidence: "Reporting required for loan covenants.", citation: "LPO Terms" },
                market: { score: 85, label: "Infrastructure De-risking", evidence: "Enables multi-user hubs by financing backbone infrastructure.", citation: "CIFIA Guidance" }
            }
        }
    },
    {
        id: "us-epa-class-vi-primacy",
        zh: {
            title: "美国 EPA Class VI 封存管辖权规则 (40 CFR 145)",
            country: "美国",
            scope: "National",
            legalWeight: "Administrative Regulation",
            year: 2010,
            status: "Active",
            category: "Regulatory Framework",
            tags: ["封存管辖权", "Primacy", "州级治理"],
            description: "规定了各州如何申请并获得独立签发 Class VI 封存许可的权利（Primacy），是美国 CCUS 治理去中心化的核心依据。",
            pubDate: "2010-12-10",
            url: "https://www.epa.gov/uic/primary-enforcement-authority-uic-program",
            source: "US EPA",
            analysis: {
                frameworkVersion: "5.0",
                incentive: { score: 30, label: "Regulatory Streamlining", evidence: "State primacy significantly reduces permitting lead times from years to months.", citation: "40 CFR Part 145" },
                statutory: { score: 95, label: "Authority Delegation", evidence: "Allows states to enforce UIC rules if they are at least as stringent as federal standards.", citation: "SDWA Section 1422" },
                liability: { score: 80, label: "State Stewardship", evidence: "States often couple primacy with state-funded long-term monitoring trust funds (e.g., ND, LA).", citation: "ND Century Code 38-22" },
                mrv: { score: 90, label: "Stringency Parity", evidence: "Mandates that state MRV rules must meet or exceed federal Subpart RR / Class VI standards.", citation: "40 CFR § 145.11" },
                market: { score: 50, label: "Permit Certainty", evidence: "Reduces investor uncertainty by localizing the approval process.", citation: "EPA Primacy Guidance" }
            }
        },
        en: {
            title: "EPA Class VI Well Primacy Rules (40 CFR Part 145)",
            country: "United States",
            scope: "National",
            legalWeight: "Administrative Regulation",
            year: 2010,
            status: "Active",
            category: "Regulatory Framework",
            tags: ["Primacy", "Jurisdiction", "Permitting"],
            description: "The legal pathway for states to seek primary enforcement authority over CO2 injection wells.",
            pubDate: "2010-12-10",
            url: "https://www.epa.gov/uic/primary-enforcement-authority-uic-program",
            source: "US EPA",
            analysis: {
                frameworkVersion: "5.0",
                incentive: { score: 30, label: "Permit Speed", evidence: "Localization of permitting authority accelerates deployment.", citation: "40 CFR Part 145" },
                statutory: { score: 95, label: "Authority Delegation", evidence: "Delegates federal authority to states meeting stringency requirements.", citation: "SDWA Section 1422" },
                liability: { score: 80, label: "State Stewardship", evidence: "States gain power to manage long-term liability funds.", citation: "40 CFR Part 145 requirements" },
                mrv: { score: 90, label: "Federal Floor", evidence: "State programs must meet federal monitoring stringency.", citation: "40 CFR § 145.11" },
                market: { score: 50, label: "Local Certainty", evidence: "Enables state-led hub strategies.", citation: "EPA Guidance" }
            }
        }
    },
    {
        id: "ca-sk-spii",
        zh: {
            title: "加拿大萨斯喀彻温省石油创新激励 (SPII)",
            country: "加拿大",
            scope: "Sub-national",
            region: "Saskatchewan",
            legalWeight: "Administrative Regulation",
            year: 2019,
            status: "Active",
            category: "Economic Incentive",
            tags: ["萨省", "版税抵免", "技术创新"],
            description: "为 CCUS 创新商业化项目提供相当于合格成本 25% 的可转让版税/生产税抵免。",
            pubDate: "2019-04-01",
            url: "https://www.saskatchewan.ca/business/agriculture-natural-resources-and-industry/oil-and-gas/oil-and-gas-incentives-royalties-and-taxes/saskatchewan-petroleum-innovation-incentive",
            source: "Government of Saskatchewan",
            analysis: {
                frameworkVersion: "5.0",
                incentive: { score: 85, label: "25% Transferable Credit", evidence: "Offers a 25% credit on eligible project costs, including CCUS.", citation: "The Financial Administration Act, SK" },
                statutory: { score: 70, label: "Provincial Authority", evidence: "Managed under provincial petroleum and natural gas regulations.", citation: "Petroleum and Natural Gas Regulations, 1969" },
                liability: { score: 75, label: "Stewardship Framework", evidence: "Saskatchewan was a pioneer in long-term liability via the Aquistore project framework.", citation: "The Pipelines Act, SK" },
                mrv: { score: 80, label: "Reporting Standards", evidence: "Mandatory reporting of storage performance to claim Innovation Incentive.", citation: "SPII Program Guidelines" },
                market: { score: 70, label: "Royalty Integration", evidence: "Integrates CCUS into the core fiscal logic of the provincial oil industry.", citation: "SK Royalty Framework" }
            }
        },
        en: {
            title: "Saskatchewan Petroleum Innovation Incentive (SPII)",
            country: "Canada",
            scope: "Sub-national",
            region: "Saskatchewan",
            legalWeight: "Administrative Regulation",
            year: 2019,
            status: "Active",
            category: "Economic Incentive",
            tags: ["Saskatchewan", "Royalty Credit", "Innovation"],
            description: "A transferable royalty credit equal to 25% of eligible CCUS project costs.",
            pubDate: "2019-04-01",
            url: "https://www.saskatchewan.ca/business/agriculture-natural-resources-and-industry/oil-and-gas/oil-and-gas-incentives-royalties-and-taxes/saskatchewan-petroleum-innovation-incentive",
            source: "Government of Saskatchewan",
            analysis: {
                frameworkVersion: "5.0",
                incentive: { score: 85, label: "25% Credit", evidence: "Direct 25% transferable credit on capital expenditures.", citation: "Financial Admin Act" },
                statutory: { score: 70, label: "Provincial Authority", evidence: "State-level regulatory power over petroleum resources.", citation: "PNG Regulations" },
                liability: { score: 75, label: "Provincial Stewardship", evidence: "Defined provincial oversight for long-term storage.", citation: "SK Pipelines Act" },
                mrv: { score: 80, label: "Rigorous Reporting", evidence: "Required reporting for incentive validation.", citation: "SPII Guidelines" },
                market: { score: 70, label: "Fiscal Synergy", evidence: "Creates strong synergy with existing oil and gas royalty systems.", citation: "SK Framework" }
            }
        }
    }
];

batch2.forEach(np => {
    if (!db.policies.some(p => p.id === np.id)) {
        db.policies.push(np);
        console.log(`[Inventory] Added benchmark: ${np.id}`);
    }
});

fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');