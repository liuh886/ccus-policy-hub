import { getCollection } from 'astro:content';

export async function GET() {
  const policiesZh = await getCollection('policies_zh');
  const policiesEn = await getCollection('policies_en');

  const data = [
    ...policiesZh.map((p) => ({ ...p.data, lang: 'zh' as const })),
    ...policiesEn.map((p) => ({ ...p.data, lang: 'en' as const })),
  ];

  return new Response(JSON.stringify(data, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
