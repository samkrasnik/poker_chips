// In pot-limit games, a "pot-sized" raise is computed as the size of the pot
// before the player acts plus twice the current bet. This approach matches the
// common heuristic of taking three times the last bet and adding the prior pot.
//
// Examples:
// - Starting pot of 3 (1 SB + 2 BB), current bet 2 -> raise to 7
// - Pot of 5 after a call, current bet 2 -> raise to 9
// - Pot of 10 after a raise to 7 -> re-raise to 24
export function calculatePotSizeRaise(potSize: number, currentBet: number): number {
  return potSize + 2 * currentBet;
}
