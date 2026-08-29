import { readFile } from 'node:fs/promises';

const buildPath = 'android/app/build.gradle';
const activityPath = 'android/app/src/main/java/app/scrollshield/mobile/MainActivity.java';
const pluginPath = 'android/app/src/main/java/app/scrollshield/mobile/ScrollShieldIntegrityPlugin.java';
const javaTestPath =
  'android/app/src/test/java/app/scrollshield/mobile/ScrollShieldIntegrityPluginTest.java';
const bridgePath = 'src/lib/nativeIntegrity.ts';
const bridgeTestPath = 'src/lib/nativeIntegrity.test.ts';
const architecturePath = 'docs/SUBSCRIPTION_ENTITLEMENT_ARCHITECTURE.md';

const [build, activity, plugin, javaTest, bridge, bridgeTest, architecture] = await Promise.all([
  readFile(buildPath, 'utf8'),
  readFile(activityPath, 'utf8'),
  readFile(pluginPath, 'utf8'),
  readFile(javaTestPath, 'utf8'),
  readFile(bridgePath, 'utf8'),
  readFile(bridgeTestPath, 'utf8'),
  readFile(architecturePath, 'utf8'),
]);

const findings: string[] = [];

const requirePattern = (file: string, content: string, pattern: RegExp, message: string) => {
  if (!pattern.test(content)) findings.push(`${file}: ${message}`);
};

const rejectPattern = (file: string, content: string, pattern: RegExp, message: string) => {
  if (pattern.test(content)) findings.push(`${file}: ${message}`);
};

requirePattern(
  buildPath,
  build,
  /integrity_version = "1\.6\.0"[\s\S]*implementation "com\.google\.android\.play:integrity:\$integrity_version"/,
  'Play Integrity dependency must remain pinned to the reviewed 1.6.0 source contract.',
);
requirePattern(
  activityPath,
  activity,
  /registerPlugin\(ScrollShieldIntegrityPlugin\.class\)/,
  'Integrity bridge must be explicitly registered.',
);
requirePattern(
  pluginPath,
  plugin,
  /@CapacitorPlugin\(name = "ScrollShieldIntegrity"\)[\s\S]*requestIntegrityToken/,
  'Native Integrity plugin must expose only the controlled token request boundary.',
);
requirePattern(
  pluginPath,
  plugin,
  /server-issued base64url nonce[\s\S]*never decodes or[\s\S]*backend/i,
  'Native plugin must document server-owned nonce and verdict authority.',
);
requirePattern(
  pluginPath,
  plugin,
  /MIN_NONCE_LENGTH = 22[\s\S]*MAX_NONCE_LENGTH = 500[\s\S]*isValidServerNonce/,
  'Native challenge validation must remain bounded.',
);
requirePattern(
  pluginPath,
  plugin,
  /IntegrityTokenRequest\.builder\(\)[\s\S]*\.setNonce\(nonce\)[\s\S]*requestIntegrityToken\(request\)/,
  'Integrity request must bind the exact backend-issued nonce.',
);
rejectPattern(
  pluginPath,
  plugin,
  /JSONObject|subscriptionPlan|paid\s*=|entitlement\s*=|PLAY_RECOGNIZED|MEETS_DEVICE_INTEGRITY|LICENSED/,
  'Native client must not decode Integrity verdicts or decide entitlement locally.',
);

requirePattern(
  bridgePath,
  bridge,
  /SERVER_NONCE_PATTERN = \/\^\[A-Za-z0-9_-\]\{22,500\}\$\//,
  'TypeScript must enforce the same bounded base64url nonce contract.',
);
requirePattern(
  bridgePath,
  bridge,
  /returns the opaque Play Integrity token[\s\S]*never decodes verdicts[\s\S]*never turns integrity output into paid access/i,
  'TypeScript bridge must keep Integrity output opaque and non-entitling.',
);
requirePattern(
  bridgePath,
  bridge,
  /AndroidIntegrity\.requestIntegrityToken\(\{ nonce \}\)[\s\S]*normalizeOpaqueIntegrityToken/,
  'TypeScript bridge must pass the exact challenge and validate only token transport shape.',
);
rejectPattern(
  bridgePath,
  bridge,
  /atob\(|JSON\.parse\([^)]*token|PLAY_RECOGNIZED|MEETS_DEVICE_INTEGRITY|LICENSED|plan\s*:/,
  'TypeScript must not decode or locally interpret Play Integrity verdicts.',
);

requirePattern(
  javaTestPath,
  javaTest,
  /acceptsOnlyBoundedUnpaddedBase64UrlServerNonces/,
  'Android unit contract must lock challenge format.',
);
requirePattern(
  bridgeTestPath,
  bridgeTest,
  /accepts only URL-safe unpadded server challenge nonces[\s\S]*opaque bounded transport token only/,
  'Vitest must lock nonce validation and opaque-token handling.',
);
requirePattern(
  architecturePath,
  architecture,
  /secure ScrollShield backend[\s\S]*Google Play Developer API verification/,
  'Subscription architecture must keep backend verification as the trust authority.',
);

if (findings.length > 0) {
  console.log('Subscription Integrity source check failed:\n');
  for (const finding of findings) console.log(`- ${finding}`);
  process.exit(1);
}

console.log(
  'Subscription Integrity source check passed. Play Integrity uses a backend-issued nonce, the Android/TypeScript clients treat the token as opaque transport, and entitlement verdicts remain server-owned.',
);
