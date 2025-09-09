import { calculateSidePots } from '../utils/potUtils';

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
    this.pots = calculateSidePots(this.playerContributions, players);
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