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

// Verify map.json sprites
const mapJson = JSON.parse(fs.readFileSync(path.join(PUBLIC_ASSETS, 'map.json'), 'utf8'));
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
