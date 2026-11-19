// Adds a 1px dark outline to map object sprites that lack one, so they match the
// outlined character sprites.
//
//   node scripts/add-object-outlines.mjs          # apply
//   node scripts/add-object-outlines.mjs --dry    # list what would change
//
// For each listed sprite the PNG is padded by 1 native pixel on every side and the
// outline is drawn on the transparent pixels that touch the silhouette. Every map
// object using the sprite is marked `"outlined": true` and its x/y/width/height are
// grown by the padding, so the artwork itself stays where it was. Running it again
// skips anything already marked. NOTE: `npm run setup:assets` re-extracts the original
// art from the zip, so run this script again after it.
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const ASSETS = path.join(ROOT, 'public', 'assets');
const MAP_PATH = path.join(ASSETS, 'map.json');
const DRY = process.argv.includes('--dry');

// Sprites whose silhouette edge was < 60% dark outline when scanned (see PR description).
// Flat floor decals (inlay-1..4, gallery-spot) are intentionally left out.
const SPRITES = [
  'accession-folio', 'archive-frame', 'archive-photo', 'bahay-painting', 'basket-case',
  'b1-sealed-crate', 'b1-steel-rack', 'b1-steel-worktable', 'boat-case', 'brass-sconce',
  'coastal-painting', 'colonial-painting', 'compact-pottery', 'conservation-desk',
  'document-display', 'document-rack', 'embroidered-banner', 'event-cards', 'heritage-flag',
  'heritage-jar', 'historic-city-painting', 'lab-equipment-table', 'marble-statue', 'optics',
  'pottery-catalog', 'rope-crate', 'stone-bust-case', 'street-model', 'terracotta-planter',
  'textile-loom', 'trade-case',
];

const WOOD = [40, 24, 16]; // matches existing outlines on wooden/stone sprites
const METAL = [24, 32, 40]; // matches existing outlines on B1 metal sprites
const SOLID = 128; // alpha at/above which a pixel counts as part of the silhouette

function outlineSprite(file, color) {
  const src = PNG.sync.read(fs.readFileSync(file));
  const { width: w, height: h, data } = src;
  const out = new PNG({ width: w + 2, height: h + 2 });
  const alphaAt = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : data[(y * w + x) * 4 + 3]);
  for (let y = -1; y <= h; y++) {
    for (let x = -1; x <= w; x++) {
      const o = ((y + 1) * (w + 2) + (x + 1)) * 4;
      if (alphaAt(x, y) >= SOLID) {
        const i = (y * w + x) * 4;
        out.data[o] = data[i];
        out.data[o + 1] = data[i + 1];
        out.data[o + 2] = data[i + 2];
        out.data[o + 3] = 255;
      } else if (
        alphaAt(x - 1, y) >= SOLID || alphaAt(x + 1, y) >= SOLID ||
        alphaAt(x, y - 1) >= SOLID || alphaAt(x, y + 1) >= SOLID
      ) {
        out.data[o] = color[0];
        out.data[o + 1] = color[1];
        out.data[o + 2] = color[2];
        out.data[o + 3] = 255;
      }
    }
  }
  return { png: out, w, h };
}

const mapSrc = fs.readFileSync(MAP_PATH, 'utf8');
const map = JSON.parse(mapSrc);
let sprites = 0;
let objects = 0;

for (const name of SPRITES) {
  const rel = `assets/sprites/${name}.png`;
  const users = Object.values(map.floors).flatMap((f) => f.objects).filter((o) => o.sprite === rel);
  const todo = users.filter((o) => !o.outlined);
  if (todo.length === 0) continue;
  if (todo.length !== users.length) throw new Error(`${name}: sprite only partly outlined, aborting`);

  const file = path.join(ASSETS, 'sprites', `${name}.png`);
  const { png, w, h } = outlineSprite(file, name.startsWith('b1-') ? METAL : WOOD);
  for (const o of todo) {
    const padX = Math.max(1, Math.floor(o.width / w));
    const padY = Math.max(1, Math.floor(o.height / h));
    o.x -= padX;
    o.y -= padY;
    o.width += padX * 2;
    o.height += padY * 2;
    o.outlined = true;
    objects++;
  }
  sprites++;
  console.log(`${DRY ? '[dry] ' : ''}${name}: ${w}x${h} -> ${w + 2}x${h + 2}, ${todo.length} object(s)`);
  if (!DRY) fs.writeFileSync(file, PNG.sync.write(png));
}

if (!DRY) fs.writeFileSync(MAP_PATH, JSON.stringify(map, null, 2) + (mapSrc.endsWith('\n') ? '\n' : ''));
console.log(`${sprites} sprite(s), ${objects} object(s) ${DRY ? 'would be ' : ''}updated`);
