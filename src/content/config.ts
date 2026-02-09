import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { POLICY_CATEGORIES, POLICY_STATUSES, ANALYSIS_DIMENSIONS, FACILITY_STATUSES } from './enums.generated';

const provenanceSchema = z.object({
  author: z.string(),
  reviewer: z.string(),
  lastAuditDate: z.string(),
});

const analysisDimensionSchema = z.object({
  score: z.number().min(0).max(100),
  label: z.string(),
  evidence: z.string(),
  citation: z.string(),
  auditNote: z.string(),
});

const policySchema = z.object({
  id: z.string(),
  title: z.string(),
  country: z.string(),
  year: z.number().optional().default(2024),
  status: z.string().optional().default("Active"),
  category: z.string().optional().default("Regulatory"),
  reviewStatus: z.string().optional().default("draft"),
  pubDate: z.string().optional().default("2024-01-01"),
  legalWeight: z.string().optional().default(""),
  source: z.string().optional().default(""),
  url: z.string().optional().default(""),
  sectors: z.array(z.string()).default([]),
  description: z.string().optional().default(""),
  interpretation: z.string().optional(),
  evolution: z.object({
    supersedes: z.array(z.string()).optional(),
    supersededBy: z.string().optional(),
    clusters: z.array(z.string()).optional(),
  }).optional(),
  impactAnalysis: z.object({
    economic: z.string().optional(),
    technical: z.string().optional(),
    environmental: z.string().optional(),
  }).optional(),
  regulatory: z.object({
    pore_space_rights: z.string().optional().nullable(),
    liability_transfer: z.string().optional().nullable(),
    liability_period: z.string().optional().nullable(),
    financial_assurance: z.string().optional().nullable(),
    permitting_lead_time: z.string().optional().nullable(),
    co2_definition: z.string().optional().nullable(),
    cross_border_rules: z.string().optional().nullable(),
  }).optional(),
  analysis: z.record(z.string(), analysisDimensionSchema).optional().default({}),
  relatedFacilities: z.array(z.string()).default([]),
  provenance: provenanceSchema.optional(),
});

const facilitySchema = z.object({
  id: z.string(),
  name: z.string(),
  lang: z.string(),
  country: z.string(),
  region: z.string().optional().default(""),
  type: z.string().optional().default(""),
  status: z.string().optional().default("Planned"),
  announcedCapacityMin: z.number().optional().default(0),
  announcedCapacityMax: z.number().optional().default(0),
  announcedCapacityRaw: z.string().optional().default(""),
  estimatedCapacity: z.number().optional().default(0),
  coordinates: z.array(z.number()).length(2).refine((coords) => {
    const [lat, lng] = coords;
    return (lat !== 0 || lng !== 0) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  }, { message: "Invalid coordinates" }).optional().default([0.001, 0.001]),
  precision: z.string().optional().default("country"),
  sector: z.string().optional().default(""),
  fateOfCarbon: z.string().optional().default(""),
  hub: z.string().optional().default(""),
  operator: z.string().optional(),
  captureTechnology: z.string().optional(),
  storageType: z.string().optional(),
  investmentScale: z.string().optional(),
  phase: z.string().optional().default(""),
  announcement: z.string().optional().default(""),
  fid: z.string().optional().default(""),
  operation: z.string().optional().default(""),
  suspensionDate: z.string().optional().default(""),
  partners: z.array(z.string()).default([]),
  links: z.array(z.string()).default([]),
  url: z.string().optional().default(""),
  relatedPolicies: z.array(z.string()).default([]),
  provenance: provenanceSchema.optional(),
});

const policies_zh = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/policies/zh' }),
  schema: policySchema,
});

const policies_en = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/policies/en' }),
  schema: policySchema,
});

const facilities_zh = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/facilities/zh' }),
  schema: facilitySchema,
});

const facilities_en = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/facilities/en' }),
  schema: facilitySchema,
});

const changelog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/changelog' }),
  schema: z.object({
    version: z.string(),
    title: z.string(),
    pubDate: z.coerce.date(),
  }),
});

const docs = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/docs' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    order: z.number(),
  }),
});

export const collections = {
  policies_zh,
  policies_en,
  facilities_zh,
  facilities_en,
  changelog,
  docs,
};