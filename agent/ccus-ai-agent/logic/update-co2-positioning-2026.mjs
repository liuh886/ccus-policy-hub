import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import initSqlJs from 'sql.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '../db/ccus_master.sqlite');
const AUDIT_DATE = '2026-03-29';
const REVIEWER = 'CCUS AI Agent';

const updates = {
  Algeria: {
    en: 'Industrial CO2 resource / gas; treatment differs between utilization and storage contexts.',
    zh: '工业 CO2 资源 / 气体；在利用与封存场景中的监管定位不同。',
  },
  Argentina: {
    en: 'Residual industrial CO2 emissions stream for utilization or storage; no standalone national CCS legal class yet.',
    zh: '工业残余 CO2 排放流，可用于利用或封存；尚无独立全国性 CCS 法定分类。',
  },
  Australia: {
    en: 'Greenhouse gas substance / greenhouse gas stream under offshore storage law.',
    zh: '海上封存法框架下的温室气体物质 / 温室气体流。',
  },
  Austria: {
    en: 'EU-style CO2 stream for geological storage; dedicated national storage regime remains limited.',
    zh: '遵循欧盟口径的地质封存 CO2 流；国家层面的专门封存制度仍有限。',
  },
  Bulgaria: {
    en: 'EU-style CO2 stream for geological storage; dedicated national storage regime remains limited.',
    zh: '遵循欧盟口径的地质封存 CO2 流；国家层面的专门封存制度仍有限。',
  },
  Canada: {
    en: 'Provincially regulated CO2 stream / sequestered substance for storage; exact classification varies by province.',
    zh: '由各省监管的封存用 CO2 流 / 封存物质；具体分类因省而异。',
  },
  Chile: {
    en: 'Managed emissions stream that can support mitigation outcomes; not framed solely as waste.',
    zh: '受监管的排放流，可用于减排成果安排；并非单纯按废物定位。',
  },
  China: {
    en: 'No unified statutory definition yet; treated functionally as an industrial resource for use and as a regulated emissions/storage stream for CCS.',
    zh: '尚无统一法定定义；利用环节多按工业资源处理，CCS 环节按受控排放流 / 封存活动监管。',
  },
  Colombia: {
    en: 'Emissions stream / mitigation outcome within climate-law framework; no standalone CCS substance class yet.',
    zh: '气候法框架下的排放流 / 减缓成果；尚无独立 CCS 物质类别。',
  },
  Denmark: {
    en: 'CO2 stream for storage; current policy gives special priority to biogenic CO2 and removals.',
    zh: '用于封存的 CO2 流；现行政策对生物源 CO2 与碳移除给予特别优先。',
  },
  'European Union': {
    en: 'CO2 stream for geological storage; must consist overwhelmingly of carbon dioxide.',
    zh: '用于地质封存的 CO2 流；必须绝大部分由二氧化碳构成。',
  },
  France: {
    en: 'Residual industrial CO2 stream eligible for storage; framed around unavoidable emissions.',
    zh: '可用于封存的工业残余 CO2 流；制度上聚焦不可避免排放。',
  },
  Germany: {
    en: 'High-purity CO2 stream for transport and storage; access is policy-limited to hard-to-abate sectors and removals.',
    zh: '用于运输与封存的高纯度 CO2 流；政策适用范围限于难减排行业和碳移除。',
  },
  Iceland: {
    en: 'CO2 stream for mineral storage; regulated as a storage feed stream rather than as a waste category.',
    zh: '用于矿化封存的 CO2 流；监管上更接近封存进料流，而非单独废物类别。',
  },
  India: {
    en: 'Industrial CO2 / carbon asset within the emerging CCTS framework; no dedicated CCS legal class yet.',
    zh: '新兴 CCTS 框架下的工业 CO2 / 碳资产；尚无专门 CCS 法定类别。',
  },
  Ireland: {
    en: 'High-purity CO2 stream for permanent storage; generally positioned outside waste treatment when stored under CCS rules.',
    zh: '用于永久封存的高纯度 CO2 流；在 CCS 规则下通常不按废物处置定位。',
  },
  Italy: {
    en: 'CO2 stream for transport and storage within the CCS framework; access rules are still evolving.',
    zh: 'CCS 框架下用于运输与封存的 CO2 流；准入规则仍在演进。',
  },
  Japan: {
    en: 'Licensed CO2 stream / industrial gas for transport and storage under the CCS Business Act.',
    zh: '《CCS 事业法》下获许可用于运输与封存的 CO2 流 / 工业气体。',
  },
  Kuwait: {
    en: 'Industrial CO2 resource for EOR and potential storage; no dedicated CCS legal class yet.',
    zh: '用于 EOR 和潜在封存的工业 CO2 资源；尚无专门 CCS 法定类别。',
  },
  Lithuania: {
    en: 'CO2 stream / industrial feedstock for CCU-oriented use; dedicated storage classification remains limited.',
    zh: '面向 CCU 的 CO2 流 / 工业原料；专门封存分类仍有限。',
  },
  Malaysia: {
    en: 'Regulated CO2 stream across capture, transport, utilization, and permanent storage under the CCUS framework.',
    zh: 'CCUS 框架下贯穿捕集、运输、利用和永久封存全链条的受监管 CO2 流。',
  },
  Mexico: {
    en: 'Industrial emissions stream for CCUS use or storage; dedicated legal classification is still developing.',
    zh: '用于 CCUS 利用或封存的工业排放流；专门法律分类仍在形成中。',
  },
  Netherlands: {
    en: 'CO2 stream for permanent storage, with a separate policy track for carbon-removal projects.',
    zh: '用于永久封存的 CO2 流，并为碳移除项目设置独立政策轨道。',
  },
  Norway: {
    en: 'CO2 stream for transport and offshore geological storage under a licensed CCS regime.',
    zh: '许可制 CCS 体系下用于运输和海上地质封存的 CO2 流。',
  },
  Oman: {
    en: 'Industrial CO2 resource for EOR and low-carbon industry; dedicated storage classification remains policy-led.',
    zh: '用于 EOR 和低碳工业的工业 CO2 资源；专门封存分类仍以政策推动为主。',
  },
  Portugal: {
    en: 'CO2 stream for geological storage under the EU CCS framework.',
    zh: '欧盟 CCS 框架下用于地质封存的 CO2 流。',
  },
  Qatar: {
    en: 'Industrial CO2 emissions stream for sequestration and EOR; dedicated CCS legal class remains limited.',
    zh: '用于封存和 EOR 的工业 CO2 排放流；专门 CCS 法定类别仍有限。',
  },
  'Republic of Korea': {
    en: 'Non-waste CO2 stream; treated as an industrial resource for use and as a regulated storage substance for CCS.',
    zh: '非废物属性的 CO2 流；利用时可作为工业资源，封存时作为受监管封存物质。',
  },
  Russia: {
    en: 'Industrial CO2 emissions stream used in low-carbon industry policy; no mature standalone CCS legal class yet.',
    zh: '低碳产业政策语境下的工业 CO2 排放流；尚无成熟独立的 CCS 法定类别。',
  },
  'Saudi Arabia': {
    en: 'Industrial carbon resource under circular-carbon-economy policy; dedicated CCS legal classification remains limited.',
    zh: '循环碳经济政策下的工业碳资源；专门 CCS 法律分类仍有限。',
  },
  'South Africa': {
    en: 'Emissions stream within climate and environmental regulation; no standalone CCS legal definition yet.',
    zh: '气候与环境监管框架下的排放流；尚无独立 CCS 法律定义。',
  },
  Sweden: {
    en: 'Managed high-purity CO2 stream for storage, with specific support for bio-CO2 and BECCS.',
    zh: '用于封存的受监管高纯度 CO2 流，并对生物源 CO2 与 BECCS 提供专项支持。',
  },
  Thailand: {
    en: 'Managed substance / emissions stream under emerging climate legislation; dedicated CCS class is still forming.',
    zh: '新兴气候立法框架下的受控物质 / 排放流；专门 CCS 类别仍在形成中。',
  },
  Turkey: {
    en: 'Industrial emissions stream for potential CCS deployment; dedicated legal classification remains under development.',
    zh: '面向潜在 CCS 部署的工业排放流；专门法律分类仍在完善中。',
  },
  'United Arab Emirates': {
    en: 'GHG emissions stream within the federal climate framework; dedicated CCS legal classification remains limited.',
    zh: '联邦气候框架下的温室气体排放流；专门 CCS 法律分类仍有限。',
  },
  'United Kingdom': {
    en: 'CO2 stream for transport and geological storage under the CCS licensing regime.',
    zh: 'CCS 许可制度下用于运输和地质封存的 CO2 流。',
  },
  'United States': {
    en: 'Federal CO2 stream for geologic sequestration; commodity or waste treatment can vary by use case and state law.',
    zh: '联邦层面按地质封存用 CO2 流监管；在不同用途和州法下也可能呈现商品或废弃物的混合定位。',
  },
};

const zhSummaryOverrides = {
  Argentina: '阿根廷的 CCUS 监管画像以省级资源管辖、投资激励和早期 CCUS 制度探索为特征。',
  Australia: '澳大利亚的 CCUS 监管画像建立在成熟的海上温室气体封存法制和州联邦并行治理结构之上。',
  Austria: '奥地利的 CCUS 监管画像总体遵循欧盟框架，但国内专门封存制度与项目实践仍较有限。',
  Belgium: '比利时的 CCUS 监管画像以港口集群、区域政府权限和跨境运输协同为特征。',
  Brazil: '巴西的 CCUS 监管画像正围绕海上封存、油气监管和国家气候政策逐步成形。',
  Bulgaria: '保加利亚的 CCUS 监管画像总体沿用欧盟制度框架，国内实施仍处于早期阶段。',
  Canada: '加拿大的 CCUS 监管画像以省级立法、税收激励和成熟封存项目并行为特征。',
  Chile: '智利的 CCUS 监管画像仍处早期阶段，主要依托气候法与减排政策框架推进。',
  Colombia: '哥伦比亚的 CCUS 监管画像主要嵌入能源转型与气候治理法制，独立 CCS 制度仍在发展。',
  Denmark: '丹麦的 CCUS 监管画像以国家主导的封存许可、补贴机制和生物源移除导向为特征。',
  'European Union': '欧盟的 CCUS 监管画像以 CCS 指令为核心，并通过 ETS、NZIA 和 CRCF 等制度持续扩展。',
  France: '法国的 CCUS 监管画像强调不可避免工业排放、国家规划引导和欧盟规则衔接。',
  Germany: '德国的 CCUS 监管画像以难减排行业准入限制、联邦战略转向和跨境运输准备为特征。',
  Greece: '希腊的 CCUS 监管画像依托欧盟框架和海上封存开发推进，重点聚焦区域枢纽建设。',
  Iceland: '冰岛的 CCUS 监管画像以矿化封存和碳移除应用见长，制度与项目耦合度较高。',
  India: '印度的 CCUS 监管画像仍处政策培育阶段，重点落在工业脱碳和碳市场衔接。',
  Indonesia: '印度尼西亚的 CCUS 监管画像以油气法制为基础，正向独立 CCUS 监管框架过渡。',
  International: '国际层面的 CCUS 监管画像主要由伦敦议定书、巴黎协定和 MRV 标准共同塑造。',
  Italy: '意大利的 CCUS 监管画像建立在欧盟规则基础上，并以 Ravenna 等集群推动商业化落地。',
  Japan: '日本的 CCUS 监管画像以《CCS 事业法》、指定海域许可和国家主导长期管理机制为核心。',
  Kazakhstan: '哈萨克斯坦的 CCUS 监管画像主要嵌入生态法典与 ETS 体系，制度仍在早期发展。',
  Kuwait: '科威特的 CCUS 监管画像以油气行业应用和 EOR 导向为主，独立 CCS 法制仍有限。',
  Malaysia: '马来西亚的 CCUS 监管画像正从政策文件转向专门立法，覆盖全价值链监管。',
  Mexico: '墨西哥的 CCUS 监管画像主要由国家能源与工业脱碳战略驱动，法律框架仍在形成。',
  Netherlands: '荷兰的 CCUS 监管画像以永久封存、港口基础设施和碳移除政策并行推进为特征。',
  Nigeria: '尼日利亚的 CCUS 监管画像主要依附油气与环境制度，独立封存规则仍较有限。',
  Norway: '挪威的 CCUS 监管画像以成熟海上封存许可制度、国家主导项目和跨境接收能力见长。',
  Oman: '阿曼的 CCUS 监管画像以油气增产和低碳工业资源化利用为主，专门封存制度仍较早期。',
  Other: '该条目用于承接尚未归入主要法域的国家或地区，其监管画像需结合具体国家另行判断。',
  Philippines: '菲律宾的 CCUS 监管画像正在政策起步阶段，重点放在能源部门框架和市场化路径。',
  Poland: '波兰的 CCUS 监管画像以欧盟合规、高纯度 CO2 流要求和国家主导矿业治理为特征。',
  Portugal: '葡萄牙的 CCUS 监管画像总体沿用欧盟 CCS 规则，国内制度和项目推进仍较谨慎。',
  Qatar: '卡塔尔的 CCUS 监管画像围绕 LNG、工业排放和 EOR 应用展开，国家战略驱动较强。',
  Romania: '罗马尼亚的 CCUS 监管画像以欧盟 CCS 转置框架为基础，封存与工业气体属性并存。',
  Russia: '俄罗斯的 CCUS 监管画像主要服务于蓝氢和工业减排政策，独立 CCS 法制仍不成熟。',
  'Saudi Arabia': '沙特阿拉伯的 CCUS 监管画像以循环碳经济和大型工业项目为核心驱动力。',
  Singapore: '新加坡的 CCUS 监管画像以碳定价、跨境合作和区域运输枢纽角色为特征。',
  'South Africa': '南非的 CCUS 监管画像主要嵌入气候法与能源转型政策，独立法律分类仍有限。',
  Spain: '西班牙的 CCUS 监管画像建立在欧盟制度基础上，并通过国家气候法和工业脱碳政策推进。',
  Switzerland: '瑞士的 CCUS 监管画像以减排法和国际合作为核心，国内封存空间与规则仍较有限。',
  Thailand: '泰国的 CCUS 监管画像正围绕新兴气候立法、投资促进和工业试点逐步形成。',
  Turkey: '土耳其的 CCUS 监管画像仍处政策规划阶段，重点服务水泥和钢铁等高排放行业。',
  'United Arab Emirates': '阿联酋的 CCUS 监管画像以联邦气候框架、国有能源企业和工业减排项目为核心。',
  'United Kingdom': '英国的 CCUS 监管画像以运输封存许可、集群模式和合同化支持机制为特征。',
  Vietnam: '越南的 CCUS 监管画像嵌入新环境法与碳市场制度，整体仍处早期形成阶段。',
};

const zhFieldOverrides = {
  Austria: {
    pore_space_rights: '国家所有',
    liability_transfer: '符合欧盟规则',
    liability_period: '20 年',
    financial_assurance: '银行担保',
    permitting_lead_time: '约 2 年',
    cross_border_rules: '欧盟内部规则适用',
  },
  Bulgaria: {
    pore_space_rights: '国家所有',
    liability_transfer: '符合欧盟规则（约 20 年后可转移）',
    liability_period: '20 年',
    financial_assurance: '银行担保',
    permitting_lead_time: '12-24 个月',
    cross_border_rules: '欧盟内部规则适用',
  },
  Japan: {
    pore_space_rights: '拟制物权（准物权）',
    liability_transfer: '稳定性确认后，监测和管理责任转移至 JOGMEC。',
    liability_period: '2024-2026 年分阶段实施；运营期间需持续缴纳监测负担金。',
    financial_assurance: '须向 JOGMEC 缴纳强制性监测准备金（分担金）。',
    permitting_lead_time: '通过 METI 指定海域许可，通常约 2-3 年。',
    cross_border_rules: '与《伦敦议定书》第 6 条修正方向保持一致，以支持亚太跨境枢纽。',
  },
  Portugal: {
    pore_space_rights: '国家所有',
    liability_transfer: '允许转移',
    liability_period: '20 年',
    financial_assurance: '环境保证金',
    permitting_lead_time: '2-3 年',
    cross_border_rules: '符合欧盟 ETS / CCS 规则',
  },
};

function all(db, sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

async function main() {
  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync(DB_PATH));

  db.run('BEGIN TRANSACTION');
  try {
    let countryCount = 0;
    let rowCount = 0;

    for (const [countryId, value] of Object.entries(updates)) {
      const existing = all(
        db,
        'SELECT country_id, lang, co2_definition FROM country_i18n WHERE country_id = ? ORDER BY lang',
        [countryId]
      );
      if (existing.length === 0) continue;

      db.run(
        `UPDATE country_i18n
         SET co2_definition = ?
         WHERE country_id = ? AND lang = 'en'`,
        [value.en, countryId]
      );
      db.run(
        `UPDATE country_i18n
         SET co2_definition = ?
         WHERE country_id = ? AND lang = 'zh'`,
        [value.zh, countryId]
      );
      db.run(
        `UPDATE country_profiles
         SET provenance_reviewer = ?, provenance_last_audit_date = ?
         WHERE id = ?`,
        [REVIEWER, AUDIT_DATE, countryId]
      );

      countryCount += 1;
      rowCount += existing.length;
    }

    for (const [countryId, summary] of Object.entries(zhSummaryOverrides)) {
      db.run(
        `UPDATE country_i18n
         SET summary = ?
         WHERE country_id = ? AND lang = 'zh'`,
        [summary, countryId]
      );
    }

    for (const [countryId, fields] of Object.entries(zhFieldOverrides)) {
      for (const [field, value] of Object.entries(fields)) {
        db.run(
          `UPDATE country_i18n
           SET ${field} = ?
           WHERE country_id = ? AND lang = 'zh'`,
          [value, countryId]
        );
      }
    }

    db.run('COMMIT');
    fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
    console.log(`Updated CO2 regulatory positioning for ${countryCount} countries (${rowCount} i18n rows).`);
  } catch (error) {
    db.run('ROLLBACK');
    throw error;
  } finally {
    db.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
