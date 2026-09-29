import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

/**
 * Android launcher icons and splash screens from public/pwa-icon.svg. The
 * Capacitor template shipped its own logo in both places, so the app showed
 * another project's mark on the home screen.
 */

const resDir = path.resolve('android/app/src/main/res');
const BACKGROUND = '#09090b';

const source = await readFile(path.resolve('public/pwa-icon.svg'));
// The shield alone: the adaptive icon brings its own background and mask.
const shield = Buffer.from(source.toString('utf8').replace(/<rect[^>]*\/>/, ''));

const render = (svg: Buffer, size: number) => sharp(svg).resize(size, size).png().toBuffer();

const densities: Record<string, number> = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };

for (const [density, scale] of Object.entries(densities)) {
  const dir = path.join(resDir, `mipmap-${density}`);
  const launcher = Math.round(48 * scale);

  // Pre-Android-8 launchers: the rounded square as it is.
  await sharp(await render(source, launcher)).toFile(path.join(dir, 'ic_launcher.png'));

  // Round variant: dark circle with the shield.
  const circle = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${launcher}" height="${launcher}"><circle cx="${launcher / 2}" cy="${launcher / 2}" r="${launcher / 2}"/></svg>`,
  );
  await sharp({ create: { width: launcher, height: launcher, channels: 4, background: BACKGROUND } })
    .composite([
      { input: await render(shield, Math.round(launcher * 0.92)), gravity: 'center' },
      { input: circle, blend: 'dest-in' },
    ])
    .png()
    .toFile(path.join(dir, 'ic_launcher_round.png'));

  // Adaptive foreground: 108 dp canvas, the shield inside the 66 dp safe zone
  // that survives every launcher mask.
  const canvas = Math.round(108 * scale);
  await sharp({ create: { width: canvas, height: canvas, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: await render(shield, Math.round(66 * scale)), gravity: 'center' }])
    .png()
    .toFile(path.join(dir, 'ic_launcher_foreground.png'));
}

// Splash screens: same sizes as before, dark background, shield in the middle.
let splashCount = 0;
for (const folder of await readdir(resDir)) {
  if (!folder.startsWith('drawable')) continue;
  const file = path.join(resDir, folder, 'splash.png');
  const metadata = await sharp(file)
    .metadata()
    .catch(() => null);
  if (!metadata?.width || !metadata.height) continue;

  const size = Math.round(Math.min(metadata.width, metadata.height) * 0.3);
  const image = await sharp({
    create: { width: metadata.width, height: metadata.height, channels: 3, background: BACKGROUND },
  })
    .composite([{ input: await render(shield, size), gravity: 'center' }])
    .png({ compressionLevel: 9 })
    .toBuffer();
  await writeFile(file, image);
  splashCount++;
}

console.log(
  `Generated Android launcher icons for ${Object.keys(densities).length} densities and ${splashCount} splash screens.`,
);
