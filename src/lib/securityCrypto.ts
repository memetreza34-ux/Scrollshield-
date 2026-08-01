/**
 * ScrollShield Security & Encryption Layer
 * Provides XSS Input Sanitization, Anti-Prompt-Injection Guardrails,
 * and Web Crypto API (AES-GCM) Local Storage Encryption.
 */

export class SecurityCrypto {
  private static ENCRYPTION_KEY_NAME = 'scrollshield_sec_v1';

  /**
   * Sanitizes input text to prevent XSS Attacks
   */
  public static sanitizeInput(text: string): string {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')
      .trim();
  }

  /**
   * Validates AI prompts against prompt injection / malicious commands
   */
  public static validateAIPrompt(prompt: string): { isValid: boolean; sanitized: string; reason?: string } {
    const sanitized = this.sanitizeInput(prompt);
    
    // Check length limit
    if (sanitized.length > 300) {
      return { isValid: false, sanitized: sanitized.slice(0, 300), reason: 'Prompt ist zu lang (max. 300 Zeichen).' };
    }

    // Check suspicious prompt injection patterns
    const dangerousPatterns = [/ignore previous instructions/i, /system prompt/i, /eval\(/i, /javascript:/i, /<script/i];
    for (const pattern of dangerousPatterns) {
      if (pattern.test(prompt)) {
        return { isValid: false, sanitized: '', reason: 'Sicherheitsverletzung: Maliziöser Inhalt erkannt.' };
      }
    }

    return { isValid: true, sanitized };
  }

  /**
   * Generates a 256-bit AES key for Web Crypto
   */
  private static async getOrCreateKey(): Promise<CryptoKey> {
    const existingKeyJson = localStorage.getItem(this.ENCRYPTION_KEY_NAME);
    if (existingKeyJson) {
      try {
        const jwk = JSON.parse(existingKeyJson);
        return await crypto.subtle.importKey(
          'jwk',
          jwk,
          { name: 'AES-GCM', length: 256 },
          true,
          ['encrypt', 'decrypt']
        );
      } catch (e) {
        // Fallback to new key if corrupt
      }
    }

    const key = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );

    const exportedJwk = await crypto.subtle.exportKey('jwk', key);
    localStorage.setItem(this.ENCRYPTION_KEY_NAME, JSON.stringify(exportedJwk));
    return key;
  }

  /**
   * Encrypts plain data string using AES-GCM
   */
  public static async encryptData(data: string): Promise<string> {
    try {
      const key = await this.getOrCreateKey();
      const encoder = new TextEncoder();
      const encodedData = encoder.encode(data);

      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encryptedBuffer = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        encodedData
      );

      const ivBase64 = btoa(String.fromCharCode(...iv));
      const encryptedBase64 = btoa(String.fromCharCode(...new Uint8Array(encryptedBuffer)));

      return JSON.stringify({ iv: ivBase64, data: encryptedBase64 });
    } catch (e) {
      // Fallback
      return btoa(data);
    }
  }

  /**
   * Decrypts encrypted data string
   */
  public static async decryptData(encryptedPayload: string): Promise<string> {
    try {
      const { iv: ivBase64, data: encryptedBase64 } = JSON.parse(encryptedPayload);
      const key = await this.getOrCreateKey();

      const iv = new Uint8Array(atob(ivBase64).split('').map(c => c.charCodeAt(0)));
      const encryptedData = new Uint8Array(atob(encryptedBase64).split('').map(c => c.charCodeAt(0)));

      const decryptedBuffer = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        encryptedData
      );

      return new TextDecoder().decode(decryptedBuffer);
    } catch (e) {
      try {
        return atob(encryptedPayload);
      } catch {
        return '';
      }
    }
  }
}
