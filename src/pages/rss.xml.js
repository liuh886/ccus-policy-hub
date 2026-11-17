import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { SITE_BASE } from '../lib/siteBase';

export async function GET(context) {
  const policies = await getCollection('policies_zh');
  const siteWithBase = new URL(`${SITE_BASE}/`, context.site).href;
  return rss({
    title: 'CCUS Policy Hub',
    description: '全球 CCUS 政策数据库与分析平台 - 最新动态',
    site: siteWithBase,
    items: policies.map((policy) => ({
      title: policy.data.title,
      pubDate: policy.data.pubDate,
      description: policy.body?.trim() || policy.data.description,
      link: `${SITE_BASE}/policy/${policy.id.replace(/^zh\//, '')}/`,
    })),
    customData: `<language>zh-cn</language>`,
  });
}
