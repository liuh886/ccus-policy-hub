const fs = require('fs');
const path = require('path');

const DB_PATH = 'src/data/facility_database.json';
const data = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));

data.facilities.forEach(f => {
  ['zh', 'en'].forEach(lang => {
    const dir = 'src/content/facilities/' + lang;
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const isEn = lang === 'en';
    const fm = {
      name: isEn ? (f.en?.name || f.name) : (f.zh?.name || f.name),
      lang: lang,
      country: isEn ? (f.en?.country || f.country) : (f.zh?.country || f.country),
      location: isEn ? (f.en?.location || f.location) : (f.zh?.location || f.location),
      type: isEn ? (f.en?.type || f.type) : (f.zh?.type || f.type),
      status: isEn ? (f.en?.status || f.status) : (f.zh?.status || f.status),
      capacity: f.capacity || 0,
      sector: f.sector || "",
      storage_type: f.storage_type || "",
      coordinates: f.coordinates || [0, 0],
      precision: f.precision || "approximate",
      commencementYear: f.commencementYear || null,
      description: isEn ? (f.en?.description || f.description) : (f.zh?.description || f.description),
      relatedPolicies: f.relatedPolicies || []
    };

    let content = "---\n";
    for (let [k, v] of Object.entries(fm)) {
      content += k + ": " + JSON.stringify(v) + "\n";
    }
    content += "---\n\n### Details\n\nSector: " + (f.sector || "N/A");

    fs.writeFileSync(path.join(dir, "project-" + f.id + ".md"), content, 'utf8');
  });
});
console.log('Facilities Reconstructed.');