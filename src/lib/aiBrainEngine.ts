import { BrainState, ImpulseEvent, ProtectionProfile, AIRule } from '../types';

export class AIBrainEngine {
  private events: ImpulseEvent[] = [
    {
      id: '1',
      appName: 'Instagram',
      timestamp: '14:20',
      delayDurationSeconds: 15,
      outcome: 'reflection_canceled',
      reflectionResponse: 'Ich wollte nur aus Langeweile gucken.',
      vulnerabilityScoreAtTime: 65,
    },
    {
      id: '2',
      appName: 'TikTok',
      timestamp: '16:05',
      delayDurationSeconds: 20,
      outcome: 'delayed_opened',
      vulnerabilityScoreAtTime: 40,
    },
    {
      id: '3',
      appName: 'YouTube Shorts',
      timestamp: '17:45',
      delayDurationSeconds: 25,
      outcome: 'blocked',
      vulnerabilityScoreAtTime: 82,
    }
  ];

  private rules: AIRule[] = [
    {
      id: 'rule-1',
      prompt: 'Ab 22:00 Uhr alle Video-Apps mit 30s Verlangen-Pause belegen',
      condition: 'Uhrzeit >= 22:00 Uhr & App Category == ShortVideo',
      action: 'Setze Öffnungsverzögerung auf 30 Sek. + Deep-Breath Prompt',
      isActive: true,
      createdAt: 'Heute, 10:15'
    },
    {
      id: 'rule-2',
      prompt: 'Erkenne Binge-Öffnung (mehr als 3x in 15 Minuten)',
      condition: 'Impuls-Frequenz > 3/15min',
      action: 'Aktiviere Notfall-Reflexion & 45 Sek. Abkühlzeit',
      isActive: true,
      createdAt: 'Gestern, 14:00'
    }
  ];

  public calculateBrainState(): BrainState {
    const totalBlockedOrCanceled = this.events.filter(
      e => e.outcome === 'blocked' || e.outcome === 'reflection_canceled'
    ).length;

    const savedMinutes = totalBlockedOrCanceled * 12; // average 12 min per impulse saved
    const mindfulnessScore = Math.min(100, Math.max(20, 78 + (totalBlockedOrCanceled * 5) - (this.events.length * 3)));
    
    return {
      mindfulnessScore,
      dopamineResetProgress: Math.min(100, 65 + totalBlockedOrCanceled * 8),
      impulseFrequency: this.events.length > 5 ? 'high' : 'moderate',
      topVulnerableHour: '21:30 - 23:00 Uhr',
      savedTimeMinutesToday: savedMinutes + 36,
      totalInterventionsToday: this.events.length + 4,
      activeProfileId: 'profile-balanced',
      aiModeEnabled: true,
      insightsText: 'Das KI-Gehirn hat heute 4 Binge-Anfalle frühzeitig erkannt und verhindert. Deine Dopamin-Resistenz ist im Vergleich zu gestern um 14% gestiegen.'
    };
  }

  public getEvents(): ImpulseEvent[] {
    return this.events;
  }

  public getRules(): AIRule[] {
    return this.rules;
  }

  public addRuleFromPrompt(userPrompt: string): AIRule {
    const newRule: AIRule = {
      id: 'rule-' + Date.now(),
      prompt: userPrompt,
      condition: 'Dynamic AI Condition (' + userPrompt.slice(0, 20) + '...)',
      action: 'KI-Regel aktiviert: Erhöhter Achtsamkeits-Schutz',
      isActive: true,
      createdAt: 'Gerade eben'
    };
    this.rules.unshift(newRule);
    return newRule;
  }

  public generateReflectionQuestion(appName: string): string {
    const questions = [
      `Was erhoffst du dir genau in den nächsten 5 Minuten auf ${appName} zu finden?`,
      `Fühlst du dich gerade gestresst, erschöpft oder einfach nur gelangweilt?`,
      `Gibt es eine Aufgabe, die du gerade aufschiebst?`,
      `Bringt dich das Öffnen von ${appName} deinem heutigen Tagesziel näher?`
    ];
    return questions[Math.floor(Math.random() * questions.length)];
  }

  public registerImpulse(appName: string, outcome: ImpulseEvent['outcome'], reflectionText?: string): ImpulseEvent {
    const newEvent: ImpulseEvent = {
      id: 'event-' + Date.now(),
      appName,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      delayDurationSeconds: 15,
      outcome,
      reflectionResponse: reflectionText,
      vulnerabilityScoreAtTime: Math.floor(Math.random() * 30) + 60
    };
    this.events.unshift(newEvent);
    return newEvent;
  }
}

export const brainEngine = new AIBrainEngine();
