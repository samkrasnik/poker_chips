import { Game } from './Game';

describe('Seat and dealer management', () => {
  test('movePlayerSeat swaps seats and updates dealer position', () => {
    const game = new Game();
    const alice = game.addPlayer('Alice', 1);
    const bob = game.addPlayer('Bob', 2);
    const carol = game.addPlayer('Carol', 3);
    game.setDealerButton(alice.id);

    game.movePlayerSeat(alice.id, 3);

    expect(alice.seatNumber).toBe(3);
    expect(carol.seatNumber).toBe(1);
    expect(game.players[0].id).toBe(carol.id);
    expect(game.players[2].id).toBe(alice.id);
    expect(game.dealerPosition).toBe(2);
  });

  test('setDealerButton sets dealer correctly', () => {
    const game = new Game();
    const alice = game.addPlayer('Alice', 1);
    const bob = game.addPlayer('Bob', 2);

    game.setDealerButton(bob.id);

    expect(game.players[1].isDealer).toBe(true);
    expect(game.players[0].isDealer).toBe(false);
    expect(game.dealerPosition).toBe(1);
  });
});
