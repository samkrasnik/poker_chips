export enum PlayerStatus {
  ACTIVE = 'active',
  FOLDED = 'folded',
  ALL_IN = 'all_in',
  SITTING_OUT = 'sitting_out',
  ELIMINATED = 'eliminated'
}

export interface PlayerAction {
  playerId: string;
  playerName: string;
  action: string;
  amount: number;
  timestamp: number;
  round: number;
  pot: number;
}

export class Player {
  id: string;
  name: string;
  seatNumber: number;
  stack: number;
  currentBet: number;
  status: PlayerStatus;
  hasActed: boolean;
  isDealer: boolean;
  isSmallBlind: boolean;
  isBigBlind: boolean;
  actionHistory: PlayerAction[];

  constructor(config: {
    id?: string;
    name: string;
    seatNumber: number;
    stack: number;
  }) {
    this.id = config.id || Math.random().toString(36).substr(2, 9);
    this.name = config.name;
    this.seatNumber = config.seatNumber;
    this.stack = config.stack;
    this.currentBet = 0;
    this.status = PlayerStatus.ACTIVE;
    this.hasActed = false;
    this.isDealer = false;
    this.isSmallBlind = false;
    this.isBigBlind = false;
    this.actionHistory = [];
  }

  bet(amount: number): number {
    const actualAmount = Math.min(amount, this.stack);
    this.stack -= actualAmount;
    this.currentBet += actualAmount;
    return actualAmount;
  }

  fold(): void {
    this.status = PlayerStatus.FOLDED;
  }

  allIn(): number {
    const amount = this.stack;
    this.currentBet += amount;
    this.stack = 0;
    this.status = PlayerStatus.ALL_IN;
    return amount;
  }

  addChips(amount: number): void {
    this.stack += amount;
  }

  resetForNewHand(): void {
    this.currentBet = 0;
    this.hasActed = false;
    this.status = this.stack > 0 ? PlayerStatus.ACTIVE : PlayerStatus.ELIMINATED;
    this.actionHistory = [];
  }

  resetForNewRound(): void {
    this.currentBet = 0;
    this.hasActed = false;
  }

  recordAction(action: PlayerAction): void {
    this.actionHistory.push(action);
  }
}