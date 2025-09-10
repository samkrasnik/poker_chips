import { calculatePotSizeRaise } from './betUtils';

describe('calculatePotSizeRaise', () => {
  test('pre-flop initial raise from first player', () => {
    // Pot: SB 1 + BB 2 = 3, current bet 2, call 2
    const raiseTo = calculatePotSizeRaise(3, 2, 2);
    expect(raiseTo).toBe(7);
  });

  test('player raising after another player calls', () => {
    // Pot is 5 after a call, current bet still 2, call 2
    const raiseTo = calculatePotSizeRaise(5, 2, 2);
    expect(raiseTo).toBe(9);
  });

  test('pot-sized reraise after pot-sized raise', () => {
    // Pot is 10 after a raise to 7, call 7
    const raiseTo = calculatePotSizeRaise(10, 7, 7);
    expect(raiseTo).toBe(24);
  });

  test('small blind facing pot-sized raise', () => {
    // Pot 10, current bet 7, SB has 1 in so call is 6
    const raiseTo = calculatePotSizeRaise(10, 7, 6);
    expect(raiseTo).toBe(23);
  });

  test('big blind facing pot-sized raise', () => {
    // Pot 10, current bet 7, BB has 2 in so call is 5
    const raiseTo = calculatePotSizeRaise(10, 7, 5);
    expect(raiseTo).toBe(22);
  });
});
