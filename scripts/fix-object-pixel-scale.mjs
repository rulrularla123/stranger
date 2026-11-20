// Draws every map object at its true pixel size (1 sprite pixel = 1 world pixel),
// the same pixel density as the characters and the floor art.
//
//   node scripts/fix-object-pixel-scale.mjs          # apply
//   node scripts/fix-object-pixel-scale.mjs --dry    # list what would change
//
// Before this, most objects were stretched by uneven ratios (1.33x, 1.42x, 1.7x…),
// and some were squashed or stretched in only one direction. With nearest-neighbour
// rendering that gives irregular, chunky pixels next to the crisp 1x characters.
//
// For each object whose drawn size differs from its sprite's size:
//   - floor furniture keeps its bottom-centre (where it stands), so depth order is unchanged;
//   - wall-mounted objects and flat floor decals keep their centre;
//   - the collision box is scaled by the same ratio around the same anchor, so there
//     are no invisible walls around a smaller sprite.
// Interact points are left alone. The floor guide images (public/assets/guides/
// STRANGER-<floor>.png = floor art + objects) are then re-rendered so they match.
// Running it again changes nothing. Run add-object-outlines.mjs first if you re-extract
// the original art with `npm run setup:assets`.
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const MAP_PATH = path.join(PUBLIC, 'assets', 'map.json');
const DRY = process.argv.includes('--dry');

const mapSrc = fs.readFileSync(MAP_PATH, 'utf8');
const map = JSON.parse(mapSrc);
const spriteCache = new Map();

function loadPng(rel) {
  if (!spriteCache.has(rel)) spriteCache.set(rel, PNG.sync.read(fs.readFileSync(path.join(PUBLIC, rel))));
  return spriteCache.get(rel);
}

let changed = 0;
for (const [floorKey, floor] of Object.entries(map.floors)) {
  for (const obj of floor.objects) {
    const sprite = loadPng(obj.sprite);
    const nw = sprite.width;
    const nh = sprite.height;
    if (obj.width === nw && obj.height === nh) continue;

    const kx = nw / obj.width;
    const ky = nh / obj.height;
    const cx = obj.x + obj.width / 2;
    const base = obj.y + obj.height;
    const isFlatDecal = obj.order < obj.y; // drawn under everything (e.g. floor inlays)
    const centreAnchor = Boolean(obj.wall) || isFlatDecal;
    const cy = obj.y + obj.height / 2;

    const next = {
      x: Math.round(cx - nw / 2),
      y: centreAnchor ? Math.round(cy - nh / 2) : base - nh,
      width: nw,
      height: nh,
    };

    let collision = obj.collision;
    if (collision) {
      const [u, v, w, h] = collision;
      const cw = Math.max(2, Math.round(w * kx));
      const ch = Math.max(2, Math.round(h * ky));
      const ccx = cx + (u + w / 2 - cx) * kx;
      let top;
      if (centreAnchor) {
        top = Math.round(cy + (v + h / 2 - cy) * ky - ch / 2);
      } else {
        const bottom = base - (base - (v + h)) * ky;
        top = Math.round(bottom - ch);
      }
      collision = [Math.round(ccx - cw / 2), top, cw, ch];
    }

    changed++;
    console.log(
      `${floorKey} ${obj.id}: ${obj.width}x${obj.height} -> ${nw}x${nh} (x${kx.toFixed(2)}, y${ky.toFixed(2)})` +
        (collision ? ` collision ${JSON.stringify(obj.collision)} -> ${JSON.stringify(collision)}` : '')
    );
    Object.assign(obj, next);
    if (collision) obj.collision = collision;
  }
}

console.log(`${changed} object(s) ${DRY ? 'would be' : ''} resized to native pixel size`);

if (!DRY) {
  if (changed > 0) {
    fs.writeFileSync(MAP_PATH, JSON.stringify(map, null, 2) + (mapSrc.endsWith('\n') ? '\n' : ''));
  }

  // Re-render the floor guide images: floor art + objects at 1:1, back to front.
  for (const [floorKey, floor] of Object.entries(map.floors)) {
    const bg = loadPng(floor.background);
    const out = new PNG({ width: bg.width, height: bg.height });
    bg.data.copy(out.data);
    const objs = [...floor.objects].sort((a, b) => a.order - b.order || a.y - b.y);
    for (const obj of objs) {
      const sp = loadPng(obj.sprite);
      for (let sy = 0; sy < sp.height; sy++) {
        const ty = obj.y + sy;
        if (ty < 0 || ty >= out.height) continue;
        for (let sx = 0; sx < sp.width; sx++) {
          const tx = obj.x + sx;
          if (tx < 0 || tx >= out.width) continue;
          const si = (sy * sp.width + sx) * 4;
          const a = sp.data[si + 3] / 255;
          if (a === 0) continue;
          const ti = (ty * out.width + tx) * 4;
          const ta = out.data[ti + 3] / 255;
          const oa = a + ta * (1 - a);
          for (let c = 0; c < 3; c++) {
            out.data[ti + c] = Math.round((sp.data[si + c] * a + out.data[ti + c] * ta * (1 - a)) / (oa || 1));
          }
          out.data[ti + 3] = Math.round(oa * 255);
        }
      }
    }
    const guidePath = path.join(PUBLIC, 'assets', 'guides', `STRANGER-${floorKey}.png`);
    fs.writeFileSync(guidePath, PNG.sync.write(out));
    console.log(`re-rendered ${path.relative(ROOT, guidePath)}`);
  }
}
