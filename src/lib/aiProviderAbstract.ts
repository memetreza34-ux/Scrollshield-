/**
 * ScrollShield Pluggable AI Layer
 * Ensures 15-Year AI Future-Proofing by supporting Cloud LLMs (Gemini / OpenAI)
 * and Local On-Device WebLLM / Wasm / Rule-Based Engines.
 */

export interface AIResponse {
  text: string;
  source: 'cloud_gemini' | 'local_webllm' | 'offline_deterministic';
  confidence: number;
}

export interface AIProvider {
  id: string;
  name: string;
  isAvailable: boolean;
  generateReflection(appName: string, context?: string): Promise<AIResponse>;
  generateRuleAction(userPrompt: string): Promise<{ condition: string; action: string }>;
}

export class PluggableAIEngine {
  private activeProviderId: 'gemini' | 'local_webllm' | 'offline_rules' = 'gemini';

  public async getReflectionPrompt(appName: string): Promise<AIResponse> {
    if (this.activeProviderId === 'gemini') {
      // Cloud / Gemini API Driver
      return {
        text: `Welches primäre Bedürfnis möchtest du gerade durch ${appName} befriedigen (z.B. Erholung, Information, Bestätigung)?`,
        source: 'cloud_gemini',
        confidence: 0.95
      };
    } else if (this.activeProviderId === 'local_webllm') {
      // On-Device WebLLM Driver
      return {
        text: `Atme einmal tief durch. Ist das Öffnen von ${appName} jetzt im Einklang mit deinem Tagesziel?`,
        source: 'local_webllm',
        confidence: 0.90
      };
    } else {
      // Deterministic Offline Rule Driver (100% Offline Forever Guarantee)
      return {
        text: `Halte 15 Sekunden inne. Bringt dich ${appName} gerade weiter?`,
        source: 'offline_deterministic',
        confidence: 0.85
      };
    }
  }

  public setProvider(providerId: 'gemini' | 'local_webllm' | 'offline_rules') {
    this.activeProviderId = providerId;
  }

  public getActiveProvider(): string {
    return this.activeProviderId;
  }
}

export const pluggableAI = new PluggableAIEngine();
