import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const ZIP_PATH = path.join(ROOT, 'source', 'STRANGER-Latest.zip');
const TMP_DIR = path.join(ROOT, '.tmp-extract');
const PUBLIC_ASSETS = path.join(ROOT, 'public', 'assets');
const PUBLIC_GUIDES = path.join(PUBLIC_ASSETS, 'guides');
const DOCS_DIR = path.join(ROOT, 'docs');

fs.rmSync(TMP_DIR, { recursive: true, force: true });
fs.mkdirSync(TMP_DIR, { recursive: true });
execFileSync('unzip', ['-q', '-o', ZIP_PATH, '-d', TMP_DIR], { stdio: 'inherit' });

const srcRoot = path.join(TMP_DIR, 'STRANGER-Latest');
fs.mkdirSync(PUBLIC_ASSETS, { recursive: true });
fs.mkdirSync(PUBLIC_GUIDES, { recursive: true });
fs.mkdirSync(DOCS_DIR, { recursive: true });

// Copy STRANGER-Latest/assets/** -> public/assets/**
fs.cpSync(path.join(srcRoot, 'assets'), PUBLIC_ASSETS, { recursive: true, force: true });

// Copy visual guides
for (const name of [
  'STRANGER-1F.png',
  'STRANGER-2F.png',
  'STRANGER-B1.png',
  'STRANGER-Portal-Guide.png',
  'STRANGER-Overview.png',
]) {
  const from = path.join(srcRoot, name);
  if (fs.existsSync(from)) {
    fs.copyFileSync(from, path.join(PUBLIC_GUIDES, name));
  }
}

// Copy puzzle design spec
const specSrc = path.join(srcRoot, 'STRANGER-Puzzle-UI-Design.md');
if (fs.existsSync(specSrc)) {
  fs.copyFileSync(specSrc, path.join(DOCS_DIR, 'STRANGER-Puzzle-UI-Design.md'));
}

const SPEC_OBJECT_PATCHES = {
  B1: {
    'maint-conduit-2': { puzzles: [7], role: '네비게이터(린) · 수압 계통도 단서', interact: [1458, 868] },
    'maint-pump-ne': { puzzles: [7], role: '조작자(서하린) · 바이패스 가압 펌프', interact: [1636, 892] },
    'power-ups-e2': { puzzles: [9], role: '네비게이터(린) · 우회 모선 단서', interact: [1958, 1012] },
    'rescue-crate-sw2': { puzzles: [10], role: '엔지니어(서하린) · 방수 걸쇠 체결', interact: [1774, 1334] },
  },
  '2F': {
    'archive-long-ne': { puzzles: [11], role: '엔지니어(서하린) · 바이바이인 기준 각도', interact: [718, 124] },
    'archive-shelf-nw2': { puzzles: [12], role: '통역(이안) · 기증 등록대장 원본', interact: [465, 126] },
    'preserve-cabinet-2': { puzzles: [13], role: '엔지니어(서하린) · 시약 밸브 개방', interact: [1176, 126] },
    'preserve-crate-se': { puzzles: [14], role: '엔지니어(서하린) · 로프 순서 단서', interact: [1478, 272] },
    'reading-side-desk-w': { puzzles: [15], role: '통역(이안) · 고서 지명 색인', interact: [155, 735] },
    'atrium-bust-l': { puzzles: [16], role: '4인 전원 · P16 2부 대관식 집결', interact: [885, 488] },
    'atrium-bust-r': { puzzles: [16], role: '4인 전원 · P16 2부 대관식 집결', interact: [1015, 488] },
  },
};

// Verify map.json sprites and apply spec puzzle bindings
const mapJsonPath = path.join(PUBLIC_ASSETS, 'map.json');
const mapJson = JSON.parse(fs.readFileSync(mapJsonPath, 'utf8'));
for (const [floorKey, objPatches] of Object.entries(SPEC_OBJECT_PATCHES)) {
  const fl = mapJson.floors[floorKey];
  if (!fl) continue;
  for (const obj of fl.objects) {
    const patch = objPatches[obj.id];
    if (patch) Object.assign(obj, patch);
  }
}

const LEGACY_NAME_REPLACEMENTS = [
  ['\uB9C8\uB9AC\uC544\uAC00', '이안이'],
  ['\uB9C8\uB9AC\uC544\uB294', '이안은'],
  ['\uB9C8\uB9AC\uC544\uB97C', '이안을'],
  ['\uB9C8\uB9AC\uC544\uC640', '이안과'],
  ['\uB9C8\uB9AC\uC544', '이안'],
  ['\uB3C4\uC724', '서하린'],
  ['\uC544\uC774\uC0E4', '카이'],
];

function normalizeLegacyNames(node) {
  if (typeof node === 'string') {
    let s = node;
    for (const [from, to] of LEGACY_NAME_REPLACEMENTS) s = s.split(from).join(to);
    return s;
  }
  if (Array.isArray(node)) return node.map(normalizeLegacyNames);
  if (node && typeof node === 'object') {
    for (const k of Object.keys(node)) node[k] = normalizeLegacyNames(node[k]);
    return node;
  }
  return node;
}

normalizeLegacyNames(mapJson);
fs.writeFileSync(mapJsonPath, JSON.stringify(mapJson, null, 2) + '\n', 'utf8');
const missingSprites = new Set();
const allSprites = new Set();
for (const [floorKey, floor] of Object.entries(mapJson.floors)) {
  for (const bg of [floor.background, floor.walkability]) {
    const p = path.join(ROOT, 'public', bg);
    if (!fs.existsSync(p)) missingSprites.add(`${floorKey}:${bg}`);
  }
  for (const obj of floor.objects) {
    allSprites.add(obj.sprite);
    const p = path.join(ROOT, 'public', obj.sprite);
    if (!fs.existsSync(p)) missingSprites.add(`${floorKey}:${obj.id}:${obj.sprite}`);
  }
}

fs.rmSync(TMP_DIR, { recursive: true, force: true });

const spriteFiles = fs.readdirSync(path.join(PUBLIC_ASSETS, 'sprites')).filter((f) => f.endsWith('.png'));
console.log(`Extracted assets to public/assets/`);
console.log(`  Sprites on disk: ${spriteFiles.length}`);
console.log(`  Sprites referenced by map.json: ${allSprites.size}`);
console.log(`  Missing sprites: ${missingSprites.size}`);
if (missingSprites.size > 0) {
  console.error('Missing:', [...missingSprites]);
  process.exit(1);
}
