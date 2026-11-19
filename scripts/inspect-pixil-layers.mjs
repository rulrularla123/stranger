import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const SOURCE_DIR = path.join(ROOT, 'source');
const OUT_DIR = path.join(ROOT, 'docs', 'pixil-contact-sheets');
fs.mkdirSync(OUT_DIR, { recursive: true });

const CHARS = [
  { id: 'doyun', file: 'korean_v2 (1).pixil', color: [255, 184, 107] },
  { id: 'maria', file: 'phil (1).pixil', color: [230, 200, 134] },
  { id: 'lin', file: 'vietnam (1).pixil', color: [82, 239, 191] },
  { id: 'aisha', file: 'South_Africa_v1 (1).pixil', color: [124, 216, 255] },
];

// Minimal 3x5 bitmap font for digits and characters used in labels
const FONT = {
  '0': ['111', '101', '101', '101', '111'],
  '1': ['010', '110', '010', '010', '111'],
  '2': ['111', '001', '111', '100', '111'],
  '3': ['111', '001', '111', '001', '111'],
  '4': ['101', '101', '111', '001', '001'],
  '5': ['111', '100', '111', '001', '111'],
  '6': ['111', '100', '111', '101', '111'],
  '7': ['111', '001', '001', '010', '010'],
  '8': ['111', '101', '111', '101', '111'],
  '9': ['111', '101', '111', '001', '111'],
  '+': ['000', '010', '111', '010', '000'],
  '-': ['000', '000', '111', '000', '000'],
  ':': ['000', '010', '000', '010', '000'],
  '/': ['001', '001', '010', '100', '100'],
  'G': ['111', '100', '101', '101', '111'],
  'L': ['100', '100', '100', '100', '111'],
  'O': ['111', '101', '101', '101', '111'],
  'V': ['101', '101', '101', '101', '010'],
  'B': ['110', '101', '110', '101', '110'],
  'H': ['101', '101', '111', '101', '101'],
  ' ': ['000', '000', '000', '000', '000'],
};

function decodeLayerPng(src) {
  const b64 = src.includes(',') ? src.split(',', 2)[1] : src;
  return PNG.sync.read(Buffer.from(b64, 'base64'));
}

function setPixel(img, x, y, r, g, b, a = 255) {
  if (x < 0 || y < 0 || x >= img.width || y >= img.height) return;
  const idx = (y * img.width + x) * 4;
  img.data[idx] = r;
  img.data[idx + 1] = g;
  img.data[idx + 2] = b;
  img.data[idx + 3] = a;
}

function fillRect(img, x, y, w, h, r, g, b, a = 255) {
  for (let py = y; py < y + h; py++) {
    for (let px = x; px < x + w; px++) {
      setPixel(img, px, py, r, g, b, a);
    }
  }
}

function drawText(img, text, x, y, scale, r, g, b) {
  let cx = x;
  for (const ch of text) {
    const gph = FONT[ch] || FONT[' '];
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 3; col++) {
        if (gph[row][col] === '1') {
          fillRect(img, cx + col * scale, y + row * scale, scale, scale, r, g, b, 255);
        }
      }
    }
    cx += 4 * scale;
  }
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

function blitScaled(dst, src, dx, dy, scale) {
  for (let y = 0; y < src.height; y++) {
    for (let x = 0; x < src.width; x++) {
      const si = (y * src.width + x) * 4;
      const a = src.data[si + 3] / 255;
      if (a === 0) continue;
      const sr = src.data[si];
      const sg = src.data[si + 1];
      const sb = src.data[si + 2];
      for (let sy = 0; sy < scale; sy++) {
        for (let sx = 0; sx < scale; sx++) {
          const tx = dx + x * scale + sx;
          const ty = dy + y * scale + sy;
          const ti = (ty * dst.width + tx) * 4;
          dst.data[ti] = Math.round(sr * a + dst.data[ti] * (1 - a));
          dst.data[ti + 1] = Math.round(sg * a + dst.data[ti + 1] * (1 - a));
          dst.data[ti + 2] = Math.round(sb * a + dst.data[ti + 2] * (1 - a));
          dst.data[ti + 3] = 255;
        }
      }
    }
  }
}

for (const ch of CHARS) {
  const raw = JSON.parse(fs.readFileSync(path.join(SOURCE_DIR, ch.file), 'utf8'));
  const layers = raw.frames[0].layers.map((l, idx) => ({
    idx,
    name: l.name,
    png: decodeLayerPng(l.src),
  }));

  const scale = 3;
  const cols = ch.id === 'lin' ? 6 : 5;
  const rows = 4;
  const cellW = 32 * scale + 16;
  const cellH = 64 * scale + 28;
  const extraH = ch.id === 'lin' ? 2 * (64 * scale + 32) : 0;
  const canvas = new PNG({ width: cols * cellW + 16, height: rows * cellH + extraH + 24 });
  fillRect(canvas, 0, 0, canvas.width, canvas.height, 18, 22, 30, 255);

  for (let idx = 0; idx < layers.length; idx++) {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const cx = 12 + col * cellW;
    const cy = 12 + row * cellH;
    // Checkerboard box
    fillRect(canvas, cx, cy + 18, 32 * scale, 64 * scale, 34, 42, 54, 255);
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 8; x++) {
        if ((x + y) % 2 === 0) {
          fillRect(canvas, cx + x * 4 * scale, cy + 18 + y * 4 * scale, 4 * scale, 4 * scale, 42, 52, 66, 255);
        }
      }
    }
    // Red border at 30x50 inner frame reference (x=1, y=6..56) and baseline
    drawText(canvas, `${String(idx).padStart(2, '0')} G${row}`, cx + 4, cy + 2, 2, ch.color[0], ch.color[1], ch.color[2]);
    blitScaled(canvas, layers[idx].png, cx, cy + 18, scale);
  }

  // For Lin, add composite comparison rows: Hat OVER Body vs Body OVER Hat for sample frame 0 of each group
  if (ch.id === 'lin') {
    const hatIndices = [5, 11, 17, 23];
    const baseY = rows * cellH + 20;
    for (let g = 0; g < 4; g++) {
      const bodyPng = layers[g * 6 + 0].png;
      const hatPng = layers[hatIndices[g]].png;
      const hatOver = alphaCompositeOver(bodyPng, hatPng);
      const bodyOver = alphaCompositeOver(hatPng, bodyPng);

      const cx1 = 12 + g * cellW;
      fillRect(canvas, cx1, baseY + 18, 32 * scale, 64 * scale, 34, 42, 54, 255);
      drawText(canvas, `HO G${g}`, cx1 + 4, baseY + 2, 2, 82, 239, 191);
      blitScaled(canvas, hatOver, cx1, baseY + 18, scale);

      const y2 = baseY + 64 * scale + 32;
      fillRect(canvas, cx1, y2 + 18, 32 * scale, 64 * scale, 34, 42, 54, 255);
      drawText(canvas, `BO G${g}`, cx1 + 4, y2 + 2, 2, 255, 184, 107);
      blitScaled(canvas, bodyOver, cx1, y2 + 18, scale);
    }
  }

  const outPath = path.join(OUT_DIR, `${ch.id}-raw.png`);
  fs.writeFileSync(outPath, PNG.sync.write(canvas));
  console.log(`Wrote ${outPath} (${canvas.width}x${canvas.height})`);
}
