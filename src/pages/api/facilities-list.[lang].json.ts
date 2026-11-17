import type { APIRoute } from 'astro';
import { getLocaleDataIndex } from '../../lib/dataIndex';

export function getStaticPaths() {
  return [{ params: { lang: 'zh' } }, { params: { lang: 'en' } }];
}

export const GET: APIRoute = async ({ params }) => {
  const lang = params.lang === 'en' ? 'en' : 'zh';
  const { directoryMeta } = await getLocaleDataIndex(lang);

  return new Response(JSON.stringify(directoryMeta.listItems), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
};
