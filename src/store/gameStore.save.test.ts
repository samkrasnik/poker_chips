import useGameStore from './gameStore';
import { BettingLimit } from '../models/Game';

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
  localStorage.clear();
});

describe('saveGame', () => {
  test('overwrites existing save with same name', () => {
    jest.useFakeTimers();

    const store = useGameStore.getState();
    store.createNewGame({ startingStack: 100, smallBlind: 5, bigBlind: 10, bettingLimit: BettingLimit.NO_LIMIT });
    store.addPlayer('Alice');
    store.addPlayer('Bob');

    jest.setSystemTime(1000);
    store.saveGame('Test Save');
    const firstSavedAt = useGameStore.getState().savedGames[0].savedAt;

    // Advance time and save again with the same name
    jest.setSystemTime(2000);
    store.saveGame('Test Save');
    const saves = useGameStore.getState().savedGames;

    expect(saves).toHaveLength(1);
    expect(saves[0].savedAt).toBe(2000);
  });
});
