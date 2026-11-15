// Gera build/icon.png (512) e build/icon.ico (16 a 256 px) a partir de build/icon.svg.
// Uso: npm run icons
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import pngToIco from 'png-to-ico';
import sharp from 'sharp';

const buildDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'build');
const svg = fs.readFileSync(path.join(buildDir, 'icon.svg'));
const render = (size) => sharp(svg, { density: 384 }).resize(size, size).png().toBuffer();

fs.writeFileSync(path.join(buildDir, 'icon.png'), await render(512));

const sizes = [16, 24, 32, 48, 64, 128, 256];
const ico = await pngToIco(await Promise.all(sizes.map(render)));
fs.writeFileSync(path.join(buildDir, 'icon.ico'), ico);

console.log(`icon.png e icon.ico gerados em ${buildDir}`);
