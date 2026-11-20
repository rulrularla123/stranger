// Generates clean transparent upper-body standing illustrations in
// public/assets/characters/story/*.png for the Zombie-High / RPG-Maker story UI.
//
// Usage:
//   node scripts/build-story-portraits.mjs [--raw-dir <dir>] [--preview <out.png>]
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const LD_DIR = path.join(PUBLIC, 'assets', 'characters', 'ld');
const OUT_DIR = path.join(PUBLIC, 'assets', 'characters', 'story');

const rawArgIdx = process.argv.indexOf('--raw-dir');
const RAW_DIR =
  rawArgIdx >= 0 && process.argv[rawArgIdx + 1]
    ? path.resolve(process.argv[rawArgIdx + 1])
    : '/Users/kimmingun/.gemini/antigravity/brain/a9790075-4522-4683-8909-ab76a397d20a/scratch/story-raw';

const previewArgIdx = process.argv.indexOf('--preview');
const PREVIEW_OUT =
  previewArgIdx >= 0 && process.argv[previewArgIdx + 1]
    ? path.resolve(process.argv[previewArgIdx + 1])
    : null;

const TARGET_HEIGHT = 600;

/**
 * Each entry specifies:
 * - src: source PNG path
 * - topFrac / bottomFrac: vertical slice of the source image to keep (1.0 = bottom)
 * - topPadOut: pixels of transparent headroom above top-most foreground pixel in TARGET_HEIGHT
 * - extraSeeds: optional normalized [x, y] interior background pockets (arm bends, hat ribbons)
 */
const PORTRAIT_SPECS = [
  {
    name: 'harin_default',
    src: path.join(LD_DIR, 'korean_harin_ld.png'),
    topFrac: 0.04,
    bottomFrac: 0.56,
    topPadOut: 28,
    extraSeeds: [[0.34, 0.45]],
  },
  {
    name: 'harin_laugh',
    src: path.join(RAW_DIR, 'harin_laugh.png'),
    topFrac: 0.02,
    bottomFrac: 1.0,
    topPadOut: 28,
    extraSeeds: [
      [0.227, 0.474],
      [0.275, 0.482],
    ],
  },
  {
    name: 'harin_surprised',
    src: path.join(RAW_DIR, 'harin_surprised.png'),
    topFrac: 0.02,
    bottomFrac: 1.0,
    topPadOut: 28,
    extraSeeds: [],
  },
  {
    name: 'harin_serious',
    src: path.join(RAW_DIR, 'harin_serious.png'),
    topFrac: 0.02,
    bottomFrac: 1.0,
    topPadOut: 28,
    extraSeeds: [
      [0.275, 0.97],
      [0.727, 0.90],
      [0.702, 0.80],
    ],
  },
  {
    name: 'ian_default',
    src: path.join(LD_DIR, 'phil_ian_ld.png'),
    topFrac: 0.04,
    bottomFrac: 0.57,
    topPadOut: 24,
    extraSeeds: [[0.622, 0.434]],
  },
  {
    name: 'ian_laugh',
    src: path.join(RAW_DIR, 'ian_laugh.png'),
    topFrac: 0.02,
    bottomFrac: 1.0,
    topPadOut: 24,
    extraSeeds: [],
  },
  {
    name: 'ian_worried',
    src: path.join(RAW_DIR, 'ian_worried.png'),
    topFrac: 0.01,
    bottomFrac: 1.0,
    topPadOut: 20,
    extraSeeds: [[0.745, 0.807]],
  },
  {
    name: 'lin_default',
    src: path.join(LD_DIR, 'vietnam_lin_ld.png'),
    topFrac: 0.04,
    bottomFrac: 0.57,
    topPadOut: 18,
    extraSeeds: [
      [0.354, 0.261],
      [0.598, 0.43],
    ],
  },
  {
    name: 'lin_curious',
    src: path.join(RAW_DIR, 'lin_curious.png'),
    topFrac: 0.01,
    bottomFrac: 1.0,
    topPadOut: 18,
    extraSeeds: [[0.68, 0.735]],
  },
  {
    name: 'kai_default',
    src: path.join(LD_DIR, 'south_africa_kai_ld.png'),
    topFrac: 0.04,
    bottomFrac: 0.56,
    topPadOut: 26,
    extraSeeds: [],
  },
  {
    name: 'kai_excited',
    src: path.join(RAW_DIR, 'kai_excited.png'),
    topFrac: 0.01,
    bottomFrac: 1.0,
    topPadOut: 12,
    extraSeeds: [],
  },
  {
    name: 'jiho_shy',
    src: path.join(RAW_DIR, 'jiho_shy.png'),
    topFrac: 0.02,
    bottomFrac: 1.0,
    topPadOut: 28,
    extraSeeds: [],
  },
];

function removeBackground(png, extraSeeds = []) {
  const { width: w, height: h, data } = png;
  const bgMask = new Uint8Array(w * h);

  const isOuterBg = (idx) => {
    const o = idx * 4;
    if (data[o + 3] < 20) return true;
    const r = data[o],
      g = data[o + 1],
      b = data[o + 2];
    const mn = Math.min(r, g, b);
    const mx = Math.max(r, g, b);
    return mn >= 224 && mx - mn <= 24;
  };

  // Flood fill from all 4 edges
  const q = new Int32Array(w * h);
  let qh = 0,
    qt = 0;
  const push = (idx) => {
    if (!bgMask[idx] && isOuterBg(idx)) {
      bgMask[idx] = 1;
      q[qt++] = idx;
    }
  };
  for (let x = 0; x < w; x++) {
    push(x);
    push((h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    push(y * w);
    push(y * w + (w - 1));
  }
  while (qh < qt) {
    const i = q[qh++];
    const x = i % w,
      y = (i - x) / w;
    if (x > 0) push(i - 1);
    if (x + 1 < w) push(i + 1);
    if (y > 0) push(i - w);
    if (y + 1 < h) push(i + w);
  }

  // Flood fill explicit enclosed pockets (stricter neutral-white threshold)
  const isPocketWhite = (idx) => {
    const o = idx * 4;
    const r = data[o],
      g = data[o + 1],
      b = data[o + 2];
    const mn = Math.min(r, g, b);
    const mx = Math.max(r, g, b);
    return mn >= 238 && mx - mn <= 14;
  };
  for (const [nx, ny] of extraSeeds) {
    const sx = Math.max(0, Math.min(w - 1, Math.round(nx * w)));
    const sy = Math.max(0, Math.min(h - 1, Math.round(ny * h)));
    const sIdx = sy * w + sx;
    if (!bgMask[sIdx] && isPocketWhite(sIdx)) {
      bgMask[sIdx] = 1;
      q[qt++] = sIdx;
      while (qh < qt) {
        const i = q[qh++];
        const x = i % w,
          y = (i - x) / w;
        const tryN = (n) => {
          if (!bgMask[n] && isPocketWhite(n)) {
            bgMask[n] = 1;
            q[qt++] = n;
          }
        };
        if (x > 0) tryN(i - 1);
        if (x + 1 < w) tryN(i + 1);
        if (y > 0) tryN(i - w);
        if (y + 1 < h) tryN(i + w);
      }
    }
  }

  // Apply transparent alpha + clean up 1px light JPEG fringe along ink outline
  for (let i = 0; i < w * h; i++) {
    const o = i * 4;
    if (bgMask[i]) {
      data[o + 3] = 0;
      continue;
    }
    const x = i % w,
      y = (i - x) / w;
    const adjBg =
      (x > 0 && bgMask[i - 1]) ||
      (x + 1 < w && bgMask[i + 1]) ||
      (y > 0 && bgMask[i - w]) ||
      (y + 1 < h && bgMask[i + w]);
    if (adjBg) {
      const r = data[o],
        g = data[o + 1],
        b = data[o + 2];
      const lum = (r + g + b) / 3;
      const sat = Math.max(r, g, b) - Math.min(r, g, b);
      if (lum > 180 && sat < 24) {
        // Soften bright anti-aliased white halo without erasing dark outline
        const alpha = Math.max(0, Math.min(255, Math.round(((235 - lum) / 55) * 255)));
        data[o + 3] = Math.min(data[o + 3], alpha);
      }
    }
  }
}

function cropAndScale(png, spec) {
  const { width: sw, height: sh, data: src } = png;
  const cropTopLimit = Math.max(0, Math.floor(spec.topFrac * sh));
  const cropBotLimit = Math.min(sh, Math.ceil(spec.bottomFrac * sh));

  let minX = sw,
    maxX = -1,
    minY = cropBotLimit,
    maxY = -1;
  for (let y = cropTopLimit; y < cropBotLimit; y++) {
    for (let x = 0; x < sw; x++) {
      if (src[(y * sw + x) * 4 + 3] > 24) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < minX || maxY < minY) {
    throw new Error(`No foreground pixels found for ${spec.name}`);
  }

  const fgW = maxX - minX + 1;
  const fgH = maxY - minY + 1;
  const outH = TARGET_HEIGHT;
  const usableH = outH - spec.topPadOut;
  const scale = usableH / fgH;
  const scaledW = Math.ceil(fgW * scale);
  const padX = 16;
  const outW = scaledW + padX * 2;

  const out = new PNG({ width: outW, height: outH });
  const dst = out.data;

  const sampleBilinear = (fx, fy, c) => {
    const sx0 = Math.max(minX, Math.min(maxX, Math.floor(fx)));
    const sx1 = Math.max(minX, Math.min(maxX, sx0 + 1));
    const sy0 = Math.max(minY, Math.min(maxY, Math.floor(fy)));
    const sy1 = Math.max(minY, Math.min(maxY, sy0 + 1));
    const tx = fx - Math.floor(fx);
    const ty = fy - Math.floor(fy);
    const v00 = src[(sy0 * sw + sx0) * 4 + c];
    const v10 = src[(sy0 * sw + sx1) * 4 + c];
    const v01 = src[(sy1 * sw + sx0) * 4 + c];
    const v11 = src[(sy1 * sw + sx1) * 4 + c];
    const top = v00 + (v10 - v00) * tx;
    const bot = v01 + (v11 - v01) * tx;
    return top + (bot - top) * ty;
  };

  for (let dy = spec.topPadOut; dy < outH; dy++) {
    const sy = minY + (dy - spec.topPadOut + 0.5) / scale - 0.5;
    if (sy < minY - 0.5 || sy > maxY + 0.5) continue;
    for (let dx = padX; dx < outW - padX; dx++) {
      const sx = minX + (dx - padX + 0.5) / scale - 0.5;
      if (sx < minX - 0.5 || sx > maxX + 0.5) continue;
      // Premultiplied alpha interpolation prevents dark/white fringe artifacts
      const a00 = src[(Math.max(minY, Math.min(maxY, Math.floor(sy))) * sw + Math.max(minX, Math.min(maxX, Math.floor(sx)))) * 4 + 3];
      const a = sampleBilinear(sx, sy, 3);
      if (a < 4 && a00 < 4) continue;
      const o = (dy * outW + dx) * 4;
      dst[o] = Math.round(sampleBilinear(sx, sy, 0));
      dst[o + 1] = Math.round(sampleBilinear(sx, sy, 1));
      dst[o + 2] = Math.round(sampleBilinear(sx, sy, 2));
      dst[o + 3] = Math.round(a);
    }
  }

  return out;
}

fs.mkdirSync(OUT_DIR, { recursive: true });
const built = [];

for (const spec of PORTRAIT_SPECS) {
  if (!fs.existsSync(spec.src)) {
    console.warn(`[skip] missing source: ${spec.src}`);
    continue;
  }
  const png = PNG.sync.read(fs.readFileSync(spec.src));
  removeBackground(png, spec.extraSeeds);
  const out = cropAndScale(png, spec);
  const outPath = path.join(OUT_DIR, `${spec.name}.png`);
  fs.writeFileSync(outPath, PNG.sync.write(out));
  built.push({ name: spec.name, png: out });
  console.log(`Built ${spec.name}.png (${out.width}x${out.height})`);
}

if (PREVIEW_OUT && built.length > 0) {
  const cols = 4;
  const rows = Math.ceil(built.length / cols);
  const cellW = 460;
  const cellH = 620;
  const sheet = new PNG({ width: cols * cellW, height: rows * cellH });
  for (let i = 0; i < sheet.width * sheet.height; i++) {
    const o = i * 4;
    sheet.data[o] = 18;
    sheet.data[o + 1] = 26;
    sheet.data[o + 2] = 38;
    sheet.data[o + 3] = 255;
  }
  built.forEach(({ png }, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const ox = col * cellW + Math.round((cellW - png.width) / 2);
    const oy = row * cellH + (cellH - png.height);
    for (let y = 0; y < png.height; y++) {
      const ty = oy + y;
      if (ty < 0 || ty >= sheet.height) continue;
      for (let x = 0; x < png.width; x++) {
        const tx = ox + x;
        if (tx < 0 || tx >= sheet.width) continue;
        const so = (y * png.width + x) * 4;
        const sa = png.data[so + 3] / 255;
        if (sa <= 0) continue;
        const to = (ty * sheet.width + tx) * 4;
        sheet.data[to] = Math.round(png.data[so] * sa + sheet.data[to] * (1 - sa));
        sheet.data[to + 1] = Math.round(png.data[so + 1] * sa + sheet.data[to + 1] * (1 - sa));
        sheet.data[to + 2] = Math.round(png.data[so + 2] * sa + sheet.data[to + 2] * (1 - sa));
      }
    }
  });
  fs.mkdirSync(path.dirname(PREVIEW_OUT), { recursive: true });
  fs.writeFileSync(PREVIEW_OUT, PNG.sync.write(sheet));
  console.log(`Wrote preview sheet: ${PREVIEW_OUT}`);
}
