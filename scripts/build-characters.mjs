import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const SOURCE_DIR = path.join(ROOT, 'source');
const OUT_CHAR_DIR = path.join(ROOT, 'public', 'assets', 'characters');
const PREVIEW_DIR = path.join(ROOT, 'docs', 'pixil-contact-sheets');
fs.mkdirSync(OUT_CHAR_DIR, { recursive: true });
fs.mkdirSync(PREVIEW_DIR, { recursive: true });

// Direction mapping verified visually from docs/pixil-contact-sheets/*-raw.png:
// - Doyun (korean_v2): 20 layers -> up(0..4), right(5..9), left(10..14), down(15..19), idle is +4 in each group
// - Maria (phil): 20 layers -> right(0..4), left(5..9), up(10..14), down(15..19), idle is +4 in each group
// - Lin (vietnam): 24 layers -> up(0..4 + hat 5), right(6..10 + hat 11), left(12..16 + hat 17), down(18..22 + hat 23), idle is +4 in each group
// - Aisha (South_Africa_v1): 20 layers -> up(0..4), right(5..9), left(10..14), down(15..19), idle is +4 in each group
const CHARACTER_SPECS = [
  {
    id: 'doyun',
    name: '서하린',
    roleTitle: '엔지니어 · 조작자',
    color: '#FFB86B',
    badge: '⚙',
    file: 'korean_v2 (1).pixil',
    groups: {
      down: { body: [15, 16, 17, 18, 19], hat: null },
      up: { body: [0, 1, 2, 3, 4], hat: null },
      left: { body: [10, 11, 12, 13, 14], hat: null },
      right: { body: [5, 6, 7, 8, 9], hat: null },
    },
  },
  {
    id: 'maria',
    name: '이안',
    roleTitle: '고문서학자 · 통역',
    color: '#E6C886',
    badge: '📜',
    file: 'phil (1).pixil',
    groups: {
      down: { body: [15, 16, 17, 18, 19], hat: null },
      up: { body: [10, 11, 12, 13, 14], hat: null },
      left: { body: [5, 6, 7, 8, 9], hat: null },
      right: { body: [0, 1, 2, 3, 4], hat: null },
    },
    // The drawn right-facing frames drop the flag patch, the book and the skirt detail
    // that the other three directions show, so right = mirror of left.
    consistency: { rightMirrorsLeft: true },
  },
  {
    id: 'lin',
    name: '린',
    roleTitle: '공간측량사 · 네비게이터',
    color: '#52EFBF',
    badge: '🧭',
    file: 'vietnam (1).pixil',
    groups: {
      down: { body: [18, 19, 20, 21, 22], hat: 23 },
      up: { body: [0, 1, 2, 3, 4], hat: 5 },
      left: { body: [12, 13, 14, 15, 16], hat: 17 },
      right: { body: [6, 7, 8, 9, 10], hat: 11 },
    },
    // The drawn right-facing hat sits lower and wider and covers the eyes, unlike the
    // left-facing one, so right = mirror of left.
    consistency: { rightMirrorsLeft: true },
  },
  {
    id: 'aisha',
    name: '카이',
    roleTitle: '유물감식가 · 관측자',
    color: '#7CD8FF',
    badge: '🔍',
    file: 'South_Africa_v1 (1).pixil',
    groups: {
      down: { body: [15, 16, 17, 18, 19], hat: null },
      up: { body: [0, 1, 2, 3, 4], hat: null },
      left: { body: [10, 11, 12, 13, 14], hat: null },
      right: { body: [5, 6, 7, 8, 9], hat: null },
    },
    // From the front and the sides the jacket is black, but the back view was painted
    // white. Repaint the back of the jacket in the jacket colours.
    consistency: {
      upRecolor: [
        [[255, 255, 255], [10, 10, 10]],
        [[219, 219, 219], [48, 48, 48]],
      ],
    },
  },
];

const DIRECTIONS = ['down', 'up', 'left', 'right'];
const FRAME_W = 32;
const FRAME_H = 64;
const FRAMES_PER_DIR = 5; // [walk0, walk1, walk2, walk3, idle]

function decodeLayerPng(src) {
  const b64 = src.includes(',') ? src.split(',', 2)[1] : src;
  return PNG.sync.read(Buffer.from(b64, 'base64'));
}

function alphaCompositeOver(dst, over) {
  const out = new PNG({ width: dst.width, height: dst.height });
  dst.data.copy(out.data);
  for (let i = 0; i < out.data.length; i += 4) {
    const sa = over.data[i + 3] / 255;
    if (sa === 0) continue;
    const da = out.data[i + 3] / 255;
    const oa = sa + da * (1 - sa);
    for (let c = 0; c < 3; c++) {
      out.data[i + c] = Math.round((over.data[i + c] * sa + out.data[i + c] * da * (1 - sa)) / oa);
    }
    out.data[i + 3] = Math.round(oa * 255);
  }
  return out;
}

function copyFrame(src, dst, dx, dy) {
  for (let y = 0; y < src.height; y++) {
    for (let x = 0; x < src.width; x++) {
      const si = (y * src.width + x) * 4;
      const ti = ((dy + y) * dst.width + (dx + x)) * 4;
      dst.data[ti] = src.data[si];
      dst.data[ti + 1] = src.data[si + 1];
      dst.data[ti + 2] = src.data[si + 2];
      dst.data[ti + 3] = src.data[si + 3];
    }
  }
}

function getOpaqueBounds(png) {
  let minX = png.width, minY = png.height, maxX = -1, maxY = -1;
  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      const a = png.data[(y * png.width + x) * 4 + 3];
      if (a > 0) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  return { minX, minY, maxX, maxY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

/** Body layer of one frame with the hat layer (if any) composited on top. */
function composeFrame(rawLayers, grp, fIdx) {
  const body = rawLayers[grp.body[fIdx]];
  return grp.hat !== null ? alphaCompositeOver(body, rawLayers[grp.hat]) : body;
}

/** Horizontal mirror where source column x lands on column (axis2 - x). */
function mirrorFrame(png, axis2) {
  const out = new PNG({ width: png.width, height: png.height });
  out.data.fill(0);
  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      const tx = axis2 - x;
      if (tx < 0 || tx >= png.width) continue;
      const si = (y * png.width + x) * 4;
      const ti = (y * png.width + tx) * 4;
      for (let c = 0; c < 4; c++) out.data[ti + c] = png.data[si + c];
    }
  }
  return out;
}

/** Replace exact RGB colours (opaque pixels only). */
function recolorFrame(png, pairs) {
  const out = new PNG({ width: png.width, height: png.height });
  png.data.copy(out.data);
  for (let i = 0; i < out.data.length; i += 4) {
    if (out.data[i + 3] === 0) continue;
    for (const [[r, g, b], to] of pairs) {
      if (out.data[i] === r && out.data[i + 1] === g && out.data[i + 2] === b) {
        out.data[i] = to[0];
        out.data[i + 1] = to[1];
        out.data[i + 2] = to[2];
        break;
      }
    }
  }
  return out;
}

const atlasW = FRAME_W * DIRECTIONS.length * FRAMES_PER_DIR; // 640
const atlasH = FRAME_H * CHARACTER_SPECS.length; // 256
const atlas = new PNG({ width: atlasW, height: atlasH });
atlas.data.fill(0);

const animMeta = {
  sheet: 'assets/characters/spritesheet.png',
  frameWidth: FRAME_W,
  frameHeight: FRAME_H,
  worldSize: { width: 30, height: 50, footprint: [14, 8] },
  walkSequence: [0, 1, 2, 3],
  idleIndex: 4,
  walkFps: 8,
  directions: DIRECTIONS,
  characters: {},
};

// Preview sheet (3x scale, all 4 chars x 4 dirs x 5 frames with foot line)
const SCALE = 3;
const PREV_PAD = 8;
const preview = new PNG({
  width: atlasW * SCALE + PREV_PAD * 2,
  height: atlasH * SCALE + PREV_PAD * (CHARACTER_SPECS.length + 1),
});
for (let i = 0; i < preview.data.length; i += 4) {
  preview.data[i] = 16;
  preview.data[i + 1] = 20;
  preview.data[i + 2] = 28;
  preview.data[i + 3] = 255;
}

CHARACTER_SPECS.forEach((spec, rowIdx) => {
  const raw = JSON.parse(fs.readFileSync(path.join(SOURCE_DIR, spec.file), 'utf8'));
  const rawLayers = raw.frames[0].layers.map((l) => decodeLayerPng(l.src));
  const rowSheet = new PNG({ width: atlasW, height: FRAME_H });
  rowSheet.data.fill(0);

  let idleFootY = 58;
  let globalMinY = 64;
  let globalMaxY = 0;
  const dirFrames = {};
  const fixes = spec.consistency || {};

  // Mirror axis that keeps the mirrored figure centred where the drawn right-facing one was.
  let mirrorAxis = FRAME_W - 1;
  if (fixes.rightMirrorsLeft) {
    const l = getOpaqueBounds(composeFrame(rawLayers, spec.groups.left, 4));
    const r = getOpaqueBounds(composeFrame(rawLayers, spec.groups.right, 4));
    mirrorAxis = Math.round((l.minX + l.maxX + r.minX + r.maxX) / 2);
  }

  DIRECTIONS.forEach((dir, dirIdx) => {
    const grp = spec.groups[dir];
    dirFrames[dir] = [];

    grp.body.forEach((_layerIdx, fIdx) => {
      let framePng = composeFrame(rawLayers, grp, fIdx);
      if (dir === 'right' && fixes.rightMirrorsLeft) {
        framePng = mirrorFrame(composeFrame(rawLayers, spec.groups.left, fIdx), mirrorAxis);
      }
      if (dir === 'up' && fixes.upRecolor) {
        framePng = recolorFrame(framePng, fixes.upRecolor);
      }
      const bounds = getOpaqueBounds(framePng);
      if (bounds.minY < globalMinY) globalMinY = bounds.minY;
      if (bounds.maxY > globalMaxY) globalMaxY = bounds.maxY;
      if (dir === 'down' && fIdx === 4) {
        idleFootY = bounds.maxY + 1;
      }

      const col = dirIdx * FRAMES_PER_DIR + fIdx;
      const sx = col * FRAME_W;
      const sy = rowIdx * FRAME_H;
      copyFrame(framePng, atlas, sx, sy);
      copyFrame(framePng, rowSheet, sx, 0);

      dirFrames[dir].push({ sx, sy, w: FRAME_W, h: FRAME_H });

      // Blit onto preview
      const px0 = PREV_PAD + sx * SCALE;
      const py0 = PREV_PAD + rowIdx * (FRAME_H * SCALE + PREV_PAD);
      for (let y = 0; y < FRAME_H; y++) {
        for (let x = 0; x < FRAME_W; x++) {
          const si = (y * FRAME_W + x) * 4;
          const a = framePng.data[si + 3] / 255;
          const bg = fIdx === 4 ? [36, 54, 48] : (col % 2 === 0 ? [28, 34, 44] : [34, 41, 52]);
          const r = Math.round(framePng.data[si] * a + bg[0] * (1 - a));
          const g = Math.round(framePng.data[si + 1] * a + bg[1] * (1 - a));
          const b = Math.round(framePng.data[si + 2] * a + bg[2] * (1 - a));
          for (let sy2 = 0; sy2 < SCALE; sy2++) {
            for (let sx2 = 0; sx2 < SCALE; sx2++) {
              const ti = ((py0 + y * SCALE + sy2) * preview.width + (px0 + x * SCALE + sx2)) * 4;
              preview.data[ti] = r;
              preview.data[ti + 1] = g;
              preview.data[ti + 2] = b;
              preview.data[ti + 3] = 255;
            }
          }
        }
      }
    });
  });

  // Draw red foot-baseline line across preview row
  const baseLineY = PREV_PAD + rowIdx * (FRAME_H * SCALE + PREV_PAD) + idleFootY * SCALE;
  for (let x = PREV_PAD; x < preview.width - PREV_PAD; x++) {
    const ti = (baseLineY * preview.width + x) * 4;
    preview.data[ti] = 255;
    preview.data[ti + 1] = 110;
    preview.data[ti + 2] = 110;
    preview.data[ti + 3] = 255;
  }

  fs.writeFileSync(path.join(OUT_CHAR_DIR, `${spec.id}.png`), PNG.sync.write(rowSheet));
  animMeta.characters[spec.id] = {
    id: spec.id,
    name: spec.name,
    roleTitle: spec.roleTitle,
    color: spec.color,
    badge: spec.badge,
    individualSheet: `assets/characters/${spec.id}.png`,
    rowIndex: rowIdx,
    anchorX: 16,
    anchorY: idleFootY,
    opaqueSpanY: [globalMinY, globalMaxY],
    frames: dirFrames,
  };
  console.log(
    `Built ${spec.id} (${spec.name}): footY=${idleFootY}, opaqueY=${globalMinY}..${globalMaxY} (height=${globalMaxY - globalMinY + 1}px)`
  );
});

fs.writeFileSync(path.join(OUT_CHAR_DIR, 'spritesheet.png'), PNG.sync.write(atlas));
fs.writeFileSync(path.join(OUT_CHAR_DIR, 'animations.json'), JSON.stringify(animMeta, null, 2));
fs.writeFileSync(path.join(PREVIEW_DIR, 'verified-spritesheet-preview.png'), PNG.sync.write(preview));
console.log(`Saved spritesheet.png (${atlasW}x${atlasH}) and animations.json`);
