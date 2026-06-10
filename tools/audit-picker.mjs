#!/usr/bin/env node
// Accuracy audit for the picker: replicates the selection logic in index.html
// over every reachable input combination and reports anomalies.
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const Data = JSON.parse(readFileSync(join(ROOT, 'assets/data/hardware-data.json'), 'utf8'));

const PROFILES = ['review', 'drafting', 'modeling', 'viz', 'modeling_viz', 'production'];
const SCALES = ['small', 'large'];
const TIERS = ['cheapest', 'value', 'best'];

const issues = [];
const notes = [];
const flag = (m) => issues.push(m);
const note = (m) => notes.push(m);

// ---- which workload profiles are reachable per platform ----
// profile is derived from selected app groups; a profile is reachable on a
// platform only if an app combo of that platform produces it.
function reachableProfiles(platform) {
  const groups = { modeling: [], drafting: [], viz: [], render: [] };
  for (const id in Data.Apps) {
    const a = Data.Apps[id];
    if (platform === 'mac' && a.platform === 'win') continue;
    groups[a.group].push(id);
  }
  const out = new Set(['review']);
  if (groups.drafting.length) out.add('drafting');
  if (groups.modeling.length) out.add('modeling');
  if (groups.viz.length) out.add('viz');
  if (groups.viz.length && (groups.modeling.length || groups.drafting.length)) out.add('modeling_viz');
  if (groups.render.length) out.add('production');
  return out;
}
const reach = { win: reachableProfiles('win'), mac: reachableProfiles('mac') };
for (const p of PROFILES) {
  if (!reach.mac.has(p)) note(`profile "${p}" is unreachable on mac (no mac app produces it)`);
}

// ---- 1. spec matrix completeness ----
for (const [name, specs] of [['WindowsSpecs', Data.WindowsSpecs], ['MacSpecs', Data.MacSpecs]]) {
  for (const p of PROFILES) {
    if (!specs[p]) { flag(`${name}: missing profile ${p}`); continue; }
    if (!specs[p].priority) flag(`${name}.${p}: missing priority note`);
    for (const s of SCALES) for (const t of TIERS) {
      if (!specs[p][s] || !specs[p][s][t]) flag(`${name}.${p}.${s}.${t}: missing spec cell`);
    }
  }
}

// ---- 2. recommendedFor integrity (laptops + prebuilts) ----
function checkRecFlags(kind, item) {
  for (const p in (item.recommendedFor || {})) {
    if (!PROFILES.includes(p)) flag(`${kind} "${item.name}": recommendedFor has unknown profile "${p}"`);
    else if (!item.workloadProfiles.includes(p)) flag(`${kind} "${item.name}": recommendedFor["${p}"] but "${p}" not in workloadProfiles`);
    for (const t in item.recommendedFor[p]) {
      if (!TIERS.includes(t)) flag(`${kind} "${item.name}": recommendedFor.${p} has unknown tier "${t}"`);
    }
  }
  for (const p of item.workloadProfiles) {
    if (!PROFILES.includes(p)) flag(`${kind} "${item.name}": unknown workloadProfile "${p}"`);
  }
}
Data.Prebuilts.forEach((pb) => checkRecFlags('prebuilt', pb));
Data.Laptops.forEach((l) => checkRecFlags('laptop', l));

// ---- 3. prebuilt panel (only rendered on the win path) ----
const MAC_NAME = /\bmac(book| mini| studio| pro)?\b/i;
for (const pb of Data.Prebuilts) {
  if (MAC_NAME.test(pb.name)) {
    flag(`prebuilt "${pb.name}" is Apple hardware but the prebuilt panel only renders on the Windows path` +
      ` (shows for profiles: ${pb.workloadProfiles.join(', ')})`);
  }
}
const PREBUILT_TYPES = ['builder', 'mini', 'office', 'workstation', 'gaming'];
for (const profile of PROFILES) {
  if (!reach.win.has(profile)) continue;
  const shown = Data.Prebuilts.filter((pb) => pb.type === 'builder' || pb.workloadProfiles.includes(profile));
  if (!shown.length) flag(`win prebuilts: nothing shown for profile ${profile}`);
  for (const tier of TIERS) {
    // more than one rec badge inside one type section reads as a contradiction
    for (const type of PREBUILT_TYPES) {
      const recs = shown.filter((pb) => pb.type === type && pb.recommendedFor?.[profile]?.[tier]);
      if (recs.length > 1) flag(`win prebuilts ${profile}/${tier}: ${recs.length} "rec" badges in type "${type}" (${recs.map((r) => r.name).join(', ')})`);
    }
  }
}

// ---- 4. laptop selection per platform × strategy × profile × budget ----
const winCats = { one: ['one', 'desk', 'travel', 'student'], travel: ['travel'], workstation: ['one', 'desk', 'travel', 'student'] };
const macCats = { one: ['mac_p', 'mac_s'], travel: ['mac_s'], workstation: ['mac_p', 'mac_s'] };
for (const platform of ['win', 'mac']) {
  const catsByStrategy = platform === 'mac' ? macCats : winCats;
  for (const strategy of ['one', 'travel', 'workstation']) {
    for (const profile of PROFILES) {
      if (!reach[platform].has(profile)) continue;
      const cats = catsByStrategy[strategy];
      const matches = [];
      for (const cat of cats) {
        for (const l of Data.Laptops) {
          if (l.category !== cat || l.platform !== platform) continue;
          if (strategy !== 'travel' && !l.workloadProfiles.includes(profile)) continue;
          matches.push(l);
        }
      }
      if (!matches.length) {
        flag(`laptops ${platform}/${strategy}/${profile}: no matching laptop at all`);
        continue;
      }
      for (const tier of TIERS) {
        if (strategy === 'travel') continue; // travel features the first match, no budget logic
        const rec = matches.find((l) => l.recommendedFor?.[profile]?.[tier]);
        if (!rec) note(`laptops ${platform}/${strategy}/${profile}/${tier}: no budget-flagged rec; falls back to first match ("${matches[0].name}")`);
        const all = matches.filter((l) => l.recommendedFor?.[profile]?.[tier]);
        if (all.length > 1) note(`laptops ${platform}/${strategy}/${profile}/${tier}: ${all.length} rec badges (${all.map((l) => l.name).join(', ')}) — first one is featured`);
      }
    }
  }
}

// ---- 5. monitor configs available per platform; defaults resolve ----
const monitorById = Object.fromEntries(Data.Monitors.map((m) => [m.id, m]));
function configAvailable(c, platform) {
  return c.monitors.every((id) => {
    const m = monitorById[id];
    return m && (m.platform === 'both' || m.platform === platform);
  });
}
for (const platform of ['win', 'mac']) {
  for (const budget of TIERS) {
    const tier = budget === 'cheapest' ? 'cheapest' : budget === 'best' ? 'overkill' : 'value';
    const avail = Data.MonitorConfigs.filter((c) => configAvailable(c, platform));
    if (!avail.length) { flag(`monitor configs: none available on ${platform}`); continue; }
    const ofTier = avail.filter((c) => c.tier === tier);
    if (!ofTier.length) note(`monitor configs ${platform}/${budget}: no config in tier "${tier}", falls back to first available`);
    else if (!ofTier.some((c) => c.rec)) note(`monitor configs ${platform}/${budget}: tier "${tier}" has no rec-flagged config, first of tier used`);
  }
}
for (const c of Data.MonitorConfigs) {
  for (const id of c.monitors) if (!monitorById[id]) flag(`monitor config "${c.name}": unknown monitor id "${id}"`);
}

// ---- 6. desk hero images exist for every reachable state ----
function classifyMonitorSize(m) {
  if (!m) return null;
  if (m.id === 'muw34' || /\bUW\b/i.test(m.name)) return 'UW';
  if (/\b32\b|\b32"/.test(m.name)) return '32';
  if (/\b27\b|\b27"|Studio Display/.test(m.name)) return '27';
  if (/\b24\b/.test(m.name)) return '27';
  return null;
}
function monitorComboName(ids) {
  if (!ids || !ids.length) return '2x27';
  if (ids.length === 1) return '1x' + (classifyMonitorSize(monitorById[ids[0]]) || '27');
  const sizes = ids.slice(0, 2).map((id) => classifyMonitorSize(monitorById[id]) || '27');
  if (sizes[0] === sizes[1]) return sizes[0] === 'UW' ? '1xUW' : '2x' + sizes[0];
  const s = sizes.slice().sort();
  if (s[0] === '27' && s[1] === '32') return '1x27_1x32';
  return '2x27';
}
const labelFor = { desktop: { mac: 'MacMini', win: 'NorthXL' }, laptop: { mac: 'MBP', win: 'Laptop' }, combo: { mac: 'MacMini', win: 'X1Tower' } };
const checked = new Set();
for (const platform of ['win', 'mac']) {
  const combos = new Set(Data.MonitorConfigs.filter((c) => configAvailable(c, platform)).map((c) => monitorComboName(c.monitors)));
  for (const role of ['desktop', 'laptop', 'combo']) {
    for (const combo of combos) {
      const file = `${labelFor[role][platform]}_${combo}.png`;
      if (checked.has(file)) continue;
      checked.add(file);
      for (const dir of ['assets/desk-images', 'assets/desk-images-dark']) {
        if (!existsSync(join(ROOT, dir, file))) flag(`desk image missing: ${dir}/${file} (falls back to NorthXL_2x27)`);
      }
    }
  }
}

// ---- report ----
console.log(`\n=== PICKER ACCURACY AUDIT ===`);
console.log(`\n${issues.length} issue(s):`);
issues.forEach((m) => console.log('  ✗ ' + m));
console.log(`\n${notes.length} informational note(s):`);
notes.forEach((m) => console.log('  · ' + m));
process.exit(issues.length ? 1 : 0);
