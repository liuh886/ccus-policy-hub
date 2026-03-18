import fs from 'fs';
import path from 'path';

const PAGE_PATH = 'src/pages/compare/index.astro';
let content = fs.readFileSync(PAGE_PATH, 'utf8');

// 1. Add maturityChart variable
if (!content.includes('let maturityChart')) {
  content = content.replace('let currentChart: any = null;', 'let currentChart: any = null;\n  let maturityChart: any = null;');
}

// 2. Insert Maturity Matrix Logic before bundles
const maturityLogic = `
    // 2.5 Render Maturity Matrix Chart
    const mCtx = document.getElementById('maturity-matrix-canvas');
    if (mCtx) {
      if (maturityChart) maturityChart.destroy();
      const mData = countryData.map(cd => {
        const canonName = countryMap[cd.country]?.en || cd.country;
        const profile = countriesProfiles.find(cp => cp.data.id === canonName);
        return {
          label: cd.displayCountry,
          x: profile?.data.maturity?.x || 0,
          y: profile?.data.maturity?.y || 0,
          color: cd.color.border
        };
      });
      maturityChart = new Chart(mCtx, {
        type: 'scatter',
        data: {
          datasets: mData.map(d => ({
            label: d.label,
            data: [{ x: d.x, y: d.y }],
            backgroundColor: d.color,
            pointRadius: 8,
            pointHoverRadius: 12
          }))
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => \`\${ctx.dataset.label}: Cap=\${ctx.raw.x}Mt, Gov=\${ctx.raw.y}\`
              }
            }
          },
          scales: {
            x: {
              title: { display: true, text: '落地规模 (Mt/yr)', font: { size: 10, weight: 'bold' } },
              grid: { color: 'rgba(148, 163, 184, 0.1)' }
            },
            y: {
              min: 0,
              max: 500,
              title: { display: true, text: '治理强度 (FSRTM)', font: { size: 10, weight: 'bold' } },
              grid: { color: 'rgba(148, 163, 184, 0.1)' }
            }
          }
        }
      });
    }
`;

if (!content.includes('maturityChart = new Chart(mCtx')) {
  content = content.replace('// 3. Render Bundles', maturityLogic + '\n    // 3. Render Bundles');
}

fs.writeFileSync(PAGE_PATH, content);
console.log("Updated compare page logic.");
