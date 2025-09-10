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

describe('loading preserved dealer', () => {
  test('restores dealer from dealerPosition when flag missing', () => {
    const store = useGameStore.getState();
    store.createNewGame({ startingStack: 100, smallBlind: 5, bigBlind: 10, bettingLimit: BettingLimit.NO_LIMIT });
    store.addPlayer('Alice');
    store.addPlayer('Bob');
    const bob = useGameStore.getState().currentGame!.players[1];

    // Save the game
    store.saveGame('test');
    const savedGames = JSON.parse(localStorage.getItem('poker_saved_games')!);
    const gameState = JSON.parse(savedGames[0].gameState);
    // Remove isDealer flags to simulate old save format
    gameState.players.forEach((p: any) => delete p.isDealer);
    savedGames[0].gameState = JSON.stringify(gameState);
    localStorage.setItem('poker_saved_games', JSON.stringify(savedGames));

    // Load and verify dealer
    store.loadGame(savedGames[0].id);
    const loadedGame = useGameStore.getState().currentGame!;
    const dealer = loadedGame.players[loadedGame.dealerPosition];
    expect(dealer.id).toBe(bob.id);
    expect(dealer.isDealer).toBe(true);
  });
});
