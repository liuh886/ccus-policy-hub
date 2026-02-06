import { getCollection } from 'astro:content';

export async function GET() {
  const policies = await getCollection('policies_zh');

  // Define CSV headers based on Policy Schema
  const headers = [
    'id',
    'title',
    'country',
    'year',
    'status',
    'category',
    'incentive_type',
    'incentive_value',
    'url',
  ];

  const csvRows = [
    headers.join(','), // Header row
    ...policies.map((p) => {
      const d = p.data;
      return [
        p.id,
        `"${d.title.replace(/"/g, '""')}"`,
        d.country,
        d.year,
        d.status,
        d.category,
        d.incentive_type || '',
        `"${(d.incentive_value || '').replace(/"/g, '""')}"`,
        d.url || '',
      ].join(',');
    }),
  ];

  return new Response(csvRows.join('\n'), {
    status: 200,
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="ccus_policies_export.csv"',
    },
  });
}
