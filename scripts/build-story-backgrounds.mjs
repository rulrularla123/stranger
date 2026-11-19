import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PNG } from 'pngjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const SOURCE_DIR = process.argv[2] ? path.resolve(process.argv[2]) : path.join(os.homedir(), 'Downloads');
const OUT_DIR = path.join(ROOT, 'public', 'assets', 'story');

const STORY_BG_SPECS = [
  {
    pixil: 'classroom_scale_modified (2).pixil',
    out: 'classroom.png',
    format: 'png',
  },
  {
    pixil: 'STRANGER_Korean_School_Road_30x50 (1).pixil',
    out: 'school-road.jpg',
    format: 'jpeg',
  },
  {
    pixil: 'STRANGER_Bayani_Camp_30x50 (1).pixil',
    out: 'bayani-camp.jpg',
    format: 'jpeg',
  },
];

function decodeLayerPng(src) {
  const commaIdx = src.indexOf(',');
  const b64 = commaIdx >= 0 ? src.slice(commaIdx + 1) : src;
  return PNG.sync.read(Buffer.from(b64, 'base64'));
}

function compositePixilFrame(pixilPath) {
  const raw = JSON.parse(fs.readFileSync(pixilPath, 'utf8'));
  const frame = raw.frames?.[0];
  if (!frame) {
    throw new Error(`No frames found in ${pixilPath}`);
  }
  const width = Number(frame.width ?? raw.width);
  const height = Number(frame.height ?? raw.height);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error(`Invalid canvas dimensions (${frame.width}x${frame.height}) in ${pixilPath}`);
  }

  const out = new PNG({ width, height });
  for (const layer of frame.layers || []) {
    if (layer.active === false || !layer.src) continue;
    const opacity = Number(layer.opacity ?? 1);
    if (!Number.isFinite(opacity) || opacity <= 0) continue;

    const src = decodeLayerPng(layer.src);
    const maxY = Math.min(height, src.height);
    const maxX = Math.min(width, src.width);

    for (let y = 0; y < maxY; y++) {
      for (let x = 0; x < maxX; x++) {
        const si = (y * src.width + x) * 4;
        const sa = (src.data[si + 3] / 255) * opacity;
        if (sa <= 0) continue;

        const di = (y * width + x) * 4;
        const da = out.data[di + 3] / 255;
        const oa = sa + da * (1 - sa);
        if (oa <= 0) continue;

        for (let c = 0; c < 3; c++) {
          out.data[di + c] = Math.round(
            (src.data[si + c] * sa + out.data[di + c] * da * (1 - sa)) / oa
          );
        }
        out.data[di + 3] = Math.round(oa * 255);
      }
    }
  }

  return out;
}

fs.mkdirSync(OUT_DIR, { recursive: true });

for (const spec of STORY_BG_SPECS) {
  const pixilPath = path.join(SOURCE_DIR, spec.pixil);
  if (!fs.existsSync(pixilPath)) {
    throw new Error(`Missing source .pixil file: ${pixilPath}`);
  }

  const composited = compositePixilFrame(pixilPath);
  const pngBuffer = PNG.sync.write(composited, {
    colorType: 2,
    deflateLevel: 9,
    filterType: 4,
  });
  const outPath = path.join(OUT_DIR, spec.out);

  if (spec.format === 'png') {
    fs.writeFileSync(outPath, pngBuffer);
  } else {
    const tmpPath = path.join(OUT_DIR, `${spec.out}.tmp.png`);
    try {
      fs.writeFileSync(tmpPath, pngBuffer);
      execFileSync('/usr/bin/sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '88', tmpPath, '--out', outPath], {
        stdio: 'pipe',
      });
    } finally {
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    }
  }

  const sizeKb = (fs.statSync(outPath).size / 1024).toFixed(1);
  console.log(`${spec.out}: ${composited.width}x${composited.height} (${sizeKb} KB)`);
}
