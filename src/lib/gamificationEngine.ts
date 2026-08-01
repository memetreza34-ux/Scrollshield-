export interface TreePlant {
  id: string;
  name: string;
  type: 'bonsai' | 'bamboo' | 'oak' | 'redwood';
  plantedAt: string;
  growthProgress: number; // 0 to 100
  isFullyGrown: boolean;
  gemsEarned: number;
}

export interface UserGamificationState {
  focusScore: number; // 0 to 1000 (Opal Style)
  gems: number; // Mindfulness Gems
  currentStreakDays: number;
  totalTreesPlanted: number;
  level: number;
  trees: TreePlant[];
}

export class GamificationEngine {
  private state: UserGamificationState = {
    focusScore: 845,
    gems: 120,
    currentStreakDays: 5,
    totalTreesPlanted: 8,
    level: 3,
    trees: [
      {
        id: 't-1',
        name: 'Fokus Bonsai',
        type: 'bonsai',
        plantedAt: 'Gestern, 14:00',
        growthProgress: 100,
        isFullyGrown: true,
        gemsEarned: 15
      },
      {
        id: 't-2',
        name: 'Zen Eiche',
        type: 'oak',
        plantedAt: 'Heute, 09:30',
        growthProgress: 100,
        isFullyGrown: true,
        gemsEarned: 25
      },
      {
        id: 't-3',
        name: 'Achtsamkeits Bambus',
        type: 'bamboo',
        plantedAt: 'Heute, 16:15',
        growthProgress: 60,
        isFullyGrown: false,
        gemsEarned: 10
      }
    ]
  };

  public getState(): UserGamificationState {
    return this.state;
  }

  public addGemsAndProgress(amountGems: number, focusMinutes: number) {
    this.state.gems += amountGems;
    this.state.focusScore = Math.min(1000, this.state.focusScore + focusMinutes * 2);

    // Check if new tree should be planted
    if (focusMinutes >= 25) {
      const newTree: TreePlant = {
        id: 't-' + Date.now(),
        name: 'Redwood des Monks',
        type: focusMinutes >= 45 ? 'redwood' : 'oak',
        plantedAt: 'Gerade eben',
        growthProgress: 100,
        isFullyGrown: true,
        gemsEarned: Math.floor(focusMinutes * 0.8)
      };
      this.state.trees.unshift(newTree);
      this.state.totalTreesPlanted += 1;
    }
  }
}

export const gamificationEngine = new GamificationEngine();
