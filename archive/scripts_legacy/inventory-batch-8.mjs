import fs from 'fs';

const DB_PATH = 'src/data/policy_database.json';
const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));

const batch8 = [
    {
        id: "cn-sd-eco-plan-14fym",
        zh: {
            title: "山东省生态环境保护“十四五”规划 (CCUS 示范目标)",
            country: "中国",
            scope: "Sub-national",
            region: "山东省",
            legalWeight: "Administrative Regulation",
            year: 2022,
            status: "Active",
            category: "Strategic Guidance",
            tags: ["山东示范", "十四五规划", "工业集群"],
            description: "山东省“十四五”期间的环境保护纲领性文件，明确提出在煤电、钢铁等行业建设 6-8 个 CCUS 全流程示范项目。",
            pubDate: "2022-12-29",
            url: "http://www.shandong.gov.cn/art/2022/12/29/art_2259_4281415.html",
            source: "山东省人民政府",
            analysis: {
                frameworkVersion: "5.0",
                incentive: { score: 60, label: "Provincial Demo Funding", evidence: "Allocates provincial special funds for early-stage CCUS demonstration.", citation: "第三章：主要目标与任务" },
                statutory: { score: 70, label: "Provincial Planning", evidence: "Legally integrated into the province's 14th Five-Year mandatory plan.", citation: "第五章：绿色低碳发展" },
                liability: { score: 40, label: "National Alignment", evidence: "Refers to national safety and monitoring standards for storage sites.", citation: "附件：重点项目清单" },
                mrv: { score: 75, label: "Industry Standard", evidence: "Mandates standardized measurement for provincial-level carbon neutral pilots.", citation: "第四章：环境监测体系", auditNote: "A benchmark for provincial industrial clustering." },
                market: { score: 55, label: "Symbiotic Hubs", evidence: "Promotes the shared use of CO2 among chemical and power clusters.", citation: "Section 5.2" }
            }
        },
        en: {
            title: "Shandong 14th FYP Special Plan for Eco-Environmental Protection (CCUS Targets)",
            country: "China",
            scope: "Sub-national",
            region: "Shandong",
            legalWeight: "Administrative Regulation",
            year: 2022,
            status: "Active",
            category: "Strategic Guidance",
            tags: ["Shandong Demo", "14th FYP", "Industrial Decarb"],
            description: "A mandatory provincial roadmap setting targets for 6-8 full-chain CCUS demonstration projects across high-emission sectors.",
            pubDate: "2022-12-29",
            url: "http://www.shandong.gov.cn/art/2022/12/29/art_2259_4281415.html",
            source: "Shandong Provincial People's Government",
            analysis: {
                frameworkVersion: "5.0",
                incentive: { score: 60, label: "Demo Support", evidence: "Directs provincial funding toward multi-sector CCUS pilots.", citation: "Chapter 3" },
                statutory: { score: 70, label: "Mandatory Planning", evidence: "Integrated into the provincial socio-economic development law.", citation: "Chapter 5" },
                liability: { score: 40, label: "Under National Rules", evidence: "Follows national framework for underground storage safety.", citation: "Annex" },
                mrv: { score: 75, label: "Verified Pilots", evidence: "Requires mandatory reporting for provincial-level demonstration hubs.", citation: "Chapter 4" },
                market: { score: 55, label: "Cluster Synergy", evidence: "Encourages the creation of zero-carbon industrial parks via shared CCS.", citation: "Section 5.2" }
            }
        }
    },
    {
        id: "hr-hydrocarbon-act-ccs",
        zh: {
            title: "克罗地亚油气勘探与开采法案 (CCS 条款)",
            country: "克罗地亚",
            scope: "National",
            legalWeight: "Primary Legislation",
            year: 2018,
            status: "Active",
            category: "Regulatory Framework",
            tags: ["油气法转化", "地质封存", "AZU监管"],
            description: "克罗地亚将欧盟 CCS 指令转化入其核心油气法律体系，规定了二氧化碳永久封存的特许经营和收费机制。",
            pubDate: "2018-05-01",
            url: "https://www.azu.hr/en/legislation/act-on-the-exploration-and-exploitation-of-hydrocarbons/",
            source: "Croatian Hydrocarbon Agency (AZU)",
            analysis: {
                frameworkVersion: "5.0",
                incentive: { score: 45, label: "EU Access", evidence: "Enables projects to apply for Innovation Fund and PCI status.", citation: "Section on Fees for Storage" },
                statutory: { score: 85, label: "Direct CCS Mandate", evidence: "Mature legal text specifically addressing CO2 as a permanent storage asset.", citation: "NN 52/18, Article 12", auditNote: "A leading model for Central and Eastern Europe." },
                liability: { score: 85, label: "20-Year Transfer", evidence: "Strict adherence to the 20-year post-closure transfer to the state.", citation: "Chapter on Permanence" },
                mrv: { score: 80, label: "EU Compliant", evidence: "Matches the monitoring standards of the EU CCS Directive.", citation: "NN 52/19" },
                market: { score: 65, label: "Hydrocarbon Integration", evidence: "Links CCS activities directly to existing offshore infrastructure reuse.", citation: "Article 30" }
            }
        },
        en: {
            title: "Croatia Act on the Exploration and Exploitation of Hydrocarbons (CCS Provisions)",
            country: "Croatia",
            scope: "National",
            legalWeight: "Primary Legislation",
            year: 2018,
            status: "Active",
            category: "Regulatory Framework",
            tags: ["Croatia CCS", "Hydrocarbon Act", "AZU"],
            description: "National legislation transposing EU CCS standards into the hydrocarbon exploration framework, managed by the state agency AZU.",
            pubDate: "2018-05-01",
            url: "https://www.azu.hr/en/legislation/act-on-the-exploration-and-exploitation-of-hydrocarbons/",
            source: "AZU Croatia",
            analysis: {
                frameworkVersion: "5.0",
                incentive: { score: 45, label: "Storage Fees", evidence: "Regulates fees and fiscal terms for carbon storage activities.", citation: "NN 52/18" },
                statutory: { score: 85, label: "Integrated Law", evidence: "A primary law providing full legal standing for CO2 sequestration.", citation: "Article 12" },
                liability: { score: 85, label: "State Transfer", evidence: "20-year liability window post-site-care.", citation: "NN 52/19 Amendment" },
                mrv: { score: 80, label: "Directive Aligned", evidence: "Standardized monitoring protocols under AZU oversight.", citation: "NN 25/20" },
                market: { score: 65, label: "Infrastructure Reuse", evidence: "Enables repurposing of depleted offshore fields for carbon storage.", citation: "Section on Abandonment" }
            }
        }
    },
    {
        id: "ro-law-114-2013-ccs",
        zh: {
            title: "罗马尼亚二氧化碳地质封存法 (No. 114/2013)",
            country: "罗马尼亚",
            scope: "National",
            legalWeight: "Primary Legislation",
            year: 2013,
            status: "Active",
            category: "Regulatory Framework",
            tags: ["欧盟转化", "ANRMPSG监管", "东欧基石"],
            description: "罗马尼亚正式将欧盟 2009/31/EC 指令转化为国家法律的核心法案，确立了 ANRMPSG 作为封存许可的主管部门。",
            pubDate: "2013-04-15",
            url: "https://namr.ro/legislatie/",
            source: "罗马尼亚矿产资源管理局",
            analysis: {
                frameworkVersion: "5.0",
                incentive: { score: 40, label: "Regulatory Pathway", evidence: "Provides the legal basis for applying for national and EU carbon grants.", citation: "Art. 10" },
                statutory: { score: 80, label: "Established Regulator", evidence: "Designates a competent authority specifically for CO2 geological storage.", citation: "Emergency Ordinance 64/2011", auditNote: "Foundation for Romania's 9Mtpa target under NZIA." },
                liability: { score: 80, label: "Directive Compliant", evidence: "Establishes long-term liability transfer mechanisms after 20 years of stable monitoring.", citation: "Section IV" },
                mrv: { score: 75, label: "Standardized", evidence: "Follows EU MRR baseline for geological storage sites.", citation: "Technical Annex" },
                market: { score: 60, label: "Gas Market Synergy", evidence: "Leverages Romania's status as a major gas producer to create storage hubs.", citation: "Art. 5" }
            }
        },
        en: {
            title: "Romania Law No. 114/2013 on Geological Storage of CO2",
            country: "Romania",
            scope: "National",
            legalWeight: "Primary Legislation",
            year: 2013,
            status: "Active",
            category: "Regulatory Framework",
            tags: ["Romania CCS", "EU Transposition", "ANRMPSG"],
            description: "The primary legal framework for CO2 storage in Romania, transposing the EU CCS Directive into national law.",
            pubDate: "2013-04-15",
            url: "https://namr.ro/legislatie/",
            source: "ANRMPSG Romania",
            analysis: {
                frameworkVersion: "5.0",
                incentive: { score: 40, label: "Infrastructure Enabling", evidence: "Facilitates access to EU-level funding for East European hubs.", citation: "Art. 10" },
                statutory: { score: 80, label: "Legal Standing", evidence: "Provides full legal recognition of CO2 storage as a mining-related activity.", citation: "Law 114/2013" },
                liability: { score: 80, label: "Liability Transfer", evidence: "State assumes stewardship post-closure certificate issuance.", citation: "Section IV" },
                mrv: { score: 75, label: "EU Standards", evidence: "Mandatory monitoring plans approved by the National Authority.", citation: "Technical Annex" },
                market: { score: 60, label: "Market Potential", evidence: "Links CCS to the national energy security and gas strategy.", citation: "Art. 5" }
            }
        }
    }
];

batch8.forEach(np => {
    if (!db.policies.some(p => p.id === np.id)) {
        db.policies.push(np);
        console.log(`[Inventory] Added Sub-national/CEE benchmark: ${np.id}`);
    }
});

db.lastUpdated = new Date().toISOString();
fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
