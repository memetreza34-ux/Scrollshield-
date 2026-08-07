import { readFile } from 'node:fs/promises';

const servicePath =
  'android/app/src/main/java/app/scrollshield/mobile/ScrollShieldProtectionService.java';
const matrixPath = 'docs/ANDROID_DEVICE_TEST_MATRIX.md';

const [service, matrix] = await Promise.all([
  readFile(servicePath, 'utf8'),
  readFile(matrixPath, 'utf8'),
]);

const findings: string[] = [];

function requirePattern(file: string, content: string, pattern: RegExp, message: string) {
  if (pattern.test(content)) return;
  findings.push(`${file}: ${message}`);
}

function rejectPattern(file: string, content: string, pattern: RegExp, message: string) {
  if (!pattern.test(content)) return;
  findings.push(`${file}: ${message}`);
}

requirePattern(
  servicePath,
  service,
  /import android\.widget\.ScrollView;/,
  'Protection overlay must use a ScrollView so actions remain reachable at large font/display scales.',
);
requirePattern(
  servicePath,
  service,
  /ScrollView scrollView = new ScrollView\(this\);[\s\S]*setFillViewport\(true\)[\s\S]*setVerticalScrollBarEnabled\(true\)/,
  'Overlay ScrollView must fill the viewport and remain visibly scrollable.',
);
requirePattern(
  servicePath,
  service,
  /container\.setMinimumHeight\(getResources\(\)\.getDisplayMetrics\(\)\.heightPixels\)/,
  'Short overlay content must still fill the screen while allowing oversized content to scroll.',
);
requirePattern(
  servicePath,
  service,
  /Zurück zum Startbildschirm[\s\S]*createEmergencyReasonInput\(\)[\s\S]*continueButton/,
  'The safe return-home action must remain before the optional emergency form and release action.',
);
requirePattern(
  servicePath,
  service,
  /setOnFocusChangeListener[\s\S]*smoothScrollTo\(0, continueButton\.getBottom\(\) \+ dp\(24\)\)/,
  'Focusing the emergency reason must reveal the release action instead of leaving it behind the keyboard.',
);
requirePattern(
  servicePath,
  service,
  /layoutParams\.softInputMode = WindowManager\.LayoutParams\.SOFT_INPUT_ADJUST_RESIZE/,
  'Overlay window must resize around the software keyboard.',
);
rejectPattern(
  servicePath,
  service,
  /FLAG_LAYOUT_NO_LIMITS/,
  'FLAG_LAYOUT_NO_LIMITS must not return because it can keep actions behind system/IME bounds.',
);
requirePattern(
  matrixPath,
  matrix,
  /UI-06[\s\S]*maximum font[\s\S]*software keyboard[\s\S]*Zurück zum Startbildschirm[\s\S]*Notfall/,
  'Device matrix must include explicit large-font plus keyboard overlay evidence.',
);

if (findings.length > 0) {
  console.log('Overlay accessibility check failed:\n');
  for (const finding of findings) console.log(`- ${finding}`);
  process.exit(1);
}

console.log(
  'Overlay accessibility check passed. The native protection overlay is scrollable, keyboard-resizable, keeps return-home reachable, and requires physical large-font/IME evidence.',
);
