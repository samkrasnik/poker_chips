import useGameStore from './gameStore';
import { BettingLimit, ActionType, GameStatus } from '../models/Game';

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

describe('undo after loading mid-hand', () => {
  test('allows undoing actions up to start of hand', () => {
    const store = useGameStore.getState();
    store.createNewGame({ startingStack: 100, smallBlind: 5, bigBlind: 10, bettingLimit: BettingLimit.NO_LIMIT });
    store.addPlayer('Alice');
    store.addPlayer('Bob');

    store.startHand();
    const game = useGameStore.getState().currentGame!;
    const bobId = game.players.find(p => p.name === 'Bob')!.id;

    // Bob calls to match big blind
    store.performAction(bobId, ActionType.CALL);

    // Save game in the middle of the hand
    store.saveGame('mid');
    const saveId = useGameStore.getState().savedGames[0].id;

    // Reset store to simulate reloading the application
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
    useGameStore.getState().loadSavedGamesFromStorage();

    // Load the saved game
    useGameStore.getState().loadGame(saveId);
    let state = useGameStore.getState();
    const bobAfterLoad = state.currentGame!.players.find(p => p.name === 'Bob')!;
    expect(bobAfterLoad.stack).toBe(90);
    expect(state.canUndo()).toBe(true);

    // Undo Bob's call back to start of hand
    state.undo();
    state = useGameStore.getState();
    const bobAfterUndo = state.currentGame!.players.find(p => p.name === 'Bob')!;
    expect(bobAfterUndo.stack).toBe(95);
    expect(state.currentGame!.status).toBe(GameStatus.IN_PROGRESS);
    expect(state.canUndo()).toBe(false);
  });
});
