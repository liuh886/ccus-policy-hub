import { getCollection } from 'astro:content';

export async function GET() {
  const policiesZh = await getCollection('policies_zh');
  const policiesEn = await getCollection('policies_en');

  const data = [...policiesZh, ...policiesEn].map((p) => ({
    ...p.data,
  }));

  return new Response(JSON.stringify(data, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
