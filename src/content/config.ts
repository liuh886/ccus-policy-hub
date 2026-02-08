import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// 治理标准枚举定义
const PolicyStatusEnum = z.enum(['Active', 'Planned', 'Under development', 'Upcoming', 'Inactive', 'Superseded']);
const ReviewStatusEnum = z.enum(['draft', 'verified']);
const FacilityStatusEnum = z.enum(['Operational', 'Planned', 'Under construction', 'Suspended', 'Decommissioned']);
const PrecisionEnum = z.enum(['precise', 'approximate']);
const CategoryEnum = z.enum(['Incentive', 'Regulatory', 'Market', 'Strategic', 'Technical']);
const ScopeEnum = z.enum(['International', 'National', 'Sub-national', 'Regional']);
const LegalWeightEnum = z.enum(['Primary Legislation', 'Administrative Regulation', 'Departmental Rules', 'Technical Standard', 'Strategic Guidance', 'Guideline/Policy']);

const fsrtmDimensionSchema = z.object({
  score: z.number().min(0).max(100).default(0), // 切换为百分制
  label: z.string().min(1, "Label is required for governance tracking"),
  evidence: z.string().min(5, "Evidence must be a substantive explanation").default("No evidence provided yet."), // 强制简短解释说明
  citation: z.union([
    z.string(),
    z.object({
      text: z.string(),
      type: z.string().optional(),
      link: z.string().url().optional()
    })
  ]).optional(), // 允许字符串或结构化对象
  auditNote: z.string().optional(), // 内部审计笔记：记录为何进行重新打分
  description: z.string().optional(),
});

const policySchema = z.object({
  title: z.string(),
  country: z.string(),
  region: z.string().optional(), // 具体省份/州（如：广东省、California）
  scope: ScopeEnum.default('National'), // 管辖范围
  legalWeight: LegalWeightEnum.default('Guideline/Policy'), // 法律效力等级
  year: z.number().min(1900).max(2100),
  status: PolicyStatusEnum,
  reviewStatus: ReviewStatusEnum.default('draft'),
  expiryDate: z.coerce.date().optional(), // 政策有效期截止日
  category: CategoryEnum,
  tags: z.array(z.string()).default([]),
  description: z.string().min(10, "Description must be substantive"),
  interpretation: z.string().optional(), // 政策简要解读
  
  // 结构化影响评估 (P1 升级)
  impactAnalysis: z.object({
    economic: z.string().optional(),
    technical: z.string().optional(),
    environmental: z.string().optional(),
  }).optional(),

  // 演进与溯源 (P1 升级)
  evolution: z.object({
    supersedes: z.array(z.string()).default([]),
    supersededBy: z.string().optional(),
    clusters: z.array(z.string()).default([]),
  }).optional(),

  // 执行细节 (P1 升级)
  implementationDetails: z.object({
    authority: z.string().optional(),
    fundingScale: z.string().optional(),
    mechanism: z.string().optional(), // 差价合约 (CfD)、直接补贴等
  }).optional(),

  sectors: z.array(z.string()).default([]), // 适用行业: Power, Industry, Hydrogen, etc.
  pubDate: z.coerce.date(),
  plr_index: z.number().min(0).max(100).optional(),
  // 统计看板字段
  stats: z.object({
    operationalCount: z.number().default(0),
    constructionCount: z.number().default(0),
    plannedCount: z.number().default(0),
    operationalCapacity: z.number().default(0),
    constructionCapacity: z.number().default(0),
    plannedCapacity: z.number().default(0),
  }).optional(),
  analysis: z.object({
    frameworkVersion: z.string().default("5.0"), // 体系版本
    incentive: fsrtmDimensionSchema.optional(),
    statutory: fsrtmDimensionSchema.optional(),
    liability: fsrtmDimensionSchema.optional(),
    mrv: fsrtmDimensionSchema.optional(),
    market: fsrtmDimensionSchema.optional(),
    strategic: fsrtmDimensionSchema.optional(),
  }).optional(),
  // 关联设施 ID 列表 (P1 升级)
  relatedFacilities: z.array(z.string()).default([]),

  // 权属与溯源 (P2 升级)
  provenance: z.object({
    author: z.string().default("System"),
    reviewer: z.string().optional(),
    lastAuditDate: z.string().optional(),
  }).optional(),

  url: z.string().url("Must be a valid URL").optional(),
  source: z.string().optional(),
});

const facilitySchema = z.object({
  name: z.string(),
  lang: z.enum(['zh', 'en']),
  country: z.string(),
  region: z.string().optional(),
  partners: z.array(z.string()).default([]),
  type: z.string(), // Project type
  status: FacilityStatusEnum, // Project Status
  phase: z.string().optional(), // Project phase
  reviewStatus: ReviewStatusEnum.default('draft'),
  
  // 产能量化
  announcedCapacity: z.number().nonnegative().optional(), // Mt CO2/yr
  estimatedCapacity: z.number().nonnegative().optional(), // Mt CO2/yr
  capacity: z.number().nonnegative().default(0), // 统一兼容字段
  
  // 核心属性
  sector: z.string().optional(),
  fateOfCarbon: z.string().optional(),
  hub: z.string().optional(), // Part of CCUS hub
  
  // 时间轴
  announcement: z.string().optional(),
  fid: z.string().optional(),
  operation: z.string().optional(),
  suspensionDate: z.string().optional(),
  commencementYear: z.number().nullable().optional(), // 遗留兼容

  // 链接
  links: z.array(z.string()).default([]),
  url: z.string().url().optional(), // 原始主链接

  // 增强治理
  coordinates: z.array(z.number()).length(2, "Coordinates must be [lat, lng]"),
  precision: PrecisionEnum.default('approximate'),
  relatedPolicies: z.array(z.string()).default([]),
  
  // 权属
  provenance: z.object({
    author: z.string().default("IEA Ingestion"),
    reviewer: z.string().optional(),
    lastAuditDate: z.string().optional(),
  }).optional(),

  // 技术细节 (兼容)
  operator: z.string().optional(),
  captureTechnology: z.string().optional(),
  storageType: z.string().optional(),
});

const docSchema = z.object({
  title: z.string(),
  description: z.string(),
  order: z.number().default(99),
});

const changelogSchema = z.object({
  version: z.string(),
  pubDate: z.coerce.date(),
  title: z.string(),
});

export const collections = {
  policies_zh: defineCollection({
    loader: glob({ pattern: '*.md', base: './src/content/policies/zh', generateId: ({ entry }) => `zh/${entry.replace(/\.md$/, '')}` }),
    schema: policySchema,
  }),
  policies_en: defineCollection({
    loader: glob({ pattern: '*.md', base: './src/content/policies/en', generateId: ({ entry }) => `en/${entry.replace(/\.md$/, '')}` }),
    schema: policySchema,
  }),
  facilities_zh: defineCollection({
    loader: glob({ pattern: 'project-*.md', base: './src/content/facilities/zh', generateId: ({ entry }) => `zh/${entry.replace(/\.md$/, '')}` }),
    schema: facilitySchema,
  }),
  facilities_en: defineCollection({
    loader: glob({ pattern: 'project-*.md', base: './src/content/facilities/en', generateId: ({ entry }) => `en/${entry.replace(/\.md$/, '')}` }),
    schema: facilitySchema,
  }),
  docs: defineCollection({
    loader: glob({ pattern: '*.md', base: './src/content/docs' }),
    schema: docSchema,
  }),
  changelog: defineCollection({
    loader: glob({ pattern: '*.md', base: './src/content/changelog' }),
    schema: changelogSchema,
  }),
};