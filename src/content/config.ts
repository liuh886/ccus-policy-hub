import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import fs from 'node:fs';

const policySchema = z.object({
  title: z.string(),
  country: z.string(),
  year: z.number(),
  status: z.string(),
  category: z.string(),
  tags: z.array(z.string()).default([]),
  incentive_type: z.string().optional(),
  incentive_value: z.string().optional(),
  incentive_usd_per_ton: z.number().optional(),
  mrv_requirement: z.string().optional(),
  mrv_rigor: z.number().min(1).max(5).optional(),
  // PLR Indicators
  pore_space_rights: z.string().optional(),
  liability_transfer: z.string().optional(),
  cross_border_rules: z.string().optional(),
  third_party_access: z.string().optional(),
  co2_definition: z.string().optional(),
  closure_criteria: z.string().optional(),
  financial_assurance: z.string().optional(),
  plr_index: z.number().min(0).max(100).optional(),
  // Comparative Depth Fields (PLR 3.0)
  permitting_lead_time: z.string().optional(),
  liability_period_years: z.union([z.number(), z.string()]).optional(),
  public_consultation: z.string().optional(),
  incentive_duration_years: z.union([z.number(), z.string()]).optional(),
  eor_eligibility: z.string().optional(),
  legal_citation: z.string().optional(),
  sectors: z.array(z.string()).default([]),
  description: z.string(),
  url: z.string().optional(),
  source: z.string().optional(),
  pubDate: z.coerce.date(),
  relatedFacilities: z.array(z.string()).default([]),
});

const facilitySchema = z.object({
  name: z.string(),
  lang: z.string(),
  country: z.string(),
  location: z.string(),
  type: z.string(),
  status: z.string(),
  capacity: z.number(),
  sector: z.string().optional(),
  storage_type: z.string().optional(),
  coordinates: z.array(z.number()),
  precision: z.enum(['precise', 'approximate']).default('precise'),
  commencementYear: z.union([z.number(), z.string()]).nullable().optional(),
  description: z.string(),
  relatedPolicies: z.array(z.string()).default([]),
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
    title: z.string(),
    pubDate: z.coerce.date(),
  }),
});

const docs = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/docs' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
  }),
});

export const collections = { 
  policies_zh, policies_en, 
  facilities_zh, facilities_en, 
  changelog, docs 
};
