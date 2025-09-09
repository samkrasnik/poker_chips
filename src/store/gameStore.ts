import { create } from 'zustand';
import { Game, GameStatus, ActionType, GameConfig, BettingLimit } from '../models/Game';
import { Player, PlayerStatus } from '../models/Player';
import { PotManager } from '../models/Pot';
import { isVPIPAction, updateVPIP } from '../utils/statsUtils';

interface SavedGame {
  id: string;
  name: string;
  savedAt: number;
  gameState: string;
}

interface ActionStats {
  raises: number;
  calls: number;
  folds: number;
  checks: number;
  bets: number;
  allIns: number;
  // Opportunities for each action
  raiseOpportunities: number;
  callOpportunities: number;
  foldOpportunities: number;
  checkOpportunities: number;
  betOpportunities: number;
}

interface PlayerStats {
  playerName: string;
  handsPlayed: number;
  handsWon: number;
  totalProfit: number;
  vpip: number; // Voluntary Put money In Pot percentage
  handsVoluntarilyPlayed: number;
  startingStack: number;
  actionStats: ActionStats;
}

interface HandPlayerResult {
  playerId: string;
  playerName: string;
  stackBefore: number;
  profit: number;
  won: boolean;
  vpip: boolean;
  actionStats: ActionStats;
}

interface HandHistoryEntry {
  timestamp: number;
  players: HandPlayerResult[];
  winners: string[]; // player names
}

interface HandTempStats {
  vpip: boolean;
  actionStats: ActionStats;
}

interface GameStore {
  currentGame: Game | null;
  gameHistory: string[];
  historyIndex: number;
  savedGames: SavedGame[];
  playerStats: Map<string, PlayerStats>;
  stacksBeforeHand: Map<string, number> | null;
  handHistory: HandHistoryEntry[];
  currentHandStats: Map<string, HandTempStats> | null;
  createNewGame: (config: GameConfig) => void;
  addPlayer: (name: string, seatNumber?: number, stack?: number) => void;
  removePlayer: (playerId: string) => void;
  startHand: () => void;
  performAction: (playerId: string, action: ActionType, amount?: number) => void;
  endHand: (winnerIds: string[]) => void;
  endHandWithPots: (potWinners: { [potId: string]: string[] }) => void;
  editPlayerStack: (playerId: string, newStack: number) => void;
  rebuyPlayer: (playerId: string, amount: number) => void;
  movePlayerSeat: (playerId: string, newSeat: number) => void;
  setDealer: (playerId: string) => void;
  resetGame: () => void;
  undo: () => void;
  canUndo: () => boolean;
  saveGame: (name?: string) => void;
  loadGame: (saveId: string) => void;
  deleteSavedGame: (saveId: string) => void;
  getSavedGames: () => SavedGame[];
  getPlayerStats: () => PlayerStats[];
  getHistoricalStats: (lastN?: number) => PlayerStats[];
  updatePlayerStats: () => void;
  loadSavedGamesFromStorage: () => void;
  loadPlayerStatsFromStorage: () => void;
  savePlayerStatsToStorage: () => void;
  loadHandHistoryFromStorage: () => void;
  saveHandHistoryToStorage: () => void;
}

const MAX_HISTORY = 50;
const MAX_SAVED_GAMES = 3;
const STORAGE_KEY_SAVED_GAMES = 'poker_saved_games';
const STORAGE_KEY_PLAYER_STATS = 'poker_player_stats';
const MAX_HAND_HISTORY = 1000;
const STORAGE_KEY_HAND_HISTORY = 'poker_hand_history';

const serializeGame = (game: Game): string => {
  // Convert Map to array for JSON serialization
  const gameData = {
    ...game,
    potManager: {
      ...game.potManager,
      playerContributions: Array.from(game.potManager.playerContributions.entries())
    }
  };
  return JSON.stringify(gameData);
};

const deserializeGame = (gameString: string): Game => {
  const gameData = JSON.parse(gameString);
  
  // Create new Game instance with config
  const game = new Game({
    name: gameData.name,
    maxPlayers: gameData.maxPlayers,
    startingStack: gameData.startingStack,
    smallBlind: gameData.smallBlind,
    bigBlind: gameData.bigBlind,
    ante: gameData.ante,
    bettingLimit: gameData.bettingLimit || BettingLimit.NO_LIMIT,
    minBet: gameData.minBet,
    minRaise: gameData.minRaise,
    totalRounds: gameData.totalRounds
  });
  
  // Copy all other properties
  Object.keys(gameData).forEach(key => {
    if (key !== 'players' && key !== 'potManager' && 
        key !== 'name' && key !== 'maxPlayers' && key !== 'startingStack' &&
        key !== 'smallBlind' && key !== 'bigBlind' && key !== 'ante' &&
        key !== 'bettingLimit' && key !== 'minBet' && key !== 'minRaise' && key !== 'totalRounds') {
      (game as any)[key] = gameData[key];
    }
  });
  
  // Recreate Player instances with proper prototype
  if (gameData.players && Array.isArray(gameData.players)) {
    game.players = gameData.players.map((playerData: any) => {
      const player = new Player({
        id: playerData.id,
        name: playerData.name,
        seatNumber: playerData.seatNumber,
        stack: playerData.stack
      });
      
      // Restore all player properties
      Object.keys(playerData).forEach(key => {
        if (key !== 'id' && key !== 'name' && key !== 'seatNumber' && key !== 'stack') {
          (player as any)[key] = playerData[key];
        }
      });
      
      return player;
    });
  }
  
  // Recreate PotManager instance with proper prototype
  const potManager = new PotManager();
  if (gameData.potManager) {
    potManager.pots = gameData.potManager.pots || [];
    potManager.totalPot = gameData.potManager.totalPot || 0;
    
    // Convert playerContributions back to Map
    if (gameData.potManager.playerContributions) {
      if (Array.isArray(gameData.potManager.playerContributions)) {
        potManager.playerContributions = new Map(gameData.potManager.playerContributions);
      } else {
        // If it was serialized as an object
        potManager.playerContributions = new Map(Object.entries(gameData.potManager.playerContributions || {}));
      }
    }
  }
  game.potManager = potManager;
  
  return game;
};

const saveToHistory = (game: Game | null): string => {
  return serializeGame(game as Game);
};

const restoreFromHistory = (historyItem: string): Game | null => {
  if (!historyItem) return null;
  return deserializeGame(historyItem);
};

const useGameStore = create<GameStore>()((set, get) => ({
    currentGame: null,
    gameHistory: [],
    historyIndex: -1,
    savedGames: [],
    playerStats: new Map(),
    stacksBeforeHand: null,
    handHistory: [],
    currentHandStats: null,

    createNewGame: (config: GameConfig) => {
      const newGame = new Game(config);
      const state = get();
      const newHistory = [...state.gameHistory.slice(0, state.historyIndex + 1), saveToHistory(newGame)];
      set({ 
        currentGame: newGame,
        gameHistory: newHistory.slice(-MAX_HISTORY),
        historyIndex: newHistory.length - 1
      });
      
      // Load saved games and stats from localStorage
      get().loadSavedGamesFromStorage();
      get().loadPlayerStatsFromStorage();
      get().loadHandHistoryFromStorage();
    },

    addPlayer: (name: string, seatNumber?: number, stack?: number) => {
      const game = get().currentGame;
      if (!game) return;
      
      try {
        game.addPlayer(name, seatNumber || null, stack || null);
        const state = get();
        const newHistory = [...state.gameHistory.slice(0, state.historyIndex + 1), saveToHistory(game)];
        set({ 
          currentGame: Object.assign(Object.create(Object.getPrototypeOf(game)), game),
          gameHistory: newHistory.slice(-MAX_HISTORY),
          historyIndex: newHistory.length - 1
        });
      } catch (error) {
        console.error('Failed to add player:', error);
        throw error;
      }
    },

    removePlayer: (playerId: string) => {
      const game = get().currentGame;
      if (!game) return;
      
      try {
        game.removePlayer(playerId);
        const state = get();
        const newHistory = [...state.gameHistory.slice(0, state.historyIndex + 1), saveToHistory(game)];
        set({ 
          currentGame: Object.assign(Object.create(Object.getPrototypeOf(game)), game),
          gameHistory: newHistory.slice(-MAX_HISTORY),
          historyIndex: newHistory.length - 1
        });
      } catch (error) {
        console.error('Failed to remove player:', error);
        throw error;
      }
    },

    startHand: () => {
      const game = get().currentGame;
      if (!game) {
        console.error('No current game found');
        return;
      }
      
      try {
        // Track VPIP stats before hand starts
        const state = get();
        const activePlayers = game.getActivePlayers();
        
        // Validate we have enough players
        if (activePlayers.length < 2) {
          throw new Error('Need at least 2 players to start');
        }
        
        // Store stacks before hand starts for profit calculation
        const stacksBeforeHand = new Map<string, number>();
        
        activePlayers.forEach(player => {
          // Store stack before hand
          stacksBeforeHand.set(player.id, player.stack);
          
          let stats = state.playerStats.get(player.name);
          if (!stats) {
            stats = {
              playerName: player.name,
              handsPlayed: 0,
              handsWon: 0,
              totalProfit: 0,
              vpip: 0,
              handsVoluntarilyPlayed: 0,
              startingStack: player.stack,
              actionStats: {
                raises: 0,
                calls: 0,
                folds: 0,
                checks: 0,
                bets: 0,
                allIns: 0,
                raiseOpportunities: 0,
                callOpportunities: 0,
                foldOpportunities: 0,
                checkOpportunities: 0,
                betOpportunities: 0
              }
            };
            state.playerStats.set(player.name, stats);
          }
          if (stats.handsVoluntarilyPlayed === undefined) {
            stats.handsVoluntarilyPlayed = 0;
          }
          stats.handsPlayed++;
          updateVPIP(stats, false);
        });

        const handStats = new Map<string, HandTempStats>();
        activePlayers.forEach(player => {
          handStats.set(player.id, {
            vpip: false,
            actionStats: {
              raises: 0,
              calls: 0,
              folds: 0,
              checks: 0,
              bets: 0,
              allIns: 0,
              raiseOpportunities: 0,
              callOpportunities: 0,
              foldOpportunities: 0,
              checkOpportunities: 0,
              betOpportunities: 0
            }
          });
        });

        // Store the stacks before hand starts
        game.startHand();

        const newHistory = [...state.gameHistory.slice(0, state.historyIndex + 1), saveToHistory(game)];
        set({
          currentGame: Object.assign(Object.create(Object.getPrototypeOf(game)), game),
          gameHistory: newHistory.slice(-MAX_HISTORY),
          historyIndex: newHistory.length - 1,
          playerStats: new Map(state.playerStats),
          stacksBeforeHand: stacksBeforeHand, // Store for profit calculation
          currentHandStats: handStats
        });
      } catch (error) {
        console.error('Failed to start hand:', error);
        // Don't corrupt state on error
        throw error;
      }
    },

    performAction: (playerId: string, action: ActionType, amount?: number) => {
      const game = get().currentGame;
      if (!game) return;
      
      try {
        // Track VPIP for voluntary betting actions pre-flop
        const state = get();
        const player = game.players.find(p => p.id === playerId);
        const handStats = state.currentHandStats?.get(playerId);
        
        if (player && !player.hasActedVoluntarily) {
          const didVPIP = isVPIPAction(
            player,
            action,
            game.currentBet,
            game.bigBlind,
            game.currentRound
          );
          if (didVPIP) {
            const stats = state.playerStats.get(player.name);
            if (stats && stats.handsPlayed > 0) {
              player.hasActedVoluntarily = true;
              updateVPIP(stats, true);
              if (handStats) handStats.vpip = true;
            }
          }
        }
        
        // Track action statistics
        if (player) {
          let stats = state.playerStats.get(player.name);
          if (!stats) {
            // Initialize stats if missing
            stats = {
              playerName: player.name,
              handsPlayed: 0,
              handsWon: 0,
              totalProfit: 0,
              vpip: 0,
              handsVoluntarilyPlayed: 0,
              startingStack: player.stack,
              actionStats: {
                raises: 0,
                calls: 0,
                folds: 0,
                checks: 0,
                bets: 0,
                allIns: 0,
                raiseOpportunities: 0,
                callOpportunities: 0,
                foldOpportunities: 0,
                checkOpportunities: 0,
                betOpportunities: 0
              }
            };
            state.playerStats.set(player.name, stats);
          }
          
          // Track opportunities (what actions were available)
          // Fold is always available when it's your turn
          if (player.status === PlayerStatus.ACTIVE) {
            stats.actionStats.foldOpportunities++;
            if (handStats) handStats.actionStats.foldOpportunities++;

            // Check if call is available (there's a bet to call)
            if (game.currentBet > player.currentBet) {
              stats.actionStats.callOpportunities++;
              if (handStats) handStats.actionStats.callOpportunities++;
              // Raise is available when there's a bet
              if (player.stack > (game.currentBet - player.currentBet)) {
                stats.actionStats.raiseOpportunities++;
                if (handStats) handStats.actionStats.raiseOpportunities++;
              }
            } else {
              // Check is available when there's no bet to call
              stats.actionStats.checkOpportunities++;
              if (handStats) handStats.actionStats.checkOpportunities++;
              // Bet is available when no one has bet yet
              if (game.currentBet === 0 ||
                  (player.isBigBlind && game.currentBet === game.bigBlind && game.currentRound === 0)) {
                stats.actionStats.betOpportunities++;
                if (handStats) handStats.actionStats.betOpportunities++;
              }
            }
          }
          
          // Track actual actions taken
          switch (action) {
            case ActionType.RAISE:
              stats.actionStats.raises++;
              if (handStats) handStats.actionStats.raises++;
              break;
            case ActionType.CALL:
              stats.actionStats.calls++;
              if (handStats) handStats.actionStats.calls++;
              break;
            case ActionType.FOLD:
              stats.actionStats.folds++;
              if (handStats) handStats.actionStats.folds++;
              break;
            case ActionType.CHECK:
              stats.actionStats.checks++;
              if (handStats) handStats.actionStats.checks++;
              break;
            case ActionType.BET:
              stats.actionStats.bets++;
              if (handStats) handStats.actionStats.bets++;
              break;
            case ActionType.ALL_IN:
              stats.actionStats.allIns++;
              if (handStats) handStats.actionStats.allIns++;
              break;
          }
        }
        
        // Store stacks before action for profit tracking
        const stacksBefore = new Map(game.players.map(p => [p.id, p.stack]));
        const statusBefore = game.status;
        
        game.performAction(playerId, action, amount || 0);
        
        const handEnded = statusBefore === GameStatus.IN_PROGRESS && game.status === GameStatus.WAITING;
        let updatedHandHistory = state.handHistory;
        let newCurrentHandStats = state.currentHandStats;
        if (handEnded) {
          // Hand ended due to everyone folding - find the winner
          const remainingPlayers = game.getPlayersInHand();
          const winnerIds = remainingPlayers.map(p => p.id);
          if (winnerIds.length === 1) {
            const winner = remainingPlayers[0];
            let winnerStats = state.playerStats.get(winner.name);
            if (winnerStats) {
              winnerStats.handsWon++;
            }
          }

          // Update profit stats for all players using stacks from before hand started
          const stacksBeforeHand = state.stacksBeforeHand || stacksBefore;
          game.players.forEach(p => {
            let stats = state.playerStats.get(p.name);
            if (stats && stacksBeforeHand.has(p.id)) {
              const stackBeforeHand = stacksBeforeHand.get(p.id) || 0;
              const profit = p.stack - stackBeforeHand;
              stats.totalProfit += profit;
            }
          });

          const handStatsMap = state.currentHandStats || new Map<string, HandTempStats>();
          const handEntry: HandHistoryEntry = {
            timestamp: Date.now(),
            winners: winnerIds.map(id => game.players.find(p => p.id === id)?.name || id),
            players: game.players.map(p => {
              const stackBeforeHand = stacksBeforeHand.get(p.id) || 0;
              const profit = p.stack - stackBeforeHand;
              const hs = handStatsMap.get(p.id);
              return {
                playerId: p.id,
                playerName: p.name,
                stackBefore: stackBeforeHand,
                profit,
                won: winnerIds.includes(p.id),
                vpip: hs?.vpip || false,
                actionStats: hs?.actionStats || {
                  raises: 0,
                  calls: 0,
                  folds: 0,
                  checks: 0,
                  bets: 0,
                  allIns: 0,
                  raiseOpportunities: 0,
                  callOpportunities: 0,
                  foldOpportunities: 0,
                  checkOpportunities: 0,
                  betOpportunities: 0
                }
              } as HandPlayerResult;
            })
          };

          updatedHandHistory = [...state.handHistory, handEntry].slice(-MAX_HAND_HISTORY);
          newCurrentHandStats = null;

          // Save stats to localStorage
          get().savePlayerStatsToStorage();
          get().saveHandHistoryToStorage();
        }

        const newHistory = [...state.gameHistory.slice(0, state.historyIndex + 1), saveToHistory(game)];
        set({
          currentGame: Object.assign(Object.create(Object.getPrototypeOf(game)), game),
          gameHistory: newHistory.slice(-MAX_HISTORY),
          historyIndex: newHistory.length - 1,
          playerStats: new Map(state.playerStats),
          handHistory: updatedHandHistory,
          currentHandStats: newCurrentHandStats
        });
      } catch (error) {
        console.error('Failed to perform action:', error);
        throw error;
      }
    },

    endHand: (winnerIds: string[]) => {
      const game = get().currentGame;
      if (!game) return;
      
      try {
        // Track stats before ending hand
        const state = get();
        winnerIds.forEach(winnerId => {
          const winner = game.players.find(p => p.id === winnerId);
          if (winner) {
            let stats = state.playerStats.get(winner.name);
            if (stats) {
              stats.handsWon++;
            }
          }
        });
        
        // Get stacks from before the hand started
        const stacksBeforeHand = state.stacksBeforeHand || new Map(game.players.map(p => [p.id, p.stack]));
        
        game.endHand(winnerIds);

        // Update profit stats using stacks from before hand started
        game.players.forEach(player => {
          let stats = state.playerStats.get(player.name);
          if (stats && stacksBeforeHand.has(player.id)) {
            const stackBeforeHand = stacksBeforeHand.get(player.id) || 0;
            const profit = player.stack - stackBeforeHand;
            stats.totalProfit += profit;
          }
        });

        const handStatsMap = state.currentHandStats || new Map<string, HandTempStats>();
        const handEntry: HandHistoryEntry = {
          timestamp: Date.now(),
          winners: winnerIds.map(id => game.players.find(p => p.id === id)?.name || id),
          players: game.players.map(p => {
            const stackBeforeHand = stacksBeforeHand.get(p.id) || 0;
            const profit = p.stack - stackBeforeHand;
            const hs = handStatsMap.get(p.id);
            return {
              playerId: p.id,
              playerName: p.name,
              stackBefore: stackBeforeHand,
              profit,
              won: winnerIds.includes(p.id),
              vpip: hs?.vpip || false,
              actionStats: hs?.actionStats || {
                raises: 0,
                calls: 0,
                folds: 0,
                checks: 0,
                bets: 0,
                allIns: 0,
                raiseOpportunities: 0,
                callOpportunities: 0,
                foldOpportunities: 0,
                checkOpportunities: 0,
                betOpportunities: 0
              }
            } as HandPlayerResult;
          })
        };

        const updatedHandHistory = [...state.handHistory, handEntry].slice(-MAX_HAND_HISTORY);

        const newHistory = [...state.gameHistory.slice(0, state.historyIndex + 1), saveToHistory(game)];
        set({
          currentGame: Object.assign(Object.create(Object.getPrototypeOf(game)), game),
          gameHistory: newHistory.slice(-MAX_HISTORY),
          historyIndex: newHistory.length - 1,
          playerStats: new Map(state.playerStats),
          handHistory: updatedHandHistory,
          currentHandStats: null
        });

        // Save stats to localStorage
        get().savePlayerStatsToStorage();
        get().saveHandHistoryToStorage();
      } catch (error) {
        console.error('Failed to end hand:', error);
        throw error;
      }
    },

    endHandWithPots: (potWinners: { [potId: string]: string[] }) => {
      const game = get().currentGame;
      if (!game) return;
      
      try {
        // Track stats before ending hand
        const state = get();
        
        // Get unique winners (player might win multiple pots)
        const uniqueWinnerIds = new Set(Object.values(potWinners).flat());
        uniqueWinnerIds.forEach(winnerId => {
          const winner = game.players.find(p => p.id === winnerId);
          if (winner) {
            let stats = state.playerStats.get(winner.name);
            if (stats) {
              stats.handsWon++;
            }
          }
        });
        
        // Get stacks from before the hand started
        const stacksBeforeHand = state.stacksBeforeHand || new Map(game.players.map(p => [p.id, p.stack]));
        
        game.endHandWithPots(potWinners);

        // Update profit stats using stacks from before hand started
        game.players.forEach(player => {
          let stats = state.playerStats.get(player.name);
          if (stats && stacksBeforeHand.has(player.id)) {
            const stackBeforeHand = stacksBeforeHand.get(player.id) || 0;
            const profit = player.stack - stackBeforeHand;
            stats.totalProfit += profit;
          }
        });

        const handStatsMap = state.currentHandStats || new Map<string, HandTempStats>();
        const handEntry: HandHistoryEntry = {
          timestamp: Date.now(),
          winners: Array.from(uniqueWinnerIds).map(id => game.players.find(p => p.id === id)?.name || id),
          players: game.players.map(p => {
            const stackBeforeHand = stacksBeforeHand.get(p.id) || 0;
            const profit = p.stack - stackBeforeHand;
            const hs = handStatsMap.get(p.id);
            return {
              playerId: p.id,
              playerName: p.name,
              stackBefore: stackBeforeHand,
              profit,
              won: uniqueWinnerIds.has(p.id),
              vpip: hs?.vpip || false,
              actionStats: hs?.actionStats || {
                raises: 0,
                calls: 0,
                folds: 0,
                checks: 0,
                bets: 0,
                allIns: 0,
                raiseOpportunities: 0,
                callOpportunities: 0,
                foldOpportunities: 0,
                checkOpportunities: 0,
                betOpportunities: 0
              }
            } as HandPlayerResult;
          })
        };

        const updatedHandHistory = [...state.handHistory, handEntry].slice(-MAX_HAND_HISTORY);

        const newHistory = [...state.gameHistory.slice(0, state.historyIndex + 1), saveToHistory(game)];
        set({
          currentGame: Object.assign(Object.create(Object.getPrototypeOf(game)), game),
          gameHistory: newHistory.slice(-MAX_HISTORY),
          historyIndex: newHistory.length - 1,
          playerStats: new Map(state.playerStats),
          handHistory: updatedHandHistory,
          currentHandStats: null
        });

        // Save stats to localStorage
        get().savePlayerStatsToStorage();
        get().saveHandHistoryToStorage();
      } catch (error) {
        console.error('Failed to end hand with pots:', error);
        throw error;
      }
    },

    editPlayerStack: (playerId: string, newStack: number) => {
      const game = get().currentGame;
      if (!game) return;
      
      const player = game.players.find(p => p.id === playerId);
      if (!player) return;
      
      // Only allow editing when game is not in progress
      if (game.status === GameStatus.IN_PROGRESS) {
        console.error('Cannot edit stack during a hand');
        return;
      }
      
      player.stack = newStack;
      // If player was eliminated and now has chips, reactivate them
      if (player.status === PlayerStatus.ELIMINATED && newStack > 0) {
        player.status = PlayerStatus.ACTIVE;
      }
      // If player has no chips, eliminate them
      if (newStack === 0) {
        player.status = PlayerStatus.ELIMINATED;
      }
      
      const state = get();
      const newHistory = [...state.gameHistory.slice(0, state.historyIndex + 1), saveToHistory(game)];
      set({ 
        currentGame: Object.assign(Object.create(Object.getPrototypeOf(game)), game),
        gameHistory: newHistory.slice(-MAX_HISTORY),
        historyIndex: newHistory.length - 1
      });
    },

    rebuyPlayer: (playerId: string, amount: number) => {
      const game = get().currentGame;
      if (!game) return;
      
      const player = game.players.find(p => p.id === playerId);
      if (!player) return;
      
      // Only allow rebuy when game is not in progress
      if (game.status === GameStatus.IN_PROGRESS) {
        console.error('Cannot rebuy during a hand');
        return;
      }
      
      player.stack += amount;
      // Reactivate eliminated player
      if (player.status === PlayerStatus.ELIMINATED) {
        player.status = PlayerStatus.ACTIVE;
      }
      
      const state = get();
      const newHistory = [...state.gameHistory.slice(0, state.historyIndex + 1), saveToHistory(game)];
      set({
        currentGame: Object.assign(Object.create(Object.getPrototypeOf(game)), game),
        gameHistory: newHistory.slice(-MAX_HISTORY),
        historyIndex: newHistory.length - 1
      });
    },

    movePlayerSeat: (playerId: string, newSeat: number) => {
      const game = get().currentGame;
      if (!game) return;

      // Only allow seat changes when game is not in progress
      if (game.status === GameStatus.IN_PROGRESS) {
        console.error('Cannot move seats during a hand');
        return;
      }

      try {
        game.movePlayerSeat(playerId, newSeat);
      } catch (error) {
        console.error('Failed to move player seat:', error);
        return;
      }

      const state = get();
      const newHistory = [...state.gameHistory.slice(0, state.historyIndex + 1), saveToHistory(game)];
      set({
        currentGame: Object.assign(Object.create(Object.getPrototypeOf(game)), game),
        gameHistory: newHistory.slice(-MAX_HISTORY),
        historyIndex: newHistory.length - 1
      });
    },

    setDealer: (playerId: string) => {
      const game = get().currentGame;
      if (!game) return;

      // Only allow dealer change when game is not in progress
      if (game.status === GameStatus.IN_PROGRESS) {
        console.error('Cannot change dealer during a hand');
        return;
      }

      game.setDealerButton(playerId);

      const state = get();
      const newHistory = [...state.gameHistory.slice(0, state.historyIndex + 1), saveToHistory(game)];
      set({
        currentGame: Object.assign(Object.create(Object.getPrototypeOf(game)), game),
        gameHistory: newHistory.slice(-MAX_HISTORY),
        historyIndex: newHistory.length - 1
      });
    },

    resetGame: () => {
      set({
        currentGame: null,
        gameHistory: [],
        historyIndex: -1
      });
    },
    
    undo: () => {
      const state = get();
      if (state.historyIndex > 0) {
        const newIndex = state.historyIndex - 1;
        const restoredGame = restoreFromHistory(state.gameHistory[newIndex]);
        set({
          currentGame: restoredGame,
          historyIndex: newIndex
        });
      }
    },
    
    canUndo: () => {
      const state = get();
      return state.historyIndex > 0;
    },
    
    saveGame: (name?: string) => {
      const state = get();
      if (!state.currentGame) return;
      
      const savedGames = get().getSavedGames();
      
      // Check if we're at max saved games
      if (savedGames.length >= MAX_SAVED_GAMES) {
        // Remove the oldest saved game
        savedGames.shift();
      }
      
      const savedGame: SavedGame = {
        id: Math.random().toString(36).substr(2, 9),
        name: name || state.currentGame.name || `Saved Game ${new Date().toLocaleString()}`,
        savedAt: Date.now(),
        gameState: serializeGame(state.currentGame)
      };
      
      const newSavedGames = [...savedGames, savedGame];
      localStorage.setItem(STORAGE_KEY_SAVED_GAMES, JSON.stringify(newSavedGames));
      set({ savedGames: newSavedGames });
    },
    
    loadGame: (saveId: string) => {
      const savedGames = get().getSavedGames();
      const savedGame = savedGames.find(sg => sg.id === saveId);
      
      if (savedGame) {
        try {
          const restoredGame = deserializeGame(savedGame.gameState);
          
          // Validate the restored game
          if (!restoredGame.potManager || typeof restoredGame.potManager.reset !== 'function') {
            console.error('PotManager not properly restored');
            throw new Error('Failed to restore game state properly');
          }
          
          // Validate players
          if (restoredGame.players && restoredGame.players.length > 0) {
            const invalidPlayer = restoredGame.players.find(p => typeof p.resetForNewHand !== 'function');
            if (invalidPlayer) {
              console.error('Player not properly restored:', invalidPlayer);
              throw new Error('Failed to restore player state properly');
            }
          }
          
          const newHistory = [saveToHistory(restoredGame)];
          set({
            currentGame: restoredGame,
            gameHistory: newHistory,
            historyIndex: 0
          });
        } catch (error) {
          console.error('Failed to load game:', error);
          alert('Failed to load saved game. The save file may be corrupted.');
        }
      }
    },
    
    deleteSavedGame: (saveId: string) => {
      const savedGames = get().getSavedGames();
      const newSavedGames = savedGames.filter(sg => sg.id !== saveId);
      localStorage.setItem(STORAGE_KEY_SAVED_GAMES, JSON.stringify(newSavedGames));
      set({ savedGames: newSavedGames });
    },
    
    getSavedGames: () => {
      const state = get();
      if (state.savedGames.length === 0) {
        get().loadSavedGamesFromStorage();
      }
      return state.savedGames;
    },
    
    loadSavedGamesFromStorage: () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_SAVED_GAMES);
        if (saved) {
          const savedGames = JSON.parse(saved) as SavedGame[];
          // Validate that saved games have proper structure
          const validSavedGames = savedGames.filter(sg => {
            try {
              // Try to deserialize to validate it
              const testGame = deserializeGame(sg.gameState);
              return testGame && testGame.players;
            } catch (e) {
              console.warn('Invalid saved game found, skipping:', sg.name);
              return false;
            }
          });
          set({ savedGames: validSavedGames });
        }
      } catch (error) {
        console.error('Failed to load saved games:', error);
        set({ savedGames: [] });
      }
    },
    
    loadPlayerStatsFromStorage: () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_PLAYER_STATS);
        if (saved) {
          const statsArray = JSON.parse(saved) as PlayerStats[];
          // Ensure backwards compatibility - add actionStats if missing
          const fixedStats = statsArray.map(s => ({
            ...s,
            actionStats: s.actionStats || {
              raises: 0,
              calls: 0,
              folds: 0,
              checks: 0,
              bets: 0,
              allIns: 0,
              raiseOpportunities: 0,
              callOpportunities: 0,
              foldOpportunities: 0,
              checkOpportunities: 0,
              betOpportunities: 0
            }
          }));
          const statsMap = new Map(fixedStats.map(s => [s.playerName, s]));
          set({ playerStats: statsMap });
        }
      } catch (error) {
        console.error('Failed to load player stats:', error);
      }
    },
    
    savePlayerStatsToStorage: () => {
      const state = get();
      const statsArray = Array.from(state.playerStats.values());
      localStorage.setItem(STORAGE_KEY_PLAYER_STATS, JSON.stringify(statsArray));
    },

    getPlayerStats: () => {
      const state = get();
      if (state.playerStats.size === 0) {
        get().loadPlayerStatsFromStorage();
      }
      return Array.from(state.playerStats.values());
    },

    getHistoricalStats: (lastN?: number) => {
      const state = get();
      if (state.handHistory.length === 0) {
        get().loadHandHistoryFromStorage();
      }
      const history = lastN ? state.handHistory.slice(-lastN) : state.handHistory;
      const statsMap = new Map<string, PlayerStats>();

      history.forEach(hand => {
        hand.players.forEach(p => {
          let stats = statsMap.get(p.playerName);
          if (!stats) {
            stats = {
              playerName: p.playerName,
              handsPlayed: 0,
              handsWon: 0,
              totalProfit: 0,
              vpip: 0,
              handsVoluntarilyPlayed: 0,
              startingStack: p.stackBefore,
              actionStats: {
                raises: 0,
                calls: 0,
                folds: 0,
                checks: 0,
                bets: 0,
                allIns: 0,
                raiseOpportunities: 0,
                callOpportunities: 0,
                foldOpportunities: 0,
                checkOpportunities: 0,
                betOpportunities: 0
              }
            };
            statsMap.set(p.playerName, stats);
          }

          stats.handsPlayed++;
          if (p.won) stats.handsWon++;
          stats.totalProfit += p.profit;
          if (p.vpip) stats.handsVoluntarilyPlayed++;

          const a = stats.actionStats;
          const pa = p.actionStats;
          a.raises += pa.raises;
          a.calls += pa.calls;
          a.folds += pa.folds;
          a.checks += pa.checks;
          a.bets += pa.bets;
          a.allIns += pa.allIns;
          a.raiseOpportunities += pa.raiseOpportunities;
          a.callOpportunities += pa.callOpportunities;
          a.foldOpportunities += pa.foldOpportunities;
          a.checkOpportunities += pa.checkOpportunities;
          a.betOpportunities += pa.betOpportunities;
        });
      });

      return Array.from(statsMap.values()).map(s => ({
        ...s,
        vpip: s.handsPlayed > 0 ? parseFloat(((s.handsVoluntarilyPlayed / s.handsPlayed) * 100).toFixed(1)) : 0
      }));
    },

    loadHandHistoryFromStorage: () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_HAND_HISTORY);
        if (saved) {
          const history = JSON.parse(saved) as HandHistoryEntry[];
          set({ handHistory: history });
        }
      } catch (error) {
        console.error('Failed to load hand history:', error);
      }
    },

    saveHandHistoryToStorage: () => {
      const state = get();
      localStorage.setItem(STORAGE_KEY_HAND_HISTORY, JSON.stringify(state.handHistory));
    },

    updatePlayerStats: () => {
      // Stats are updated automatically in action methods
      // This method exists for manual refresh if needed
      get().savePlayerStatsToStorage();
    }
  }));

export default useGameStore;