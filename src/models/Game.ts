import { Player, PlayerStatus } from './Player';
import { PotManager } from './Pot';

export enum GameStatus {
  WAITING = 'waiting',
  IN_PROGRESS = 'in_progress',
  HAND_COMPLETE = 'hand_complete',
  PAUSED = 'paused',
  FINISHED = 'finished'
}

export enum BettingLimit {
  NO_LIMIT = 'no_limit',
  POT_LIMIT = 'pot_limit',
  FIXED_LIMIT = 'fixed_limit'
}

export enum ActionType {
  CHECK = 'check',
  BET = 'bet',
  CALL = 'call',
  RAISE = 'raise',
  FOLD = 'fold',
  ALL_IN = 'all_in',
  POST_BLIND = 'post_blind',
  POST_ANTE = 'post_ante'
}

export interface GameConfig {
  name?: string;
  maxPlayers?: number;
  startingStack?: number;
  smallBlind?: number;
  bigBlind?: number;
  ante?: number;
  bettingLimit?: BettingLimit;
  minBet?: number;
  minRaise?: number;
  totalRounds?: number;
}

export class Game {
  id: string;
  name: string;
  status: GameStatus;
  players: Player[];
  maxPlayers: number;
  startingStack: number;
  smallBlind: number;
  bigBlind: number;
  ante: number;
  bettingLimit: BettingLimit;
  minBet: number;
  minRaise: number;
  dealerPosition: number;
  currentPlayerIndex: number;
  currentRound: number;
  totalRounds: number;
  handNumber: number;
  potManager: PotManager;
  currentBet: number;
  history: any[];
  actionHistory: any[];

  constructor(config: GameConfig = {}) {
    this.id = Math.random().toString(36).substr(2, 9);
    this.name = config.name || `Game ${new Date().toLocaleString()}`;
    this.status = GameStatus.WAITING;
    this.players = [];
    this.maxPlayers = config.maxPlayers || 10;
    this.startingStack = config.startingStack || 1000;
    this.smallBlind = config.smallBlind || 5;
    this.bigBlind = config.bigBlind || 10;
    this.ante = config.ante || 0;
    this.bettingLimit = config.bettingLimit || BettingLimit.NO_LIMIT;
    this.minBet = config.minBet || this.bigBlind;
    this.minRaise = config.minRaise || this.bigBlind;
    this.dealerPosition = 0;
    this.currentPlayerIndex = 0;
    this.currentRound = 0;
    this.totalRounds = config.totalRounds || 4;
    this.handNumber = 0;
    this.potManager = new PotManager();
    this.currentBet = 0;
    this.history = [];
    this.actionHistory = [];
  }

  addPlayer(name: string, seatNumber: number | null = null, stack: number | null = null): Player {
    if (this.players.length >= this.maxPlayers) {
      throw new Error('Game is full');
    }

    const seat = seatNumber !== null ? seatNumber : this.getNextAvailableSeat();
    const player = new Player({
      name,
      seatNumber: seat,
      stack: stack || this.startingStack
    });

    this.players.push(player);
    this.sortPlayersBySeat();
    if (this.players.length >= 2 && !this.players.some(p => p.isDealer)) {
      this.players[1].isDealer = true;
      this.dealerPosition = 1;
    } else {
      this.dealerPosition = this.players.findIndex(p => p.isDealer);
    }
    return player;
  }

  removePlayer(playerId: string): void {
    const index = this.players.findIndex(p => p.id === playerId);
    if (index === -1) {
      throw new Error('Player not found');
    }
    this.players.splice(index, 1);
    
    if (this.currentPlayerIndex >= this.players.length) {
      this.currentPlayerIndex = 0;
    }
  }

  getNextAvailableSeat(): number {
    for (let i = 1; i <= this.maxPlayers; i++) {
      if (!this.players.some(p => p.seatNumber === i)) {
        return i;
      }
    }
    throw new Error('No available seats');
  }

  sortPlayersBySeat(): void {
    this.players.sort((a, b) => a.seatNumber - b.seatNumber);
  }

  movePlayerSeat(playerId: string, newSeat: number): void {
    const player = this.players.find(p => p.id === playerId);
    if (!player) {
      throw new Error('Player not found');
    }
    if (newSeat < 1 || newSeat > this.maxPlayers) {
      throw new Error('Invalid seat number');
    }

    const occupyingPlayer = this.players.find(p => p.seatNumber === newSeat);
    if (occupyingPlayer) {
      occupyingPlayer.seatNumber = player.seatNumber;
    }

    player.seatNumber = newSeat;
    this.sortPlayersBySeat();
    this.dealerPosition = this.players.findIndex(p => p.isDealer);
  }

  setDealerButton(playerId: string): void {
    const index = this.players.findIndex(p => p.id === playerId);
    if (index === -1) {
      throw new Error('Player not found');
    }

    this.players.forEach(p => (p.isDealer = false));
    this.players[index].isDealer = true;
    this.dealerPosition = index;
  }

  startHand(): void {
    if (this.getActivePlayers().length < 2) {
      throw new Error('Need at least 2 players to start');
    }

    this.handNumber++;
    this.status = GameStatus.IN_PROGRESS;
    this.currentRound = 0;
    
    // Ensure potManager has proper methods
    if (typeof this.potManager.reset === 'function') {
      this.potManager.reset();
    } else {
      console.warn('PotManager reset method not found, recreating PotManager');
      this.potManager = new PotManager();
    }
    
    this.players.forEach(player => {
      if (typeof player.resetForNewHand === 'function') {
        player.resetForNewHand();
      } else {
        console.error('Player resetForNewHand method not found for player:', player.name);
        throw new Error('Player object is not properly initialized. Please refresh the page.');
      }
    });

    if (!this.players.some(p => p.isDealer)) {
      this.moveDealerButton();
    }
    this.postBlindsAndAntes();
    this.determineFirstActor();
  }

  moveDealerButton(): void {
    const activePlayers = this.getActivePlayers();
    if (activePlayers.length === 0) return;

    do {
      this.dealerPosition = (this.dealerPosition + 1) % this.players.length;
    } while (this.players[this.dealerPosition].status === PlayerStatus.ELIMINATED);

    this.players.forEach(p => p.isDealer = false);
    this.players[this.dealerPosition].isDealer = true;
  }

  postBlindsAndAntes(): void {
    const activePlayers = this.getActivePlayers();
    
    if (this.ante > 0) {
      activePlayers.forEach(player => {
        const anteAmount = Math.min(this.ante, player.stack);
        if (anteAmount > 0) {
          player.bet(anteAmount);
          this.potManager.addBet(player.id, anteAmount);
        }
      });
    }

    if (activePlayers.length === 2) {
      // Heads up: dealer is SB
      const sbIndex = this.dealerPosition;
      const bbIndex = (this.dealerPosition + 1) % this.players.length;
      
      this.postBlind(this.players[sbIndex], this.smallBlind, true);
      this.postBlind(this.players[bbIndex], this.bigBlind, false);
    } else {
      const sbIndex = (this.dealerPosition + 1) % this.players.length;
      const bbIndex = (this.dealerPosition + 2) % this.players.length;
      
      this.postBlind(this.players[sbIndex], this.smallBlind, true);
      this.postBlind(this.players[bbIndex], this.bigBlind, false);
    }
    
    this.currentBet = this.bigBlind;
  }

  postBlind(player: Player, amount: number, isSmallBlind: boolean): void {
    if (player.status === PlayerStatus.ELIMINATED) return;
    
    const blindAmount = Math.min(amount, player.stack);
    if (blindAmount > 0) {
      if (blindAmount === player.stack) {
        player.allIn();
      } else {
        player.bet(blindAmount);
      }
      
      this.potManager.addBet(player.id, blindAmount);
      
      if (isSmallBlind) {
        player.isSmallBlind = true;
      } else {
        player.isBigBlind = true;
      }
    }
  }

  determineFirstActor(): void {
    if (this.currentRound === 0) {
      // Preflop
      const activePlayers = this.getActivePlayers();
      if (activePlayers.length === 2) {
        // Heads up: dealer/SB acts first preflop
        this.currentPlayerIndex = this.dealerPosition;
      } else {
        // Regular: UTG (left of BB) acts first
        this.currentPlayerIndex = (this.dealerPosition + 3) % this.players.length;
      }
    } else {
      // Postflop: find first active player left of dealer
      let index = (this.dealerPosition + 1) % this.players.length;
      let attempts = 0;
      
      while (attempts < this.players.length) {
        if (this.canPlayerAct(this.players[index])) {
          this.currentPlayerIndex = index;
          return;
        }
        index = (index + 1) % this.players.length;
        attempts++;
      }
      
      this.currentPlayerIndex = this.dealerPosition;
      return;
    }
    
    // Make sure we're on a player who can act for preflop
    let attempts = 0;
    while (!this.canPlayerAct(this.players[this.currentPlayerIndex]) && attempts < this.players.length) {
      this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
      attempts++;
    }
  }

  canPlayerAct(player: Player): boolean {
    return player.status === PlayerStatus.ACTIVE;
  }

  getCurrentPlayer(): Player {
    return this.players[this.currentPlayerIndex];
  }

  getActivePlayers(): Player[] {
    return this.players.filter(p => 
      p.status === PlayerStatus.ACTIVE || 
      p.status === PlayerStatus.ALL_IN
    );
  }

  getPlayersInHand(): Player[] {
    return this.players.filter(p => 
      p.status !== PlayerStatus.FOLDED && 
      p.status !== PlayerStatus.ELIMINATED &&
      p.status !== PlayerStatus.SITTING_OUT
    );
  }

  performAction(playerId: string, action: ActionType, amount: number = 0): void {
    const player = this.players.find(p => p.id === playerId);
    if (!player) {
      throw new Error('Player not found');
    }

    if (this.players[this.currentPlayerIndex].id !== playerId) {
      throw new Error('Not this player\'s turn');
    }

    switch (action) {
      case ActionType.CHECK:
        this.handleCheck(player);
        break;
      case ActionType.BET:
        this.handleBet(player, amount);
        break;
      case ActionType.CALL:
        this.handleCall(player);
        break;
      case ActionType.RAISE:
        this.handleRaise(player, amount);
        break;
      case ActionType.FOLD:
        this.handleFold(player);
        break;
      case ActionType.ALL_IN:
        this.handleAllIn(player);
        break;
      default:
        throw new Error('Invalid action');
    }

    player.hasActed = true;
    this.recordAction(player, action, amount);
    
    // Check if only one player remains
    const remainingPlayers = this.getPlayersInHand();
    if (remainingPlayers.length === 1) {
      // Create pots before ending hand
      this.potManager.createSidePots(this.players);
      this.endHand([remainingPlayers[0].id]);
      return;
    }
    
    // Check if we should auto-complete (everyone all-in except maybe one)
    const activePlayers = this.players.filter(p => p.status === PlayerStatus.ACTIVE);
    const allInPlayers = this.players.filter(p => p.status === PlayerStatus.ALL_IN);
    
    if (activePlayers.length === 0 && allInPlayers.length > 1) {
      // Everyone is all-in, skip to showdown
      this.currentRound = this.totalRounds;
      this.status = GameStatus.HAND_COMPLETE;
      this.potManager.createSidePots(this.players);
      return;
    }
    
    if (activePlayers.length === 1 && allInPlayers.length > 0) {
      // Only one player can act, check if they should auto-complete
      const activePlayer = activePlayers[0];
      const maxAllInBet = Math.max(...allInPlayers.map(p => p.currentBet), 0);
      
      if (activePlayer.currentBet >= maxAllInBet && activePlayer.hasActed) {
        // Active player has covered all all-ins and acted, skip to showdown
        this.currentRound = this.totalRounds;
        this.status = GameStatus.HAND_COMPLETE;
        this.potManager.createSidePots(this.players);
        return;
      }
    }
    
    // Move to next player
    this.moveToNextPlayer();
    
    // Check if betting round is complete
    if (this.isRoundComplete()) {
      this.endRound();
    }
  }

  handleCheck(player: Player): void {
    if (this.currentBet > player.currentBet) {
      throw new Error('Cannot check, must call or fold');
    }
  }

  handleBet(player: Player, amount: number): void {
    if (this.currentBet > 0) {
      throw new Error('Cannot bet, betting already started');
    }
    
    if (amount < this.minBet) {
      throw new Error(`Bet must be at least ${this.minBet}`);
    }
    
    if (amount > player.stack) {
      throw new Error('Insufficient chips');
    }
    
    player.bet(amount);
    this.potManager.addBet(player.id, amount);
    this.currentBet = amount;
    
    // Reset hasActed for all other active players
    this.players.forEach((p, index) => {
      if (index !== this.currentPlayerIndex && p.status === PlayerStatus.ACTIVE) {
        p.hasActed = false;
      }
    });
  }

  handleCall(player: Player): void {
    const callAmount = this.currentBet - player.currentBet;
    
    if (callAmount <= 0) {
      throw new Error('Nothing to call');
    }
    
    if (callAmount >= player.stack) {
      this.handleAllIn(player);
      return;
    }
    
    player.bet(callAmount);
    this.potManager.addBet(player.id, callAmount);
  }

  handleRaise(player: Player, raiseToAmount: number): void {
    const callAmount = this.currentBet - player.currentBet;
    const raiseAmount = raiseToAmount - this.currentBet;
    
    if (raiseAmount < this.minRaise) {
      throw new Error(`Raise must be at least ${this.minRaise}`);
    }
    
    const totalRequired = callAmount + raiseAmount;
    
    if (totalRequired > player.stack) {
      throw new Error('Insufficient chips');
    }
    
    player.bet(totalRequired);
    this.potManager.addBet(player.id, totalRequired);
    this.currentBet = raiseToAmount;
    
    // Reset hasActed for all other active players
    this.players.forEach((p, index) => {
      if (index !== this.currentPlayerIndex && p.status === PlayerStatus.ACTIVE) {
        p.hasActed = false;
      }
    });
  }

  handleFold(player: Player): void {
    player.fold();
  }

  handleAllIn(player: Player): void {
    const amount = player.allIn();
    this.potManager.addBet(player.id, amount);
    
    if (player.currentBet > this.currentBet) {
      this.currentBet = player.currentBet;
      
      // Reset hasActed for all other active players
      this.players.forEach((p, index) => {
        if (index !== this.currentPlayerIndex && p.status === PlayerStatus.ACTIVE) {
          p.hasActed = false;
        }
      });
    }
  }

  moveToNextPlayer(): void {
    let attempts = 0;
    do {
      this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
      attempts++;
      if (attempts > this.players.length) {
        break;
      }
    } while (!this.canPlayerAct(this.players[this.currentPlayerIndex]));
  }

  isRoundComplete(): boolean {
    const activePlayers = this.players.filter(p => 
      p.status === PlayerStatus.ACTIVE
    );
    
    // No active players left who can act
    if (activePlayers.length === 0) {
      return true;
    }
    
    // Only one active player left
    if (activePlayers.length === 1) {
      const allInPlayers = this.players.filter(p => p.status === PlayerStatus.ALL_IN);
      if (allInPlayers.length === 0) {
        return true;
      }
      // One active player and some all-in players
      return activePlayers[0].hasActed;
    }
    
    // Check if all active players have acted AND matched the current bet
    const allActed = activePlayers.every(p => p.hasActed);
    const allMatched = activePlayers.every(p => p.currentBet === this.currentBet);
    
    return allActed && allMatched;
  }

  endRound(): void {
    this.currentRound++;
    
    if (this.currentRound >= this.totalRounds) {
      this.status = GameStatus.HAND_COMPLETE;
      // Create final pots when hand is complete
      this.potManager.createSidePots(this.players);
      return;
    }
    
    // Check if all remaining players are all-in (no more betting possible)
    const activePlayers = this.players.filter(p => p.status === PlayerStatus.ACTIVE);
    const allInPlayers = this.players.filter(p => p.status === PlayerStatus.ALL_IN);
    
    if (activePlayers.length === 0 && allInPlayers.length > 1) {
      // Everyone is all-in, skip to showdown
      this.currentRound = this.totalRounds;
      this.status = GameStatus.HAND_COMPLETE;
      this.potManager.createSidePots(this.players);
      return;
    }
    
    if (activePlayers.length === 1 && allInPlayers.length > 0) {
      // Only one player can act, check if they've matched the highest all-in
      const maxAllIn = Math.max(...allInPlayers.map(p => p.currentBet));
      if (activePlayers[0].currentBet >= maxAllIn) {
        // Active player has covered all all-ins, skip to showdown
        this.currentRound = this.totalRounds;
        this.status = GameStatus.HAND_COMPLETE;
        this.potManager.createSidePots(this.players);
        return;
      }
    }
    
    // Reset for new round
    this.players.forEach(player => player.resetForNewRound());
    this.currentBet = 0;
    
    // Only create side pots if there are all-in players
    const hasAllInPlayers = this.players.some(p => p.status === PlayerStatus.ALL_IN);
    if (hasAllInPlayers) {
      this.potManager.createSidePots(this.players);
    }
    
    // Determine who acts first in the new round
    this.determineFirstActor();
  }

  endHand(winnerIds: string[]): void {
    // Don't recreate pots if they already exist
    if (this.potManager.pots.length === 0) {
      this.potManager.createSidePots(this.players);
    }
    
    // Distribute pots to winners
    const distributions = this.potManager.distributePots({
      default: winnerIds
    });
    
    // Add winnings to player stacks
    distributions.forEach(dist => {
      Object.entries(dist.distribution).forEach(([playerId, amount]) => {
        const player = this.players.find(p => p.id === playerId);
        if (player) {
          player.addChips(amount as number);
        }
      });
    });
    
    // Reset game status
    this.status = GameStatus.WAITING;

    // Prepare for next hand
    this.currentRound = 0;

    // Reset pot manager after distribution
    this.potManager.reset();
    
    // Reset all players for next hand
    this.players.forEach(player => {
      player.resetForNewHand();
      player.isSmallBlind = false;
      player.isBigBlind = false;
    });

    this.moveDealerButton();
  }

  endHandWithPots(potWinners: { [potId: string]: string[] }): void {
    // Don't recreate pots - they should already exist!
    // If no pots exist, create them
    if (this.potManager.pots.length === 0) {
      this.potManager.createSidePots(this.players);
    }
    
    console.log('Pots:', this.potManager.pots);
    console.log('Pot winners:', potWinners);
    
    // Distribute pots to specific winners
    const distributions = this.potManager.distributePots(potWinners);
    
    console.log('Distributions:', distributions);
    
    // Add winnings to player stacks
    distributions.forEach(dist => {
      Object.entries(dist.distribution).forEach(([playerId, amount]) => {
        const player = this.players.find(p => p.id === playerId);
        if (player) {
          console.log(`Adding ${amount} chips to ${player.name} (was ${player.stack})`);
          player.addChips(amount as number);
          console.log(`${player.name} now has ${player.stack}`);
        }
      });
    });
    
    // Reset game status
    this.status = GameStatus.WAITING;

    // Prepare for next hand
    this.currentRound = 0;

    // Reset pot manager after distribution
    this.potManager.reset();
    
    // Reset all players for next hand
    this.players.forEach(player => {
      player.resetForNewHand();
      player.isSmallBlind = false;
      player.isBigBlind = false;
    });

    this.moveDealerButton();
  }

  recordAction(player: Player, action: ActionType, amount: number): void {
    const actionRecord = {
      playerId: player.id,
      playerName: player.name,
      action,
      amount,
      timestamp: Date.now(),
      round: this.currentRound,
      pot: this.potManager.totalPot
    };
    
    this.actionHistory.push(actionRecord);
    player.recordAction(actionRecord);
  }
}