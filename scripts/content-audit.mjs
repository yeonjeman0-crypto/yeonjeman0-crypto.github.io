import { access, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA_DIR = path.join(ROOT, 'data');
const EXPECTED_DOMAIN = 'www.samjoosm-doriko.com';
const issues = [];

const expectedOwnersByVessel = new Map([
  ['AH SHIN', 'SAMJOO MARITIME CO., LTD.'],
  ['GMT ASTRO', 'SAMJOO MARITIME CO., LTD.'],
  ['HAE SHIN', 'SAMJOO MARITIME CO., LTD.'],
  ['SANG SHIN', 'SAMJOO MARITIME CO., LTD.'],
  ['SOO SHIN', 'SAMJOO MARITIME CO., LTD.'],
  ['YOUNG SHIN', 'SAMJOO MARITIME CO., LTD.'],
  ['G POSEIDON', 'GMT'],
  ['SJ BUSAN', 'SAMJOO MARINE CO., LTD.'],
  ['SJ COLOMBO', 'SAMJOO MARITIME CO., LTD.'],
  ['SJ ASIA', 'SAMJOO MARITIME CO., LTD.'],
  ['DAEBO GLADSTONE', 'DAEBO L&S'],
  ['BT TREVIA', 'DAEBO L&S'],
]);

const expectedOwners = [
  'SAMJOO MARITIME CO., LTD.',
  'SAMJOO MARINE CO., LTD.',
  'DAEBO L&S',
  'GMT',
];

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.keys(value).sort().map(key => [key, stable(value[key])]),
  );
}

function sameData(left, right) {
  return JSON.stringify(stable(left)) === JSON.stringify(stable(right));
}

function auditFleet(label, fleet) {
  if (!fleet || !Array.isArray(fleet.vessels)) {
    issues.push(`${label}: vessels must be an array`);
    return;
  }

  const names = new Set();
  for (const vessel of fleet.vessels) {
    if (names.has(vessel.name)) {
      issues.push(`${label}: duplicate vessel name "${vessel.name}"`);
    }
    names.add(vessel.name);

    const expected = expectedOwnersByVessel.get(vessel.name);
    if (!expected) {
      issues.push(`${label}: unexpected vessel "${vessel.name}" needs an audited owner`);
      continue;
    }

    if (vessel.owner !== expected) {
      issues.push(`${label}: ${vessel.name} owner must be "${expected}", found "${vessel.owner}"`);
    }
  }

  for (const expectedName of expectedOwnersByVessel.keys()) {
    if (!names.has(expectedName)) {
      issues.push(`${label}: expected vessel "${expectedName}" is missing`);
    }
  }

  if (!sameData(fleet.owners, expectedOwners)) {
    issues.push(`${label}: owner list must be ${JSON.stringify(expectedOwners)}`);
  }

  const bulk = fleet.vessels.filter(vessel => vessel.type === 'BULK').length;
  const pctc = fleet.vessels.length - bulk;
  const summary = fleet.summary || {};
  if (summary.total !== fleet.vessels.length || summary.bulk !== bulk || summary.pctc !== pctc) {
    issues.push(
      `${label}: summary must match vessels (total ${fleet.vessels.length}, bulk ${bulk}, pctc ${pctc})`,
    );
  }
}

async function parseJsonFiles() {
  const files = (await readdir(DATA_DIR)).filter(file => file.endsWith('.json')).sort();
  const datasets = {};

  for (const file of files) {
    try {
      datasets[path.basename(file, '.json')] = JSON.parse(
        await readFile(path.join(DATA_DIR, file), 'utf8'),
      );
    } catch (error) {
      issues.push(`data/${file}: invalid JSON (${error.message})`);
    }
  }

  return datasets;
}

async function auditRequiredFiles() {
  const required = [
    'CNAME',
    'index.html',
    'policy.html',
    'css/style.css',
    'js/api.js',
    'js/data.js',
    'js/i18n.js',
    'js/icons.js',
    'js/main.js',
  ];

  for (const relativePath of required) {
    try {
      await access(path.join(ROOT, relativePath));
    } catch {
      issues.push(`${relativePath}: required deployment file is missing`);
    }
  }
}

await auditRequiredFiles();

const datasets = await parseJsonFiles();
if (datasets.fleet) auditFleet('data/fleet.json', datasets.fleet);

try {
  const embeddedSource = await readFile(path.join(ROOT, 'js/data.js'), 'utf8');
  const context = { window: {} };
  vm.runInNewContext(embeddedSource, context, { filename: 'js/data.js' });
  const embeddedFleet = context.window.SAMJOO_DATA?.fleet;
  auditFleet('js/data.js', embeddedFleet);

  if (datasets.fleet && embeddedFleet && !sameData(datasets.fleet, embeddedFleet)) {
    issues.push('js/data.js: embedded fleet data does not match data/fleet.json');
  }
} catch (error) {
  issues.push(`js/data.js: could not evaluate embedded data (${error.message})`);
}

try {
  const cname = (await readFile(path.join(ROOT, 'CNAME'), 'utf8')).trim();
  if (cname !== EXPECTED_DOMAIN) {
    issues.push(`CNAME: expected "${EXPECTED_DOMAIN}", found "${cname}"`);
  }
} catch {
  // Missing CNAME is already reported by auditRequiredFiles().
}

try {
  const index = await readFile(path.join(ROOT, 'index.html'), 'utf8');
  const canonical = `https://${EXPECTED_DOMAIN}/`;
  if (!index.includes(`rel="canonical" href="${canonical}"`)) {
    issues.push(`index.html: canonical URL must be ${canonical}`);
  }
  if (!index.includes(`property="og:url" content="${canonical}"`)) {
    issues.push(`index.html: og:url must be ${canonical}`);
  }
} catch {
  // Missing index.html is already reported by auditRequiredFiles().
}

// 방침 페이지는 심사·선주 제출용 고정 URL이므로 canonical과 방침 원문 표기를 함께 고정한다.
try {
  const policy = await readFile(path.join(ROOT, 'policy.html'), 'utf8');
  const canonical = `https://${EXPECTED_DOMAIN}/policy.html`;
  if (!policy.includes(`rel="canonical" href="${canonical}"`)) {
    issues.push(`policy.html: canonical URL must be ${canonical}`);
  }
  for (const marker of ['MM-00 F-5', 'MM-00 F-6', 'MM-00 F-8', 'Rev. 1.2']) {
    if (!policy.includes(marker)) {
      issues.push(`policy.html: policy document marker "${marker}" is missing`);
    }
  }
} catch {
  // Missing policy.html is already reported by auditRequiredFiles().
}

if (issues.length) {
  console.error('Content audit failed:');
  for (const issue of issues) console.error(`- ${issue}`);
  process.exit(1);
}

console.log(`Content audit passed (${Object.keys(datasets).length} JSON datasets checked).`);
