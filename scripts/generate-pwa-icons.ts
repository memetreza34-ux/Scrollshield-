import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const publicDir = path.resolve('public');
const sourceIcon = path.join(publicDir, 'pwa-icon.svg');

const icons = [
  { file: 'pwa-192.png', size: 192 },
  { file: 'pwa-512.png', size: 512 },
  { file: 'maskable-512.png', size: 512 },
];

await mkdir(publicDir, { recursive: true });

const source = await readFile(sourceIcon);

await Promise.all(
  icons.map(({ file, size }) =>
    sharp(source).resize(size, size, { fit: 'cover' }).png({ compressionLevel: 9 }).toFile(path.join(publicDir, file)),
  ),
);

console.log(`Generated ${icons.length} PWA icons.`);
