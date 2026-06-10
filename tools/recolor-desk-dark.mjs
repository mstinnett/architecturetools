#!/usr/bin/env node
// Regenerate assets/desk-images-dark/ from assets/desk-images/.
//
// The picker shows the desk line art in both schemes via <picture>: the
// original PNGs (black lines, transparent ground) in light, and these
// recolored copies in dark. The recolor is a pure color swap — every
// non-transparent pixel becomes the dark-page ink #E8E4DB (--text-on-dark
// in assets/css/tokens.css) with the source alpha kept, so antialiasing
// survives. CSS filter/mask tricks were tried instead and rasterized as
// opaque slabs in some engines; plain pre-rendered images render everywhere.
//
// Run after re-exporting desk images from the make2d pipeline:
//   npx playwright install chromium   (one-time, if needed)
//   node tools/recolor-desk-dark.mjs
//
// Only the combos the picker can request are generated (machines x combos
// below) — the _top, preview_, and legacy exports have no dark consumers.
import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { chromium } from 'playwright';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'assets/desk-images');
const OUT = join(ROOT, 'assets/desk-images-dark');
const INK = [232, 228, 219];   // #E8E4DB — keep in step with --text-on-dark
const MACHINES = ['NorthXL', 'MacMini', 'Laptop', 'MBP', 'X1Tower'];
const COMBOS = ['1x27', '1x32', '2x27', '2x32', '1xUW', '1x27_1x32'];

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage();
for (const machine of MACHINES) {
  for (const combo of COMBOS) {
    const name = `${machine}_${combo}.png`;
    const src = readFileSync(join(SRC, name)).toString('base64');
    const b64 = await page.evaluate(async ([src, ink]) => {
      const img = new Image();
      img.src = 'data:image/png;base64,' + src;
      await new Promise((ok, err) => { img.onload = ok; img.onerror = err; });
      const canvas = document.createElement('canvas');
      canvas.width = img.width; canvas.height = img.height;
      const g = canvas.getContext('2d');
      g.drawImage(img, 0, 0);
      const data = g.getImageData(0, 0, canvas.width, canvas.height);
      const px = data.data;
      for (let i = 0; i < px.length; i += 4) {
        if (px[i + 3] === 0) continue;
        px[i] = ink[0]; px[i + 1] = ink[1]; px[i + 2] = ink[2];
      }
      g.putImageData(data, 0, 0);
      return canvas.toDataURL('image/png').split(',')[1];
    }, [src, INK]);
    writeFileSync(join(OUT, name), Buffer.from(b64, 'base64'));
    console.log('wrote', name);
  }
}
await browser.close();
console.log(`recolor-desk-dark: ${MACHINES.length * COMBOS.length} files -> assets/desk-images-dark/`);
