import { calculatePotSizeRaise } from './betUtils';

describe('calculatePotSizeRaise', () => {
  test('pre-flop initial raise from first player', () => {
    // Pot: SB 1 + BB 2 = 3, current bet 2
    const raiseTo = calculatePotSizeRaise(3, 2);
    expect(raiseTo).toBe(7);
  });

  test('player raising after another player calls', () => {
    // Pot is 5 after a call, current bet still 2
    const raiseTo = calculatePotSizeRaise(5, 2);
    expect(raiseTo).toBe(9);
  });

  test('pot-sized reraise after pot-sized raise', () => {
    // Pot is 10 after a raise to 7
    const raiseTo = calculatePotSizeRaise(10, 7);
    expect(raiseTo).toBe(24);
  });
});
