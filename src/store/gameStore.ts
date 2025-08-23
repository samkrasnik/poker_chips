import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { Game, GameStatus, ActionType, GameConfig } from '../models/Game';
import { PlayerStatus } from '../models/Player';

interface GameStore {
  currentGame: Game | null;
  createNewGame: (config: GameConfig) => void;
  addPlayer: (name: string, seatNumber?: number, stack?: number) => void;
  removePlayer: (playerId: string) => void;
  startHand: () => void;
  performAction: (playerId: string, action: ActionType, amount?: number) => void;
  endHand: (winnerIds: string[]) => void;
  endHandWithPots: (potWinners: { [potId: string]: string[] }) => void;
  editPlayerStack: (playerId: string, newStack: number) => void;
  rebuyPlayer: (playerId: string, amount: number) => void;
  resetGame: () => void;
}

const useGameStore = create<GameStore>()(
  immer((set, get) => ({
    currentGame: null,

    createNewGame: (config: GameConfig) => {
      set(state => {
        state.currentGame = new Game(config);
      });
    },

    addPlayer: (name: string, seatNumber?: number, stack?: number) => {
      const game = get().currentGame;
      if (!game) return;
      
      try {
        game.addPlayer(name, seatNumber || null, stack || null);
        set(state => {
          state.currentGame = game;
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
        set(state => {
          state.currentGame = game;
        });
      } catch (error) {
        console.error('Failed to remove player:', error);
        throw error;
      }
    },

    startHand: () => {
      const game = get().currentGame;
      if (!game) return;
      
      try {
        game.startHand();
        set(state => {
          state.currentGame = Object.assign(Object.create(Object.getPrototypeOf(game)), game);
        });
      } catch (error) {
        console.error('Failed to start hand:', error);
        throw error;
      }
    },

    performAction: (playerId: string, action: ActionType, amount?: number) => {
      const game = get().currentGame;
      if (!game) return;
      
      try {
        game.performAction(playerId, action, amount || 0);
        set(state => {
          state.currentGame = Object.assign(Object.create(Object.getPrototypeOf(game)), game);
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
        game.endHand(winnerIds);
        set(state => {
          state.currentGame = Object.assign(Object.create(Object.getPrototypeOf(game)), game);
        });
      } catch (error) {
        console.error('Failed to end hand:', error);
        throw error;
      }
    },

    endHandWithPots: (potWinners: { [potId: string]: string[] }) => {
      const game = get().currentGame;
      if (!game) return;
      
      try {
        game.endHandWithPots(potWinners);
        set(state => {
          state.currentGame = Object.assign(Object.create(Object.getPrototypeOf(game)), game);
        });
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
      
      set(state => {
        state.currentGame = Object.assign(Object.create(Object.getPrototypeOf(game)), game);
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
      
      set(state => {
        state.currentGame = Object.assign(Object.create(Object.getPrototypeOf(game)), game);
      });
    },

    resetGame: () => {
      set(state => {
        state.currentGame = null;
      });
    }
  }))
);

export default useGameStore;