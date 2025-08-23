export interface Pot {
  id: string;
  amount: number;
  eligiblePlayers: string[];
  isMain: boolean;
}

export class PotManager {
  pots: Pot[];
  playerContributions: Map<string, number>;
  totalPot: number;

  constructor() {
    this.pots = [];
    this.playerContributions = new Map();
    this.totalPot = 0;
  }

  addBet(playerId: string, amount: number): void {
    const current = this.playerContributions.get(playerId) || 0;
    this.playerContributions.set(playerId, current + amount);
    this.totalPot += amount;
  }

  createSidePots(players: any[]): void {
    // Only create side pots if there's an all-in player
    const hasAllIn = players.some(p => p.status === 'all_in');
    if (!hasAllIn) {
      // Just create a single main pot with all contributions
      this.pots = [{
        id: Math.random().toString(36).substr(2, 9),
        amount: this.totalPot,
        eligiblePlayers: Array.from(this.playerContributions.keys()),
        isMain: true
      }];
      return;
    }
    
    this.pots = [];
    
    // Get all contribution amounts and sort them
    const contributions = Array.from(this.playerContributions.entries())
      .filter(([id, amount]) => amount > 0)
      .sort((a, b) => a[1] - b[1]);
    
    if (contributions.length === 0) return;
    
    let previousAmount = 0;
    const processedAmounts = new Set<number>();
    
    for (const [_, contributionAmount] of contributions) {
      if (processedAmounts.has(contributionAmount)) continue;
      processedAmounts.add(contributionAmount);
      
      const potAmount = contributionAmount - previousAmount;
      const eligiblePlayers = contributions
        .filter(([id, amount]) => amount >= contributionAmount)
        .map(([id]) => id);
      
      if (potAmount > 0 && eligiblePlayers.length > 0) {
        const pot: Pot = {
          id: Math.random().toString(36).substr(2, 9),
          amount: potAmount * eligiblePlayers.length,
          eligiblePlayers,
          isMain: this.pots.length === 0
        };
        this.pots.push(pot);
      }
      
      previousAmount = contributionAmount;
    }
  }

  distributePots(winners: { [potId: string]: string[] }): any[] {
    const distributions = [];
    
    console.log('distributePots called with:', winners);
    console.log('Current pots:', this.pots);
    
    for (const pot of this.pots) {
      const potWinners = winners[pot.id] || winners['default'] || [];
      console.log(`Pot ${pot.id}: looking for winners`, potWinners);
      console.log(`Pot ${pot.id}: eligible players`, pot.eligiblePlayers);
      
      const winnersInPot = potWinners.filter(w => pot.eligiblePlayers.includes(w));
      console.log(`Pot ${pot.id}: winners in pot`, winnersInPot);
      
      if (winnersInPot.length > 0) {
        const amountPerWinner = Math.floor(pot.amount / winnersInPot.length);
        const remainder = pot.amount % winnersInPot.length;
        
        const distribution: any = {};
        winnersInPot.forEach((winnerId, index) => {
          distribution[winnerId] = amountPerWinner + (index === 0 ? remainder : 0);
        });
        
        distributions.push({
          potId: pot.id,
          amount: pot.amount,
          winners: winnersInPot,
          distribution
        });
      }
    }
    
    return distributions;
  }

  reset(): void {
    this.pots = [];
    this.playerContributions.clear();
    this.totalPot = 0;
  }
}