/**
 * Repairs upper-wall walkability overhangs, removes all transparent-void walkable
 * pixels in 2F atrium, rebuilds the 2F atrium outline polygon, tightens 2F doorway
 * portals/corridors, regenerates `*-walkable.png` masks, and verifies 100% reachability
 * for all spawns, portals, and 69 puzzle objects.
 */
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const ASSETS = path.join(ROOT, 'public', 'assets');
const MAP_PATH = path.join(ASSETS, 'map.json');

const map = JSON.parse(fs.readFileSync(MAP_PATH, 'utf8'));
const W = map.width;
const H = map.height;

function spansToGrid(walkableRows) {
  const g = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) {
    for (const [s, e] of walkableRows[y] || []) {
      const x0 = Math.max(0, s);
      const x1 = Math.min(W, e);
      for (let x = x0; x < x1; x++) g[y * W + x] = 1;
    }
  }
  return g;
}

function gridToSpans(g) {
  const rows = [];
  for (let y = 0; y < H; y++) {
    const rowSpans = [];
    let start = -1;
    for (let x = 0; x < W; x++) {
      const v = g[y * W + x];
      if (v && start === -1) start = x;
      else if (!v && start !== -1) {
        rowSpans.push([start, x]);
        start = -1;
      }
    }
    if (start !== -1) rowSpans.push([start, W]);
    rows.push(rowSpans);
  }
  return rows;
}

function clipRectRangeY(g, rx0, rx1, yStart, yEnd) {
  for (let y = Math.max(0, yStart); y < Math.min(H, yEnd); y++) {
    for (let x = rx0; x < rx1; x++) {
      g[y * W + x] = 0;
    }
  }
}

function pointInPolygon(px, py, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// ---------------------------------------------------------------------------
// 1. 1F Walkability Upper-Wall Fix
// ---------------------------------------------------------------------------
{
  const fl = map.floors['1F'];
  const g = spansToGrid(fl.walkableRows);

  // 1F/hall: non-stair areas [741..899) and [1005..1168) clip above y=1027
  clipRectRangeY(g, 740, 899, 960, 1027);
  clipRectRangeY(g, 1005, 1170, 960, 1027);

  // 1F/life & 1F/time: clip above y=1028
  clipRectRangeY(g, 320, 742, 980, 1028);
  clipRectRangeY(g, 1158, 1580, 980, 1028);

  // 1F/craft & 1F/city: clip above y=1359
  clipRectRangeY(g, 320, 742, 1300, 1359);
  clipRectRangeY(g, 1158, 1580, 1300, 1359);

  const png1 = PNG.sync.read(fs.readFileSync(path.join(ROOT, 'public', fl.background)));
  for (let i = 0; i < W * H; i++) {
    if (g[i] && png1.data[i * 4 + 3] < 128) g[i] = 0;
  }

  fl.walkableRows = gridToSpans(g);
}

// ---------------------------------------------------------------------------
// 2. 2F Atrium Arch + Corridors + Archive/Preserve/Reading/Special Fix
// ---------------------------------------------------------------------------
{
  const fl = map.floors['2F'];
  const g = spansToGrid(fl.walkableRows);
  const png2 = PNG.sync.read(fs.readFileSync(path.join(ROOT, 'public', fl.background)));

  // Step 2a: Rectangular rooms upper baseboards
  clipRectRangeY(g, 355, 825, 0, 101);
  clipRectRangeY(g, 1078, 1550, 0, 101);
  clipRectRangeY(g, 110, 535, 500, 582);
  clipRectRangeY(g, 1365, 1795, 500, 582);

  // Step 2b: Archive/preserve exits below y=336: keep ONLY exact doorway columns
  // [627..684) and [1217..1274), remove diagonal wall overhang outside them
  for (let y = 336; y <= 385; y++) {
    for (let x = 580; x <= 730; x++) {
      g[y * W + x] = x >= 627 && x < 684 && png2.data[(y * W + x) * 4 + 3] >= 128 ? 1 : 0;
    }
    for (let x = 1170; x <= 1320; x++) {
      g[y * W + x] = x >= 1217 && x < 1274 && png2.data[(y * W + x) * 4 + 3] >= 128 ? 1 : 0;
    }
  }

  // Step 2c: Measure symmetric curved floor arch top for 2F/atrium (x in [536..1364])
  const rawArchFloorTop = new Map();
  for (let x = 536; x <= 1364; x++) {
    let found = null;
    for (let y = 630; y >= 330; y--) {
      const idx = (y * W + x) * 4;
      const r = png2.data[idx];
      const gr = png2.data[idx + 1];
      const b = png2.data[idx + 2];
      const a = png2.data[idx + 3];
      const isCarpet = r > 100 && r - gr > 40;
      const isDarkBaseboard = a >= 128 && !isCarpet && r < 105 && gr < 85 && b < 72;
      if (a < 128 || isDarkBaseboard) {
        found = y + 1;
        break;
      }
    }
    if (found !== null) rawArchFloorTop.set(x, found);
  }

  const archTop = new Map();
  for (let x = 536; x <= 1364; x++) {
    const mirrorX = 1900 - x;
    const yLeft = rawArchFloorTop.get(x);
    const yRight = rawArchFloorTop.get(mirrorX);
    let yVal;
    if (x >= 900 && x <= 1000) {
      yVal = 428;
    } else if ((x >= 627 && x < 700) || (x > 1200 && x <= 1273)) {
      const dx = Math.abs(x - 950) / 410;
      yVal = Math.round(428 + 168 * Math.pow(dx, 2.35));
    } else {
      const candidates = [yLeft, yRight].filter((v) => typeof v === 'number' && v >= 425 && v <= 610);
      if (candidates.length > 0) {
        yVal = Math.max(...candidates) + 2;
      } else {
        const dx = Math.abs(x - 950) / 410;
        yVal = Math.round(428 + 168 * Math.pow(dx, 2.35));
      }
    }
    archTop.set(x, yVal);
  }

  // Clamp atrium floor strictly under archTop, except inside the 2 straight vertical corridors
  for (let y = 336; y < 640; y++) {
    for (let x = 536; x <= 1364; x++) {
      const inLeft = x >= 627 && x < 684 && y >= 376 && y <= 515;
      const inRight = x >= 1217 && x < 1274 && y >= 376 && y <= 515;
      if (inLeft || inRight) {
        if (png2.data[(y * W + x) * 4 + 3] >= 128) g[y * W + x] = 1;
        continue;
      }
      const limitY = archTop.get(x) ?? 430;
      if (y < limitY) g[y * W + x] = 0;
    }
  }

  // Final sweep on 2F: eliminate EVERY walkable pixel sitting on transparent void
  let strippedVoid2F = 0;
  for (let i = 0; i < W * H; i++) {
    if (g[i] && png2.data[i * 4 + 3] < 128) {
      g[i] = 0;
      strippedVoid2F++;
    }
  }
  console.log('Stripped transparent-void pixels on 2F:', strippedVoid2F);

  fl.walkableRows = gridToSpans(g);

  // Align 2F archive-door / preserve-door rects and arrivals cleanly within corridors
  for (const pt of fl.portals) {
    if (pt.id === 'archive-door') pt.rect = [627, 399, 57, 44];
    if (pt.id === 'preserve-door') pt.rect = [1217, 399, 57, 44];
    if (pt.id === 'archive-return') pt.arrival = [655, 456];
    if (pt.id === 'preserve-return') pt.arrival = [1245, 456];
  }

  // Rebuild 2F atrium outline polygon with slight outer tolerance along corridors/arch
  const atriumRoom = fl.rooms.find((r) => r.id === 'atrium');
  if (atriumRoom) {
    const poly = [];
    for (let x = 1364; x >= 536; x -= 12) {
      if ((x >= 1217 && x <= 1274) || (x >= 627 && x <= 684)) continue;
      poly.push([x, (archTop.get(x) ?? 430) - 2]);
    }
    const refined = [];
    let addedRight = false;
    let addedLeft = false;
    for (const [px, py] of poly) {
      if (!addedRight && px < 1217) {
        refined.push(
          [1276, archTop.get(1276) ?? 498],
          [1276, 374],
          [1215, 374],
          [1215, (archTop.get(1215) ?? 475) - 2]
        );
        addedRight = true;
      }
      if (!addedLeft && px < 627) {
        refined.push(
          [686, (archTop.get(686) ?? 475) - 2],
          [686, 374],
          [625, 374],
          [625, archTop.get(625) ?? 498]
        );
        addedLeft = true;
      }
      refined.push([px, py]);
    }
    refined.push([535, 661], [534, 661], [534, 725], [535, 725], [535, 814]);
    refined.push([900, 814], [900, 836], [1005, 836], [1005, 814]);
    refined.push([1365, 814], [1365, 725], [1366, 725], [1366, 661], [1365, 661]);
    atriumRoom.outline = refined;
    console.log('Rebuilt 2F atrium outline points:', refined.length);
  }
}

// ---------------------------------------------------------------------------
// 3. B1 Walkability Upper-Wall Fix
// ---------------------------------------------------------------------------
{
  const fl = map.floors['B1'];
  const g = spansToGrid(fl.walkableRows);
  const pngB1 = PNG.sync.read(fs.readFileSync(path.join(ROOT, 'public', fl.background)));

  clipRectRangeY(g, 605, 815, 780, 838);
  clipRectRangeY(g, 815, 1686, 800, 862);
  clipRectRangeY(g, 1685, 2005, 840, 896);
  clipRectRangeY(g, 1685, 2005, 1140, 1196);

  for (let i = 0; i < W * H; i++) {
    if (g[i] && pngB1.data[i * 4 + 3] < 128) g[i] = 0;
  }

  fl.walkableRows = gridToSpans(g);
}

// ---------------------------------------------------------------------------
// 4. Regenerate *-walkable.png masks & verify 100% reachability
// ---------------------------------------------------------------------------
const [fw, fh] = map.player.footprint;
const inspectRadius = map.player.inspectRadius || 42;

function canStand(fl, x, y) {
  const l = Math.floor(x - fw / 2);
  const r = Math.ceil(x + fw / 2);
  const t = Math.floor(y - fh / 2);
  const b = Math.ceil(y + fh / 2);
  for (let row = t; row <= b; row++) {
    const sp = fl.walkableRows[row];
    if (!sp || !sp.some(([s, e]) => l >= s && r < e)) return false;
  }
  for (const o of fl.objects) {
    if (!o.collision) continue;
    const [u, v, w, h] = o.collision;
    if (l < u + w && r >= u && t < v + h && b >= v) return false;
  }
  return true;
}

let adjustedInteracts = 0;
const errors = [];

for (const [fk, fl] of Object.entries(map.floors)) {
  const walkPng = new PNG({ width: W, height: H });
  for (let y = 0; y < H; y++) {
    for (const [s, e] of fl.walkableRows[y] || []) {
      for (let x = s; x < e; x++) {
        const idx = (y * W + x) * 4;
        walkPng.data[idx] = 255;
        walkPng.data[idx + 1] = 255;
        walkPng.data[idx + 2] = 255;
        walkPng.data[idx + 3] = 255;
      }
    }
  }
  fs.writeFileSync(path.join(ROOT, 'public', fl.walkability), PNG.sync.write(walkPng));

  const bgPng = PNG.sync.read(fs.readFileSync(path.join(ROOT, 'public', fl.background)));
  let voidWalk = 0;
  for (let y = 0; y < H; y++) {
    for (const [s, e] of fl.walkableRows[y] || []) {
      for (let x = s; x < e; x++) {
        if (bgPng.data[(y * W + x) * 4 + 3] < 128) voidWalk++;
      }
    }
  }
  if (voidWalk > 0) errors.push(`${fk} has ${voidWalk} walkable pixels on transparent void`);

  const reachablePts = [];
  for (const [sid] of Object.entries(fl.scenes)) {
    const pt = fl.portals.find((p) => p.targetFloor === fk && p.targetScene === sid);
    let seed = sid === fl.defaultScene ? fl.spawn : pt?.arrival;
    if (!seed) continue;
    if (!canStand(fl, seed[0], seed[1])) {
      let fixedSeed = null;
      for (let dy = 0; dy <= 16 && !fixedSeed; dy += 2) {
        for (const sy of [seed[1] + dy, seed[1] - dy]) {
          for (let dx = -8; dx <= 8; dx += 2) {
            if (canStand(fl, seed[0] + dx, sy)) {
              fixedSeed = [seed[0] + dx, sy];
              break;
            }
          }
          if (fixedSeed) break;
        }
      }
      if (!fixedSeed) {
        errors.push(`${fk}/${sid} seed ${JSON.stringify(seed)} cannot stand!`);
        continue;
      }
      if (sid === fl.defaultScene) fl.spawn = fixedSeed;
      else if (pt) pt.arrival = fixedSeed;
      seed = fixedSeed;
    }

    const step = 4;
    const start = [Math.round(seed[0] / step) * step, Math.round(seed[1] / step) * step];
    let snapStart = null;
    for (const ox of [0, step, -step]) {
      for (const oy of [0, step, -step]) {
        if (canStand(fl, start[0] + ox, start[1] + oy)) {
          snapStart = [start[0] + ox, start[1] + oy];
          break;
        }
      }
      if (snapStart) break;
    }
    if (!snapStart) snapStart = seed;

    const vis = new Set([snapStart.join(',')]);
    const q = [snapStart];
    while (q.length) {
      const [cx, cy] = q.pop();
      reachablePts.push({ scene: sid, x: cx, y: cy });
      for (const [dx, dy] of [
        [step, 0],
        [-step, 0],
        [0, step],
        [0, -step],
      ]) {
        const nx = cx + dx;
        const ny = cy + dy;
        const k = `${nx},${ny}`;
        if (!vis.has(k) && canStand(fl, nx, ny)) {
          vis.add(k);
          q.push([nx, ny]);
        }
      }
    }
  }

  for (const pt of fl.portals) {
    const [rx, ry, rw, rh] = pt.rect;
    const hit = reachablePts.some(
      (p) => p.x >= rx - 10 && p.x < rx + rw + 10 && p.y >= ry - 10 && p.y < ry + rh + 10
    );
    if (!hit) errors.push(`${fk} portal ${pt.id} rect=${JSON.stringify(pt.rect)} unreachable!`);
  }

  for (const obj of fl.objects) {
    if (!Array.isArray(obj.puzzles) || obj.puzzles.length === 0 || !obj.interact) continue;
    const [ix, iy] = obj.interact;
    let bestDist = Infinity;
    let nearest = null;
    for (const p of reachablePts) {
      const d = Math.hypot(p.x - ix, p.y - iy);
      if (d < bestDist) {
        bestDist = d;
        nearest = p;
      }
    }
    if (bestDist > inspectRadius - 6) {
      if (nearest && bestDist <= inspectRadius + 24) {
        obj.interact = [ix, Math.round(nearest.y)];
        adjustedInteracts++;
      } else {
        errors.push(`${fk}/${obj.id} interact=${JSON.stringify(obj.interact)} unreachable (${bestDist.toFixed(1)})`);
      }
    }
  }
}

// Verify 2F atrium outline contains archive-return & preserve-return arrivals (all 4 footprint corners)
const atrOutline = map.floors['2F'].rooms.find((r) => r.id === 'atrium').outline;
for (const pid of ['archive-return', 'preserve-return', 'reading-return', 'special-return']) {
  const pt = map.floors['2F'].portals.find((p) => p.id === pid);
  const [ax, ay] = pt.arrival;
  const corners = [
    [ax - fw / 2, ay - fh / 2],
    [ax + fw / 2, ay - fh / 2],
    [ax - fw / 2, ay + fh / 2],
    [ax + fw / 2, ay + fh / 2],
  ];
  const inside = corners.every(([cx, cy]) => pointInPolygon(cx, cy, atrOutline));
  if (!inside) errors.push(`2F ${pid} arrival ${JSON.stringify(pt.arrival)} not cleanly inside atrium outline`);
}

fs.writeFileSync(MAP_PATH, JSON.stringify(map, null, 2) + '\n', 'utf8');
console.log({ adjustedInteracts, errors });
if (errors.length > 0) process.exit(1);
