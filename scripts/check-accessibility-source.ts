import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const sourceDir = path.resolve('src');
const css = await readFile(path.join(sourceDir, 'index.css'), 'utf8');

if (!/min-height:\s*44px/.test(css) || !/min-width:\s*44px/.test(css)) {
  throw new Error('Global interactive controls must keep a 44px minimum touch target.');
}

if (!/text-size-adjust:\s*100%/.test(css) || !/overflow-wrap:\s*anywhere/.test(css)) {
  throw new Error('Global text scaling and wrapping safeguards are missing.');
}

const sourceFiles = (await readdir(sourceDir, { recursive: true }))
  .filter((file) => file.endsWith('.tsx') && !file.endsWith('.test.tsx'))
  .map((file) => path.join(sourceDir, file));
const unlabeledSwitches: string[] = [];
const clippedTextFiles: string[] = [];

for (const file of sourceFiles) {
  const source = await readFile(file, 'utf8');
  const switchElements = source.match(/<Switch\b[\s\S]*?\/>/g) ?? [];

  switchElements.forEach((element, index) => {
    if (/\bariaLabel=/.test(element)) return;
    unlabeledSwitches.push(`${path.relative(process.cwd(), file)} Switch ${index + 1}`);
  });

  if (/\b(?:truncate|whitespace-nowrap)\b/.test(source)) {
    clippedTextFiles.push(path.relative(process.cwd(), file));
  }
}

if (unlabeledSwitches.length > 0) {
  throw new Error(`Switch controls need contextual ariaLabel props:\n${unlabeledSwitches.join('\n')}`);
}

if (clippedTextFiles.length > 0) {
  throw new Error(`Runtime text must remain available at large font sizes:\n${clippedTextFiles.join('\n')}`);
}

console.log(`Accessibility source checks passed for ${sourceFiles.length} component files.`);
