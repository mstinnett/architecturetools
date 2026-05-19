// One-shot migration: hardware-data.js -> JSON files for Pages CMS.
// Run once with `node scripts/migrate-data.js`. After it succeeds the picker
// fetches JSON instead of loading the JS via a script tag.

const fs = require('fs');
const path = require('path');
const repoRoot = path.resolve(__dirname, '..');
const dataDir = path.join(repoRoot, 'assets', 'data');
const code = fs.readFileSync(path.join(dataDir, 'hardware-data.js'), 'utf8');

// Evaluate the script in a sandbox-ish context to capture the Data object.
const Data = (function () {
  var Data = {};
  eval(code);
  return Data;
})();

function write(name, obj) {
  const filePath = path.join(dataDir, name);
  fs.writeFileSync(filePath, JSON.stringify(obj, null, 2) + '\n');
  console.log('wrote', path.relative(repoRoot, filePath));
}

// recommendedFor: { review: { value: true } } -> [{ workload: 'review', budget: 'value' }]
function flattenRecommended(rec) {
  if (!rec) return [];
  const out = [];
  Object.keys(rec).forEach((workload) => {
    Object.keys(rec[workload] || {}).forEach((budget) => {
      if (rec[workload][budget]) out.push({ workload, budget });
    });
  });
  return out;
}

// Apps object -> list of {id, group, platform}
const appsArr = Object.keys(Data.Apps).map((id) => ({ id, ...Data.Apps[id] }));
write('apps.json', { items: appsArr });

// Picker options pass through
write('picker-options.json', Data.PickerOptions);

// Specs: workload -> scale -> budget -> { fields, priority }
// Flatten to: { priorities: { workload: text }, specs: [{ workload, scale, budget, ...fields }] }
function flattenSpecs(src) {
  const priorities = {};
  const specs = [];
  Object.keys(src).forEach((workload) => {
    const w = src[workload];
    if (w.priority) priorities[workload] = w.priority;
    ['small', 'large'].forEach((scale) => {
      if (!w[scale]) return;
      Object.keys(w[scale]).forEach((budget) => {
        specs.push(Object.assign({ workload, scale, budget }, w[scale][budget]));
      });
    });
  });
  return { priorities, specs };
}
write('windows-specs.json', flattenSpecs(Data.WindowsSpecs));
write('mac-specs.json', flattenSpecs(Data.MacSpecs));

// Prebuilts: array with nested recommendedFor objects -> array with flat recommendedFor list
const prebuiltItems = Data.Prebuilts.map((p) => ({
  type: p.type,
  name: p.name,
  price: p.price,
  note: p.note,
  workloadProfiles: p.workloadProfiles,
  recommendedFor: flattenRecommended(p.recommendedFor),
}));
write('prebuilts.json', {
  typeLabels: Data.PrebuiltTypeLabels,
  typeNotes: Data.PrebuiltTypeNotes,
  items: prebuiltItems,
});

// Monitors: array passes through, wrapped in { items: [...] } for CMS-friendliness
write('monitors.json', { items: Data.Monitors });

// Laptops: same treatment as prebuilts (flatten recommendedFor)
const laptopItems = Data.Laptops.map((l) => ({
  category: l.category,
  platform: l.platform,
  name: l.name,
  price: l.price,
  weight: l.weight,
  note: l.note,
  workloadProfiles: l.workloadProfiles,
  recommendedFor: flattenRecommended(l.recommendedFor),
}));
write('laptops.json', {
  categoryLabels: Data.LaptopCategoryLabels,
  items: laptopItems,
});

console.log('migration complete.');
