import { Game } from './Game';

describe('Dealer button movement', () => {
  test('moves to next player when hand ends', () => {
    const game = new Game();
    const alice = game.addPlayer('Alice', 1);
    const bob = game.addPlayer('Bob', 2);
    const carol = game.addPlayer('Carol', 3);

    // Dealer should be set before first hand starts (Bob)
    expect(game.dealerPosition).toBe(1);
    expect(bob.isDealer).toBe(true);

    // Starting the first hand shouldn't change dealer
    game.startHand();

    expect(game.dealerPosition).toBe(1);
    expect(bob.isDealer).toBe(true);

    // Ending the hand should move the dealer to the next player
    game.endHand([alice.id]);

    expect(game.dealerPosition).toBe(2);
    expect(carol.isDealer).toBe(true);

    // Starting the next hand should not advance the dealer again
    game.startHand();

    expect(game.dealerPosition).toBe(2);
    expect(carol.isDealer).toBe(true);

    // After the second hand ends, the dealer should rotate again
    game.endHand([bob.id]);

    expect(game.dealerPosition).toBe(0);
    expect(alice.isDealer).toBe(true);
  });
});
