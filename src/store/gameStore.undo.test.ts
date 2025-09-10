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

describe('undo behavior around hand completion', () => {
  test('undo is disabled after hand completes and history is saved', () => {
    const store = useGameStore.getState();
    store.createNewGame({ startingStack: 100, smallBlind: 5, bigBlind: 10, bettingLimit: BettingLimit.NO_LIMIT });
    store.addPlayer('Alice');
    store.addPlayer('Bob');

    store.startHand();

    // During a hand, undo should be possible and hand history should be empty
    expect(useGameStore.getState().canUndo()).toBe(true);
    expect(useGameStore.getState().handHistory).toHaveLength(0);

    const game = useGameStore.getState().currentGame!;
    const aliceId = game.players[0].id;

    store.endHand([aliceId]);

    const after = useGameStore.getState();
    expect(after.handHistory).toHaveLength(1);
    expect(after.canUndo()).toBe(false);

    const handNumber = after.currentGame?.handNumber;
    after.undo();
    expect(useGameStore.getState().currentGame?.handNumber).toBe(handNumber);
  });
});

describe('undo restores full snapshot', () => {
  test('stats and hand history revert when undoing start of new hand', () => {
    const store = useGameStore.getState();
    store.createNewGame({ startingStack: 100, smallBlind: 5, bigBlind: 10, bettingLimit: BettingLimit.NO_LIMIT });
    store.addPlayer('Alice');
    store.addPlayer('Bob');

    store.startHand();
    const game = useGameStore.getState().currentGame!;
    const aliceId = game.players[0].id;
    store.endHand([aliceId]);

    const afterFirst = useGameStore.getState();
    const statsSnapshot = JSON.stringify(Array.from(afterFirst.playerStats.entries()));
    const historySnapshot = JSON.stringify(afterFirst.handHistory);

    store.startHand();
    expect(useGameStore.getState().stacksBeforeHand).not.toBeNull();
    expect(useGameStore.getState().currentHandStats).not.toBeNull();

    store.undo();
    const afterUndo = useGameStore.getState();
    expect(JSON.stringify(Array.from(afterUndo.playerStats.entries()))).toBe(statsSnapshot);
    expect(JSON.stringify(afterUndo.handHistory)).toBe(historySnapshot);
    expect(afterUndo.stacksBeforeHand).toBeNull();
    expect(afterUndo.currentHandStats).toBeNull();
  });
});
