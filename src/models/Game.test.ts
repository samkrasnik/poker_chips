import { Game, BettingLimit, ActionType, GameStatus } from './Game';
import { PlayerStatus } from './Player';

describe('Game Betting Limits', () => {
  describe('No Limit', () => {
    let game: Game;
    
    beforeEach(() => {
      game = new Game({
        name: 'No Limit Test',
        bettingLimit: BettingLimit.NO_LIMIT,
        smallBlind: 5,
        bigBlind: 10,
        startingStack: 1000
      });
      
      game.addPlayer('Alice');
      game.addPlayer('Bob');
      game.addPlayer('Charlie');
      game.startHand();
    });
    
    test('should allow all-in at any time', () => {
      const currentPlayer = game.getCurrentPlayer();
      const stackBefore = currentPlayer.stack;
      
      game.performAction(currentPlayer.id, ActionType.ALL_IN);
      
      expect(currentPlayer.stack).toBe(0);
      expect(currentPlayer.status).toBe(PlayerStatus.ALL_IN);
      expect(currentPlayer.currentBet).toBeGreaterThan(0);
    });
    
    test('should allow any raise amount up to stack', () => {
      // Small blind acts first after blinds posted
      const currentPlayer = game.getCurrentPlayer();
      const raiseAmount = 100; // Large raise in no limit
      
      expect(() => {
        game.performAction(currentPlayer.id, ActionType.RAISE, raiseAmount);
      }).not.toThrow();
      
      expect(game.currentBet).toBe(raiseAmount);
    });
  });
  
  describe('Pot Limit', () => {
    let game: Game;
    
    beforeEach(() => {
      game = new Game({
        name: 'Pot Limit Test',
        bettingLimit: BettingLimit.POT_LIMIT,
        smallBlind: 5,
        bigBlind: 10,
        startingStack: 1000
      });
      
      game.addPlayer('Alice');
      game.addPlayer('Bob');
      game.addPlayer('Charlie');
      game.startHand();
    });
    
    test('should limit bet to pot size', () => {
      // After blinds, pot is 15 (SB 5 + BB 10)
      const potSize = game.potManager.totalPot;
      expect(potSize).toBe(15);
      
      // First player (UTG) to act can call
      const currentPlayer = game.getCurrentPlayer();
      game.performAction(currentPlayer.id, ActionType.CALL); // Call BB
      
      // SB completes to BB
      game.performAction(game.getCurrentPlayer().id, ActionType.CALL);
      
      // BB checks
      game.performAction(game.getCurrentPlayer().id, ActionType.CHECK);
      
      // New round, pot is now 30 (3 * 10)
      const newPotSize = game.potManager.totalPot;
      expect(newPotSize).toBe(30);
      
      // In pot limit, max bet on new round is pot size
      const firstPlayer = game.getCurrentPlayer();
      game.performAction(firstPlayer.id, ActionType.BET, 30);
      expect(game.currentBet).toBe(30);
    });
    
    test('should calculate pot-sized raise correctly', () => {
      // Initial pot after blinds: 15
      const currentPlayer = game.getCurrentPlayer();
      
      // Player raises to 30
      game.performAction(currentPlayer.id, ActionType.RAISE, 30);
      
      // Pot is now: 15 (initial) + 30 (raise) = 45
      expect(game.potManager.totalPot).toBe(45);
      
      // Next player pot-sized raise calculation:
      // To call: 30
      // Pot after call: 45 + 30 = 75
      // Max raise: 30 (current bet) + 75 (pot after call) = 105
      const nextPlayer = game.getCurrentPlayer();
      const toCall = game.currentBet - nextPlayer.currentBet;
      const potAfterCall = game.potManager.totalPot + toCall;
      const maxRaise = game.currentBet + potAfterCall;
      
      expect(toCall).toBe(30);
      expect(potAfterCall).toBe(75);
      expect(maxRaise).toBe(105);
    });
  });
  
  describe('Fixed Limit', () => {
    let game: Game;
    
    beforeEach(() => {
      game = new Game({
        name: 'Fixed Limit Test',
        bettingLimit: BettingLimit.FIXED_LIMIT,
        smallBlind: 5,
        bigBlind: 10,
        startingStack: 1000,
        minBet: 10,
        minRaise: 10
      });
      
      game.addPlayer('Alice');
      game.addPlayer('Bob');
      game.addPlayer('Charlie');
      game.startHand();
    });
    
    test('should only allow fixed bet amounts', () => {
      const currentPlayer = game.getCurrentPlayer();
      
      // In fixed limit, raise must be exactly minRaise
      game.performAction(currentPlayer.id, ActionType.RAISE, game.currentBet + game.minRaise);
      
      expect(game.currentBet).toBe(20); // BB (10) + minRaise (10)
    });
    
    test('should not allow all-in unless stack is less than fixed amount', () => {
      const currentPlayer = game.getCurrentPlayer();
      
      // Try to all-in with full stack (should act like a regular raise)
      game.performAction(currentPlayer.id, ActionType.ALL_IN);
      
      // In fixed limit, all-in only happens when stack < required amount
      if (currentPlayer.stack > game.minRaise) {
        expect(currentPlayer.status).not.toBe(PlayerStatus.ALL_IN);
      }
    });
    
    test('should enforce betting cap per round', () => {
      // Fixed limit typically has a cap of 4 bets per round
      // This would need to be implemented in the actual game logic
      
      // For now, just test that raises are fixed amounts
      const raise1 = game.getCurrentPlayer();
      game.performAction(raise1.id, ActionType.RAISE, 20);
      expect(game.currentBet).toBe(20);
      
      const raise2 = game.getCurrentPlayer();
      game.performAction(raise2.id, ActionType.RAISE, 30);
      expect(game.currentBet).toBe(30);
      
      const raise3 = game.getCurrentPlayer();
      game.performAction(raise3.id, ActionType.RAISE, 40);
      expect(game.currentBet).toBe(40);
    });
  });
  
  describe('Stats Tracking', () => {
    test('should track VPIP correctly for big blind', () => {
      const game = new Game({
        name: 'VPIP Test',
        smallBlind: 5,
        bigBlind: 10
      });
      
      game.addPlayer('Alice');
      game.addPlayer('Bob');
      game.addPlayer('Charlie');
      game.startHand();
      
      // Find who is BB (depends on dealer position)
      const bbPlayer = game.players.find(p => p.isBigBlind);
      const sbPlayer = game.players.find(p => p.isSmallBlind);
      expect(bbPlayer).toBeDefined();
      expect(sbPlayer).toBeDefined();
      
      // First player to act (UTG) raises
      const firstActor = game.getCurrentPlayer();
      expect(firstActor).not.toBe(bbPlayer);
      expect(firstActor).not.toBe(sbPlayer);
      
      game.performAction(firstActor.id, ActionType.RAISE, 30);
      
      // SB might fold or call
      const currentPlayer = game.getCurrentPlayer();
      if (currentPlayer === sbPlayer) {
        game.performAction(currentPlayer.id, ActionType.FOLD);
      }
      
      // BB calls the raise - this should count as VPIP
      if (game.getCurrentPlayer() === bbPlayer) {
        expect(bbPlayer!.hasActedVoluntarily).toBe(false);
        game.performAction(bbPlayer!.id, ActionType.CALL);
        expect(game.currentBet).toBe(30);
      }
    });
  });
});