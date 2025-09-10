import useGameStore from './gameStore';
import { ActionType, BettingLimit } from '../models/Game';

describe('folding leaves single winner', () => {
  beforeEach(() => {
    useGameStore.setState({
      currentGame: null,
      gameHistory: [],
      historyIndex: -1,
      savedGames: [],
      playerStats: new Map(),
      stacksBeforeHand: null,
      handHistory: [],
      currentHandStats: null
    });
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  test('only remaining player wins and receives pot', () => {
    const store = useGameStore.getState();
    store.createNewGame({ startingStack: 100, smallBlind: 5, bigBlind: 10, bettingLimit: BettingLimit.NO_LIMIT });
    store.addPlayer('Alice');
    store.addPlayer('Bob');
    store.addPlayer('Charlie');
    store.startHand();

    const game = useGameStore.getState().currentGame!;
    const alice = game.players.find(p => p.name === 'Alice')!; // Big blind
    const bob = game.players.find(p => p.name === 'Bob')!; // Dealer
    const charlie = game.players.find(p => p.name === 'Charlie')!; // Small blind

    // Bob folds, then Charlie folds ending the hand
    store.performAction(bob.id, ActionType.FOLD);
    store.performAction(charlie.id, ActionType.FOLD);

    const finalGame = useGameStore.getState().currentGame!;
    const finalAlice = finalGame.players.find(p => p.name === 'Alice')!;
    const finalBob = finalGame.players.find(p => p.name === 'Bob')!;
    const finalCharlie = finalGame.players.find(p => p.name === 'Charlie')!;

    // Pot distribution: Alice should win blinds (5 + 10)
    expect(finalAlice.stack).toBe(105);
    expect(finalBob.stack).toBe(100);
    expect(finalCharlie.stack).toBe(95);

    // Stats: only Alice credited with win
    const stats = useGameStore.getState().playerStats;
    expect(stats.get('Alice')?.handsWon).toBe(1);
    expect(stats.get('Bob')?.handsWon ?? 0).toBe(0);
    expect(stats.get('Charlie')?.handsWon ?? 0).toBe(0);

    // Hand history records single winner
    const handHistory = useGameStore.getState().handHistory;
    expect(handHistory).toHaveLength(1);
    expect(handHistory[0].winners).toEqual(['Alice']);
    const results = handHistory[0].players.reduce<Record<string, boolean>>((acc, p) => {
      acc[p.playerName] = p.won;
      return acc;
    }, {});
    expect(results['Alice']).toBe(true);
    expect(results['Bob']).toBe(false);
    expect(results['Charlie']).toBe(false);
  });
});
