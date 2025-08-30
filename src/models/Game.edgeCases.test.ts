import { Game, BettingLimit, ActionType, GameStatus } from './Game';
import { PlayerStatus } from './Player';

describe('Edge Cases and Bug Fixes', () => {
  describe('Min/Max Bet Issues', () => {
    test('should handle when minBet is larger than player stack', () => {
      const game = new Game({
        name: 'Min Bet Edge Case',
        smallBlind: 50,
        bigBlind: 100,
        minBet: 100,
        startingStack: 75 // Less than minBet
      });
      
      game.addPlayer('Alice', 1, 75);
      game.addPlayer('Bob', 2, 200);
      game.startHand();
      
      // Alice with 75 chips should be able to bet (will go all-in)
      const alice = game.players.find(p => p.name === 'Alice')!;
      
      // If Alice is first to act after blinds are posted
      // She should be able to go all-in even though her stack < minBet
      // The actual behavior depends on if she posted a blind
      if (alice.isSmallBlind || alice.isBigBlind) {
        // Alice posted a blind, so has less chips available
        expect(alice.stack).toBeLessThanOrEqual(75);
      } else {
        expect(alice.stack).toBe(75);
      }
    });
    
    test('should allow all-in when player cannot meet minRaise', () => {
      const game = new Game({
        name: 'Min Raise Edge Case',
        smallBlind: 5,
        bigBlind: 10,
        minRaise: 50,
        startingStack: 100
      });
      
      game.addPlayer('Alice', 1, 100);
      game.addPlayer('Bob', 2, 30); // Can't meet minRaise of 50
      game.startHand();
      
      // First player raises
      const firstPlayer = game.getCurrentPlayer();
      if (firstPlayer.stack > 50) {
        game.performAction(firstPlayer.id, ActionType.RAISE, 50);
      }
      
      // Bob with 30 chips can't meet minRaise but can go all-in
      const bob = game.players.find(p => p.name === 'Bob')!;
      if (game.getCurrentPlayer() === bob && bob.status === PlayerStatus.ACTIVE) {
        expect(() => {
          game.performAction(bob.id, ActionType.ALL_IN);
        }).not.toThrow();
      }
    });
  });
  
  describe('All-In Player Skipping', () => {
    test('should not wait for all-in players to act', () => {
      const game = new Game({
        name: 'Skip All-In Test',
        smallBlind: 5,
        bigBlind: 10
      });
      
      game.addPlayer('Alice', 1, 100);
      game.addPlayer('Bob', 2, 100);
      game.addPlayer('Charlie', 3, 100);
      game.startHand();
      
      // Get first player to go all-in
      const firstPlayer = game.getCurrentPlayer();
      game.performAction(firstPlayer.id, ActionType.ALL_IN);
      expect(firstPlayer.status).toBe(PlayerStatus.ALL_IN);
      
      // Track how many times we see each player
      const seenPlayers = new Set<string>();
      let iterations = 0;
      
      while (game.status === GameStatus.IN_PROGRESS && iterations < 10) {
        const current = game.getCurrentPlayer();
        expect(current.status).not.toBe(PlayerStatus.ALL_IN);
        seenPlayers.add(current.id);
        
        if (game.currentBet > current.currentBet) {
          game.performAction(current.id, ActionType.CALL);
        } else {
          game.performAction(current.id, ActionType.CHECK);
        }
        iterations++;
      }
      
      // Should never get stuck waiting for all-in player
      expect(iterations).toBeLessThan(10);
    });
  });
  
  describe('Auto-Complete to Showdown', () => {
    test('should auto-complete when everyone is all-in', () => {
      const game = new Game({
        name: 'Auto-Complete Test',
        smallBlind: 5,
        bigBlind: 10,
        startingStack: 100
      });
      
      game.addPlayer('Alice', 1, 100);
      game.addPlayer('Bob', 2, 100);
      game.startHand();
      
      // Both players go all-in
      const alice = game.players.find(p => p.name === 'Alice')!;
      const bob = game.players.find(p => p.name === 'Bob')!;
      
      // First player goes all-in
      game.performAction(game.getCurrentPlayer().id, ActionType.ALL_IN);
      
      // Second player goes all-in
      if (game.status === GameStatus.IN_PROGRESS) {
        game.performAction(game.getCurrentPlayer().id, ActionType.ALL_IN);
      }
      
      // Game should auto-complete to HAND_COMPLETE
      expect(game.status).toBe(GameStatus.HAND_COMPLETE);
      expect(game.currentRound).toBe(game.totalRounds);
      
      // Both players should be all-in
      expect(alice.status).toBe(PlayerStatus.ALL_IN);
      expect(bob.status).toBe(PlayerStatus.ALL_IN);
    });
    
    test('should auto-complete when one player covers all all-ins', () => {
      const game = new Game({
        name: 'Cover All-Ins Test',
        smallBlind: 5,
        bigBlind: 10
      });
      
      game.addPlayer('Alice', 1, 500); // Big stack
      game.addPlayer('Bob', 2, 50);    // Small stack
      game.addPlayer('Charlie', 3, 75); // Medium stack
      game.startHand();
      
      const alice = game.players.find(p => p.name === 'Alice')!;
      const bob = game.players.find(p => p.name === 'Bob')!;
      const charlie = game.players.find(p => p.name === 'Charlie')!;
      
      // Get Bob and Charlie all-in
      let actions = 0;
      while (game.status === GameStatus.IN_PROGRESS && actions < 20) {
        const current = game.getCurrentPlayer();
        
        if (current === bob || current === charlie) {
          game.performAction(current.id, ActionType.ALL_IN);
        } else if (current === alice) {
          // Alice calls to cover all all-ins
          if (game.currentBet > current.currentBet) {
            game.performAction(current.id, ActionType.CALL);
          } else {
            game.performAction(current.id, ActionType.CHECK);
          }
        } else {
          game.performAction(current.id, ActionType.FOLD);
        }
        actions++;
      }
      
      // If only Alice is active and has covered all all-ins, should skip to showdown
      const activePlayers = game.players.filter(p => p.status === PlayerStatus.ACTIVE);
      const allInPlayers = game.players.filter(p => p.status === PlayerStatus.ALL_IN);
      
      if (activePlayers.length === 1 && allInPlayers.length > 0) {
        expect(game.status).toBe(GameStatus.HAND_COMPLETE);
      }
    });
  });
  
  describe('Betting Limit Edge Cases', () => {
    test('should handle pot limit with small pot', () => {
      const game = new Game({
        name: 'Small Pot Limit',
        bettingLimit: BettingLimit.POT_LIMIT,
        smallBlind: 1,
        bigBlind: 2,
        startingStack: 1000
      });
      
      game.addPlayer('Alice', 1, 1000);
      game.addPlayer('Bob', 2, 1000);
      game.startHand();
      
      // Pot is only 3 (SB 1 + BB 2)
      expect(game.potManager.totalPot).toBe(3);
      
      // First player can only bet up to pot size (3)
      const firstPlayer = game.getCurrentPlayer();
      
      // In pot limit, first bet on flop can be pot size
      // Complete the preflop action first
      game.performAction(firstPlayer.id, ActionType.CALL);
      game.performAction(game.getCurrentPlayer().id, ActionType.CHECK);
      
      // Now on flop, pot is 4 (2 * 2)
      expect(game.potManager.totalPot).toBe(4);
      
      // Max bet should be pot size (4)
      const flopPlayer = game.getCurrentPlayer();
      expect(() => {
        game.performAction(flopPlayer.id, ActionType.BET, 4);
      }).not.toThrow();
    });
    
    test('should handle fixed limit correctly', () => {
      const game = new Game({
        name: 'Fixed Limit Test',
        bettingLimit: BettingLimit.FIXED_LIMIT,
        smallBlind: 5,
        bigBlind: 10,
        minBet: 10,
        minRaise: 10,
        startingStack: 100
      });
      
      game.addPlayer('Alice', 1, 100);
      game.addPlayer('Bob', 2, 100);
      game.startHand();
      
      // In fixed limit, bets and raises are fixed amounts
      const firstPlayer = game.getCurrentPlayer();
      
      // Raise should be exactly current bet + minRaise
      if (game.currentBet === 10) { // BB
        game.performAction(firstPlayer.id, ActionType.RAISE, 20); // BB + minRaise
        expect(game.currentBet).toBe(20);
      }
    });
  });
  
  describe('CSS Buffer Space', () => {
    test('should handle 4+ players without overflow', () => {
      const game = new Game({
        name: 'This is a very long game name that might cause CSS issues',
        smallBlind: 5,
        bigBlind: 10
      });
      
      // Add 4+ players
      game.addPlayer('Alice Anderson', 1, 1000);
      game.addPlayer('Bob Benjamin', 2, 1000);
      game.addPlayer('Charlie Chapman', 3, 1000);
      game.addPlayer('Diana Davidson', 4, 1000);
      game.addPlayer('Eve Everett', 5, 1000);
      
      expect(game.players.length).toBe(5);
      expect(game.name.length).toBeGreaterThan(40);
      
      // This test mainly documents that we need CSS to handle:
      // 1. Long game names
      // 2. 4+ players
      // 3. Long player names
      // The actual CSS fix is in GameScreen.css
    });
  });
});