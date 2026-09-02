import { describe, it, expect } from 'vitest';
import {
  BUILTIN_12_PLATFORMS,
  runPlatformExpansionStressTest,
  runPrivacyFieldInterceptionStressTest,
  runOnDeviceAIPrivacyStressTest,
  runStorageResilienceStressTest,
  SecureAccessibilityFilterEngine,
  TARGET_PACKAGES,
  BANKING_PACKAGES,
  SYSTEM_NON_TARGET_PACKAGES,
  WebCryptoStorageEngine,
} from '../../scripts/empirical_challenge_harness_2';
import { normalizeAppConfig } from '../lib/state';

describe('Adversarial Challenge 2: Empirical Verification Suite', () => {
  describe('Dimension 1: UI/UX Non-Regression & Platform Expansion', () => {
    it('executes platform expansion stress harness with 100% pass rate', () => {
      const result = runPlatformExpansionStressTest();
      expect(result.success).toBe(true);
      expect(result.results.length).toBeGreaterThanOrEqual(7);
    });

    it('verifies 12 built-in platforms satisfy UI tokens and schema contracts', () => {
      expect(BUILTIN_12_PLATFORMS.length).toBe(12);
      BUILTIN_12_PLATFORMS.forEach((platform) => {
        expect(platform.id).toBeDefined();
        expect(platform.name).toBeDefined();
        expect(platform.color).toContain('bg-');
        expect(platform.androidPackages.length).toBeGreaterThan(0);
        if (platform.hasShortVideoFeed) {
          expect(platform.shortVideoSurface).toBeDefined();
          expect(platform.shortVideoSurface?.defaultMode).toBeDefined();
        }
      });
    });

    it('ensures dynamic normalization preserves custom app overrides and default profiles', () => {
      const customId = 'custom_bluesky_feed';
      const customConfig = normalizeAppConfig(customId, { active: true, dailyLimit: 45 });
      expect(customConfig.id).toBe(customId);
      expect(customConfig.active).toBe(true);
      expect(customConfig.dailyLimit).toBe(45);
      expect(customConfig.reelsProtection.enabled).toBe(true);
    });
  });

  describe('Dimension 2: Privacy & Sensitive Field Interception', () => {
    it('executes privacy field interception stress harness with 100% pass rate', () => {
      const result = runPrivacyFieldInterceptionStressTest();
      expect(result.success).toBe(true);
    });

    it('strictly rejects banking packages from accessibility node inspection', () => {
      const engine = new SecureAccessibilityFilterEngine(TARGET_PACKAGES);
      BANKING_PACKAGES.forEach((bankPkg) => {
        const res = engine.inspectEvent(bankPkg, { text: 'Bank balance: $10,000' });
        expect(res.shouldBlock).toBe(false);
        expect(res.reason).toBe('REJECTED_NON_TARGET_PACKAGE');
      });
    });

    it('strictly bypasses password fields and sensitive inputs inside target social apps', () => {
      const engine = new SecureAccessibilityFilterEngine(TARGET_PACKAGES);
      const res = engine.inspectEvent('com.instagram.android', {
        text: 'Login Page',
        children: [{ text: 'my_super_secret_password', isPassword: true }],
      });
      expect(res.shouldBlock).toBe(false);
      expect(engine.rejectedSensitiveCount).toBe(1);
    });

    it('drops system and non-target messaging apps immediately', () => {
      const engine = new SecureAccessibilityFilterEngine(TARGET_PACKAGES);
      SYSTEM_NON_TARGET_PACKAGES.forEach((sysPkg) => {
        const res = engine.inspectEvent(sysPkg, { text: 'Settings or SMS' });
        expect(res.shouldBlock).toBe(false);
        expect(res.reason).toBe('REJECTED_NON_TARGET_PACKAGE');
      });
    });
  });

  describe('Dimension 3: On-Device AI Privacy & Offline Execution', () => {
    it('executes on-device AI privacy stress harness with 100% pass rate and zero network calls', () => {
      const result = runOnDeviceAIPrivacyStressTest();
      expect(result.success).toBe(true);
    });
  });

  describe('Dimension 4: Storage Resilience & Cryptographic Security', () => {
    it('executes storage resilience stress harness with 100% pass rate', async () => {
      const result = await runStorageResilienceStressTest();
      expect(result.success).toBe(true);
    });

    it('verifies WebCrypto AES-256-GCM authenticated encryption detects bit tampering', async () => {
      const engine = new WebCryptoStorageEngine();
      await engine.initialize();
      const payload = JSON.stringify({ secret: 'focus_settings_123' });
      const encrypted = await engine.encrypt(payload);
      const decrypted = await engine.decrypt(encrypted);
      expect(decrypted).toBe(payload);

      const raw = Buffer.from(encrypted, 'base64');
      raw[raw.length - 1] ^= 0x01; // Tamper auth tag
      const tampered = raw.toString('base64');
      await expect(engine.decrypt(tampered)).rejects.toThrow();
    });
  });
});
