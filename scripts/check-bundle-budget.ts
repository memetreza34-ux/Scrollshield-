import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { gzipSync } from 'node:zlib';

const assetsDir = path.resolve('dist/assets');

const limits = {
  totalJsGzipKb: 160,
  singleJsGzipKb: 70,
  totalCssGzipKb: 15,
};

const toKb = (bytes: number) => bytes / 1024;
const formatKb = (bytes: number) => `${toKb(bytes).toFixed(2)} KiB`;

const files = await readdir(assetsDir);
const jsFiles = files.filter((file) => file.endsWith('.js'));
const cssFiles = files.filter((file) => file.endsWith('.css'));

const gzipSize = async (file: string) => {
  const buffer = await readFile(path.join(assetsDir, file));
  return gzipSync(buffer).byteLength;
};

const jsSizes = await Promise.all(jsFiles.map(async (file) => ({ file, gzipBytes: await gzipSize(file) })));
const cssSizes = await Promise.all(cssFiles.map(async (file) => ({ file, gzipBytes: await gzipSize(file) })));

const totalJsGzip = jsSizes.reduce((total, item) => total + item.gzipBytes, 0);
const totalCssGzip = cssSizes.reduce((total, item) => total + item.gzipBytes, 0);
const oversizedJs = jsSizes.filter((item) => toKb(item.gzipBytes) > limits.singleJsGzipKb);

if (toKb(totalJsGzip) > limits.totalJsGzipKb) {
  throw new Error(`Total JS gzip budget exceeded: ${formatKb(totalJsGzip)} > ${limits.totalJsGzipKb} KiB`);
}

if (toKb(totalCssGzip) > limits.totalCssGzipKb) {
  throw new Error(`Total CSS gzip budget exceeded: ${formatKb(totalCssGzip)} > ${limits.totalCssGzipKb} KiB`);
}

if (oversizedJs.length > 0) {
  throw new Error(
    `Single JS chunk budget exceeded: ${oversizedJs
      .map((item) => `${item.file} ${formatKb(item.gzipBytes)}`)
      .join(', ')}`,
  );
}

console.log(`Bundle budget passed. JS gzip: ${formatKb(totalJsGzip)}, CSS gzip: ${formatKb(totalCssGzip)}.`);
