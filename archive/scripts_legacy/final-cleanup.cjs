const fs = require('fs');
const path = require('path');

const POLICY_DB = 'src/data/policy_database.json';
const FACILITY_DB = 'src/data/facility_database.json';

const contentPaths = [
  'src/content/policies/zh',
  'src/content/policies/en',
  'src/content/facilities/zh',
  'src/content/facilities/en'
];

function cleanup() {
  console.log('--- FINAL CLEANUP & AUDIT ---');

  const rawP = fs.readFileSync(POLICY_DB, 'utf8');
  const pdb = JSON.parse(rawP.charCodeAt(0) === 0xFEFF ? rawP.slice(1) : rawP);
  
  const rawF = fs.readFileSync(FACILITY_DB, 'utf8');
  const fdb = JSON.parse(rawF.charCodeAt(0) === 0xFEFF ? rawF.slice(1) : rawF);

  const seenP = new Set();
  const uniquePolicies = [];
  pdb.policies.forEach(p => {
    if (!seenP.has(p.id)) {
      seenP.add(p.id);
      uniquePolicies.push(p);
    } else {
      console.log(' - DUPLICATE POLICY: ' + p.id);
    }
  });
  pdb.policies = uniquePolicies;
  fs.writeFileSync(POLICY_DB, JSON.stringify(pdb, null, 2), 'utf8');

  const seenF = new Set();
  const uniqueFacilities = [];
  fdb.facilities.forEach(f => {
    if (!seenF.has(f.id)) {
      seenF.add(f.id);
      uniqueFacilities.push(f);
    } else {
      console.log(' - DUPLICATE FACILITY: ' + f.id);
    }
  });
  fdb.facilities = uniqueFacilities;
  fs.writeFileSync(FACILITY_DB, JSON.stringify(fdb, null, 2), 'utf8');

  const validIds = new Set();
  uniquePolicies.forEach(p => validIds.add(p.id));
  uniqueFacilities.forEach(f => {
    validIds.add(f.id);
    validIds.add(f.id + '-zh');
    validIds.add(f.id + '-en');
  });

  contentPaths.forEach(dir => {
    if (fs.existsSync(dir)) {
      fs.readdirSync(dir).forEach(file => {
        const id = file.replace('.md', '');
        if (!validIds.has(id)) {
          console.log(' - DELETING ORPHAN: ' + file);
          fs.unlinkSync(path.join(dir, file));
        }
      });
    }
  });

  const tempFiles = [
    'src/data/iea_temp.json',
    'src/data/policy_database.json.bak',
    'src/data/policy_database.json.bak.bak'
  ];
  tempFiles.forEach(f => {
    if (fs.existsSync(f)) {
      console.log(' - DELETING TEMP: ' + f);
      fs.unlinkSync(f);
    }
  });

  console.log('CLEANUP COMPLETE.');
  console.log('Total Policies: ' + pdb.policies.length);
  console.log('Total Facilities: ' + fdb.facilities.length);
}

cleanup();