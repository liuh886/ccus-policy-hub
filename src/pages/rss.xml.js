import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context) {
  const policies = await getCollection('policies_zh');
  return rss({
    title: 'CCUS Policy Hub',
    description: '全球 CCUS 政策数据库与分析平台 - 最新动态',
    site: context.site,
    items: policies.map((policy) => ({
      title: policy.data.title,
      pubDate: policy.data.pubDate,
      description: policy.data.description,
      link: `/policy/${policy.id.replace(/^zh\//, '')}/`,
    })),
    customData: `<language>zh-cn</language>`,
  });
}
