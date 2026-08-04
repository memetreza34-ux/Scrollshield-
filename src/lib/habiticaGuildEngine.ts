export interface BossFightState {
  bossName: string;
  bossHp: number; // 0 to 1000
  maxHp: number;
  bossLevel: number;
  userDmgDealtToday: number;
  isDefeated: boolean;
}

export class HabiticaGuildEngine {
  private bossState: BossFightState = {
    bossName: 'Der Doomscroll-Kraken',
    bossHp: 320,
    maxHp: 1000,
    bossLevel: 5,
    userDmgDealtToday: 180,
    isDefeated: false
  };

  public getBossState(): BossFightState {
    return this.bossState;
  }

  public attackBoss(damage: number) {
    this.bossState.bossHp = Math.max(0, this.bossState.bossHp - damage);
    this.bossState.userDmgDealtToday += damage;
    if (this.bossState.bossHp === 0) {
      this.bossState.isDefeated = true;
    }
  }
}

export const habiticaEngine = new HabiticaGuildEngine();
