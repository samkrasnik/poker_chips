// In pot-limit games, a "pot-sized" raise is the sum of:
//   • the size of the pot before the player acts
//   • the last outstanding bet
//   • the amount the player must call to match the current bet
// This formula properly accounts for blinds and any chips the player has already
// committed to the pot.
//
// Examples:
// - Starting pot of 3 (1 SB + 2 BB), current bet 2, call 2 -> raise to 7
// - Pot of 5 after a call, current bet 2, call 2       -> raise to 9
// - Pot of 10 after a raise to 7, call 7              -> raise to 24
// - Small blind facing raise to 7: pot 10, call 6     -> raise to 23
// - Big blind facing raise to 7: pot 10, call 5       -> raise to 22
export function calculatePotSizeRaise(
  potSize: number,
  currentBet: number,
  callAmount: number
): number {
  return potSize + currentBet + callAmount;
}
