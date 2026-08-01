export interface ImpulseEvent {
  id: string;
  appName: string;
  timestamp: string;
  delayDurationSeconds: number;
  outcome: 'blocked' | 'delayed_opened' | 'emergency_unlocked' | 'reflection_canceled';
  reflectionResponse?: string;
  vulnerabilityScoreAtTime: number; // 0 to 100
}

export interface ProtectionProfile {
  id: string;
  name: string;
  icon: string;
  description: string;
  delaySeconds: number;
  strictnessLevel: 'gentle' | 'balanced' | 'strict' | 'deep_monk';
  blockedApps: string[];
  activeSchedule?: string;
  aiAdaptiveMode: boolean;
}

export interface BrainState {
  mindfulnessScore: number; // 0 to 100 (100 = high focus/calm)
  dopamineResetProgress: number; // percentage 0 to 100
  impulseFrequency: 'low' | 'moderate' | 'high' | 'critical';
  topVulnerableHour: string;
  savedTimeMinutesToday: number;
  totalInterventionsToday: number;
  activeProfileId: string;
  aiModeEnabled: boolean;
  insightsText: string;
}

export interface AIRule {
  id: string;
  prompt: string;
  condition: string;
  action: string;
  isActive: boolean;
  createdAt: string;
}
