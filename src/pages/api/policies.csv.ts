import { getCollection } from 'astro:content';

export async function GET() {
  const policies = await getCollection('policies_zh');
  const escapeCsv = (value: unknown) => {
    const s = String(value ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  // Define CSV headers based on Policy Schema
  const headers = [
    'id',
    'title',
    'country',
    'year',
    'status',
    'category',
    'legal_weight',
    'pub_date',
    'url',
  ];

  const csvRows = [
    headers.join(','), // Header row
    ...policies.map((p) => {
      const d = p.data;
      return [
        escapeCsv(p.id),
        escapeCsv(d.title),
        escapeCsv(d.country),
        escapeCsv(d.year),
        escapeCsv(d.status),
        escapeCsv(d.category),
        escapeCsv(d.legalWeight || ''),
        escapeCsv(d.pubDate || ''),
        escapeCsv(d.url || ''),
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
