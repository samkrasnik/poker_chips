import useGameStore from './gameStore';
import { ActionType, BettingLimit } from '../models/Game';

beforeEach(() => {
  useGameStore.setState({
    currentGame: null,
    gameHistory: [],
    historyIndex: -1,
    savedGames: [],
    playerStats: new Map(),
    stacksBeforeHand: null
  });
  localStorage.clear();
});

describe('VPIP tracking across hands', () => {
  test('VPIP decreases when player folds pre-flop', () => {
    const store = useGameStore.getState();
    store.createNewGame({ startingStack: 100, smallBlind: 5, bigBlind: 10, bettingLimit: BettingLimit.NO_LIMIT });
    store.addPlayer('Alice');
    store.addPlayer('Bob');
    store.startHand();

    let game = useGameStore.getState().currentGame!;
    const bob = game.players.find(p => p.name === 'Bob')!; // dealer/SB
    const alice = game.players.find(p => p.name === 'Alice')!; // BB

    // Bob calls the big blind (counts toward VPIP)
    store.performAction(bob.id, ActionType.CALL);
    // Alice folds, ending the hand
    store.performAction(alice.id, ActionType.FOLD);

    // Start second hand
    store.startHand();
    game = useGameStore.getState().currentGame!;
    const alice2 = game.players.find(p => p.name === 'Alice')!; // dealer/SB
    const bob2 = game.players.find(p => p.name === 'Bob')!; // BB

    // Alice raises, Bob folds without voluntarily putting chips in pot
    store.performAction(alice2.id, ActionType.RAISE, game.bigBlind * 2);
    store.performAction(bob2.id, ActionType.FOLD);

    const bobStats = useGameStore.getState().playerStats.get('Bob')!;
    expect(bobStats.handsPlayed).toBe(2);
    expect(bobStats.handsVoluntarilyPlayed).toBe(1);
    expect(bobStats.vpip).toBe(50);
  });
});
