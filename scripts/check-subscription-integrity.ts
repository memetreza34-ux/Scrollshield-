import { readFile } from 'node:fs/promises';

const buildPath = 'android/app/build.gradle';
const activityPath = 'android/app/src/main/java/app/scrollshield/mobile/MainActivity.java';
const integrityPluginPath =
  'android/app/src/main/java/app/scrollshield/mobile/ScrollShieldIntegrityPlugin.java';
const integrityJavaTestPath =
  'android/app/src/test/java/app/scrollshield/mobile/ScrollShieldIntegrityPluginTest.java';
const integrityBridgePath = 'src/lib/nativeIntegrity.ts';
const integrityBridgeTestPath = 'src/lib/nativeIntegrity.test.ts';
const identityPluginPath =
  'android/app/src/main/java/app/scrollshield/mobile/ScrollShieldSubscriptionIdentityPlugin.java';
const identityJavaTestPath =
  'android/app/src/test/java/app/scrollshield/mobile/ScrollShieldSubscriptionIdentityPluginTest.java';
const identityBridgePath = 'src/lib/subscriptionInstallationIdentity.ts';
const identityBridgeTestPath = 'src/lib/subscriptionInstallationIdentity.test.ts';
const architecturePath = 'docs/SUBSCRIPTION_ENTITLEMENT_ARCHITECTURE.md';

const [
  build,
  activity,
  integrityPlugin,
  integrityJavaTest,
  integrityBridge,
  integrityBridgeTest,
  identityPlugin,
  identityJavaTest,
  identityBridge,
  identityBridgeTest,
  architecture,
] = await Promise.all([
  readFile(buildPath, 'utf8'),
  readFile(activityPath, 'utf8'),
  readFile(integrityPluginPath, 'utf8'),
  readFile(integrityJavaTestPath, 'utf8'),
  readFile(integrityBridgePath, 'utf8'),
  readFile(integrityBridgeTestPath, 'utf8'),
  readFile(identityPluginPath, 'utf8'),
  readFile(identityJavaTestPath, 'utf8'),
  readFile(identityBridgePath, 'utf8'),
  readFile(identityBridgeTestPath, 'utf8'),
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
  /registerPlugin\(ScrollShieldIntegrityPlugin\.class\)[\s\S]*registerPlugin\(ScrollShieldSubscriptionIdentityPlugin\.class\)/,
  'Integrity and non-exportable installation identity bridges must both be registered.',
);

requirePattern(
  integrityPluginPath,
  integrityPlugin,
  /@CapacitorPlugin\(name = "ScrollShieldIntegrity"\)[\s\S]*requestIntegrityToken/,
  'Native Integrity plugin must expose only the controlled token request boundary.',
);
requirePattern(
  integrityPluginPath,
  integrityPlugin,
  /server-issued base64url nonce[\s\S]*never decodes or[\s\S]*backend/i,
  'Native Integrity plugin must document server-owned nonce and verdict authority.',
);
requirePattern(
  integrityPluginPath,
  integrityPlugin,
  /MIN_NONCE_LENGTH = 22[\s\S]*MAX_NONCE_LENGTH = 500[\s\S]*isValidServerNonce/,
  'Native Integrity challenge validation must remain bounded.',
);
requirePattern(
  integrityPluginPath,
  integrityPlugin,
  /IntegrityTokenRequest\.builder\(\)[\s\S]*\.setNonce\(nonce\)[\s\S]*requestIntegrityToken\(request\)/,
  'Integrity request must bind the exact backend-issued nonce.',
);
rejectPattern(
  integrityPluginPath,
  integrityPlugin,
  /JSONObject|subscriptionPlan|paid\s*=|entitlement\s*=|PLAY_RECOGNIZED|MEETS_DEVICE_INTEGRITY|LICENSED/,
  'Native Integrity client must not decode verdicts or decide entitlement locally.',
);
requirePattern(
  integrityBridgePath,
  integrityBridge,
  /SERVER_NONCE_PATTERN = \/\^\[A-Za-z0-9_-\]\{22,500\}\$\//,
  'TypeScript must enforce the same bounded base64url nonce contract.',
);
requirePattern(
  integrityBridgePath,
  integrityBridge,
  /returns the opaque Play Integrity token[\s\S]*never decodes verdicts[\s\S]*never turns integrity output into paid access/i,
  'TypeScript Integrity bridge must keep output opaque and non-entitling.',
);
requirePattern(
  integrityBridgePath,
  integrityBridge,
  /AndroidIntegrity\.requestIntegrityToken\(\{ nonce \}\)[\s\S]*normalizeOpaqueIntegrityToken/,
  'TypeScript Integrity bridge must pass the exact challenge and validate only token transport shape.',
);
rejectPattern(
  integrityBridgePath,
  integrityBridge,
  /atob\(|JSON\.parse\([^)]*token|PLAY_RECOGNIZED|MEETS_DEVICE_INTEGRITY|LICENSED|plan\s*:/,
  'TypeScript must not decode or locally interpret Play Integrity verdicts.',
);
requirePattern(
  integrityJavaTestPath,
  integrityJavaTest,
  /acceptsOnlyBoundedUnpaddedBase64UrlServerNonces/,
  'Android unit contract must lock Integrity challenge format.',
);
requirePattern(
  integrityBridgeTestPath,
  integrityBridgeTest,
  /accepts only URL-safe unpadded server challenge nonces[\s\S]*opaque bounded transport token only/,
  'Vitest must lock nonce validation and opaque-token handling.',
);

requirePattern(
  identityPluginPath,
  identityPlugin,
  /ANDROID_KEYSTORE = "AndroidKeyStore"[\s\S]*KEY_ALIAS = "scrollshield_subscription_identity_v1"/,
  'Subscription identity private key must remain in Android Keystore under the versioned alias.',
);
requirePattern(
  identityPluginPath,
  identityPlugin,
  /KEY_ALGORITHM_EC[\s\S]*secp256r1[\s\S]*DIGEST_SHA256/,
  'Subscription identity must use the reviewed P-256/SHA-256 signing contract.',
);
requirePattern(
  identityPluginPath,
  identityPlugin,
  /private key that never leaves[\s\S]*never grants Plus\/Max[\s\S]*Play Integrity[\s\S]*server-side Google Play subscription verification/i,
  'Native identity plugin must document that key possession alone is not entitlement.',
);
requirePattern(
  identityPluginPath,
  identityPlugin,
  /SHA256withECDSA[\s\S]*signer\.initSign\(pair\.getPrivate\(\)\)[\s\S]*signer\.update\(statement\.getBytes/,
  'Challenge signing must use the non-exportable private key over the exact canonical statement.',
);
rejectPattern(
  identityPluginPath,
  identityPlugin,
  /getEncoded\(\).*Private|Base64[^\n]*private|exportPrivate|paid\s*=|entitlement\s*=/,
  'Subscription identity code must never export private key material or grant entitlement.',
);
requirePattern(
  identityBridgePath,
  identityBridge,
  /CHALLENGE_PREFIX = 'scrollshield-subscription-v1:'/,
  'Client challenge statement must use one versioned canonical prefix.',
);
requirePattern(
  identityBridgePath,
  identityBridge,
  /buildSubscriptionChallengeStatement[\s\S]*challengeId[\s\S]*nonce[\s\S]*return `\$\{CHALLENGE_PREFIX\}\$\{challengeId\}:\$\{nonce\}`/,
  'Client must sign exactly the backend challenge id and nonce in canonical order.',
);
requirePattern(
  identityBridgePath,
  identityBridge,
  /algorithm: 'ES256'[\s\S]*signature/,
  'Installation identity transport must remain ES256 and signature-based.',
);
requirePattern(
  identityJavaTestPath,
  identityJavaTest,
  /acceptsOnlyCanonicalPrintableSubscriptionChallengeStatements/,
  'Android unit test must lock canonical challenge statement validation.',
);
requirePattern(
  identityBridgeTestPath,
  identityBridgeTest,
  /builds one canonical statement[\s\S]*rejects malformed challenge ids and nonces/,
  'Vitest must lock canonical challenge construction.',
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
  'Subscription Integrity source check passed. Play Integrity uses a backend-issued nonce, the Integrity token remains opaque, and an Android-Keystore ES256 installation identity signs the canonical challenge without granting entitlement locally.',
);
