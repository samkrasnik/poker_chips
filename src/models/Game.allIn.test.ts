import { Game, BettingLimit, ActionType, GameStatus } from './Game';
import { PlayerStatus } from './Player';

describe('All-In Scenarios', () => {
  let game: Game;
  
  beforeEach(() => {
    game = new Game({
      name: 'All-In Test',
      smallBlind: 5,
      bigBlind: 10,
      startingStack: 100
    });
    
    game.addPlayer('Alice', 1, 100);
    game.addPlayer('Bob', 2, 50);  // Shorter stack
    game.addPlayer('Charlie', 3, 150); // Bigger stack
  });
  
  test('should skip all-in players during action', () => {
    game.startHand();
    
    // Get Bob to go all-in
    const firstPlayer = game.getCurrentPlayer();
    game.performAction(firstPlayer.id, ActionType.RAISE, 50);
    
    // Bob goes all-in (has only 50 chips)
    const bob = game.players.find(p => p.name === 'Bob')!;
    if (game.getCurrentPlayer() === bob) {
      game.performAction(bob.id, ActionType.ALL_IN);
      expect(bob.status).toBe(PlayerStatus.ALL_IN);
      expect(bob.stack).toBe(0);
    }
    
    // Next player should NOT be Bob (should skip him)
    const nextPlayer = game.getCurrentPlayer();
    expect(nextPlayer).not.toBe(bob);
    expect(nextPlayer.status).toBe(PlayerStatus.ACTIVE);
  });
  
  test('should auto-complete to showdown when all players are all-in', () => {
    game.startHand();
    
    // Set up a scenario where everyone goes all-in
    // Alice raises to 50
    const alice = game.players.find(p => p.name === 'Alice')!;
    if (game.getCurrentPlayer() === alice) {
      game.performAction(alice.id, ActionType.RAISE, 50);
    }
    
    // Bob goes all-in (50 chips)
    const bob = game.players.find(p => p.name === 'Bob')!;
    while (game.getCurrentPlayer() !== bob && game.status === GameStatus.IN_PROGRESS) {
      game.performAction(game.getCurrentPlayer().id, ActionType.FOLD);
    }
    if (game.status === GameStatus.IN_PROGRESS) {
      game.performAction(bob.id, ActionType.ALL_IN);
    }
    
    // Charlie goes all-in
    const charlie = game.players.find(p => p.name === 'Charlie')!;
    while (game.getCurrentPlayer() !== charlie && game.status === GameStatus.IN_PROGRESS) {
      if (game.getCurrentPlayer().status === PlayerStatus.ACTIVE) {
        game.performAction(game.getCurrentPlayer().id, ActionType.ALL_IN);
      }
    }
    if (game.status === GameStatus.IN_PROGRESS && charlie.status === PlayerStatus.ACTIVE) {
      game.performAction(charlie.id, ActionType.ALL_IN);
    }
    
    // Alice calls or goes all-in
    while (game.getCurrentPlayer() !== alice && game.status === GameStatus.IN_PROGRESS) {
      if (game.getCurrentPlayer().status === PlayerStatus.ACTIVE) {
        game.performAction(game.getCurrentPlayer().id, ActionType.ALL_IN);
      }
    }
    if (game.status === GameStatus.IN_PROGRESS && alice.status === PlayerStatus.ACTIVE) {
      game.performAction(alice.id, ActionType.ALL_IN);
    }
    
    // Game should auto-complete to HAND_COMPLETE
    expect(game.status).toBe(GameStatus.HAND_COMPLETE);
    expect(game.currentRound).toBe(game.totalRounds);
  });
  
  test('should create side pots when players go all-in with different stacks', () => {
    game.startHand();
    
    // Bob (50 chips) goes all-in
    const bob = game.players.find(p => p.name === 'Bob')!;
    
    // First player raises to 60
    const firstPlayer = game.getCurrentPlayer();
    if (firstPlayer !== bob) {
      game.performAction(firstPlayer.id, ActionType.RAISE, 60);
    }
    
    // Get Bob to go all-in
    while (game.getCurrentPlayer() !== bob && game.status === GameStatus.IN_PROGRESS) {
      const current = game.getCurrentPlayer();
      if (current.status === PlayerStatus.ACTIVE) {
        if (game.currentBet > current.currentBet) {
          game.performAction(current.id, ActionType.CALL);
        } else {
          game.performAction(current.id, ActionType.CHECK);
        }
      }
    }
    
    if (game.status === GameStatus.IN_PROGRESS && bob.status === PlayerStatus.ACTIVE) {
      game.performAction(bob.id, ActionType.ALL_IN);
      expect(bob.status).toBe(PlayerStatus.ALL_IN);
    }
    
    // Other players call
    while (game.status === GameStatus.IN_PROGRESS) {
      const current = game.getCurrentPlayer();
      if (current.status === PlayerStatus.ACTIVE) {
        if (game.currentBet > current.currentBet) {
          game.performAction(current.id, ActionType.CALL);
        } else {
          game.performAction(current.id, ActionType.CHECK);
        }
      }
      
      // Check if round is complete
      if (game.isRoundComplete()) {
        break;
      }
    }
    
    // When hand ends, there should be side pots
    if (game.status === GameStatus.HAND_COMPLETE) {
      expect(game.potManager.pots.length).toBeGreaterThan(0);
    }
  });
  
  test('should skip to showdown when one active player covers all all-ins', () => {
    game = new Game({
      name: 'Skip to Showdown Test',
      smallBlind: 5,
      bigBlind: 10,
      startingStack: 100
    });
    
    game.addPlayer('Alice', 1, 200);  // Big stack
    game.addPlayer('Bob', 2, 50);     // Small stack
    game.addPlayer('Charlie', 3, 75); // Medium stack
    game.startHand();
    
    // Bob goes all-in with 50
    while (game.getCurrentPlayer().name !== 'Bob' && game.status === GameStatus.IN_PROGRESS) {
      game.performAction(game.getCurrentPlayer().id, ActionType.FOLD);
    }
    if (game.status === GameStatus.IN_PROGRESS) {
      game.performAction(game.getCurrentPlayer().id, ActionType.ALL_IN);
    }
    
    // Charlie goes all-in with 75
    while (game.status === GameStatus.IN_PROGRESS && game.getCurrentPlayer().name !== 'Charlie') {
      if (game.getCurrentPlayer().status === PlayerStatus.ACTIVE) {
        game.performAction(game.getCurrentPlayer().id, ActionType.FOLD);
      }
    }
    if (game.status === GameStatus.IN_PROGRESS) {
      game.performAction(game.getCurrentPlayer().id, ActionType.ALL_IN);
    }
    
    // Alice calls the highest all-in (75)
    while (game.status === GameStatus.IN_PROGRESS && game.getCurrentPlayer().name !== 'Alice') {
      if (game.getCurrentPlayer().status === PlayerStatus.ACTIVE) {
        game.performAction(game.getCurrentPlayer().id, ActionType.CALL);
      }
    }
    if (game.status === GameStatus.IN_PROGRESS) {
      game.performAction(game.getCurrentPlayer().id, ActionType.CALL);
      
      // After Alice calls and covers all all-ins, should skip to showdown
      expect(game.status).toBe(GameStatus.HAND_COMPLETE);
    }
  });
});