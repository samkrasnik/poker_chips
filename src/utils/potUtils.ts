import { Pot } from '../models/Pot';
import { PlayerStatus } from '../models/Player';

/**
 * Calculate main and side pots based on player contributions.
 * Ensures side pots only include players who contributed to that level.
 */
export function calculateSidePots(
  contributions: Map<string, number>,
  players: { id: string; status: PlayerStatus }[]
): Pot[] {
  const entries = Array.from(contributions.entries()).filter(([, amount]) => amount > 0);
  const hasAllIn = players.some(p => p.status === PlayerStatus.ALL_IN);

  const statusMap = new Map(players.map(p => [p.id, p.status]));

  if (!hasAllIn) {
    const total = entries.reduce((sum, [, amount]) => sum + amount, 0);
    return [
      {
        id: Math.random().toString(36).substr(2, 9),
        amount: total,
        eligiblePlayers: entries.map(([id]) => id),
        isMain: true,
      },
    ];
  }

  const pots: Pot[] = [];
  const sorted = entries.sort((a, b) => a[1] - b[1]);
  const levels = Array.from(new Set(sorted.map(([, amt]) => amt)));
  let previous = 0;

  for (const level of levels) {
    const contributors = sorted.filter(([, amt]) => amt >= level).map(([id]) => id);
    const potAmount = (level - previous) * contributors.length;
    const eligible = contributors.filter(id => {
      const status = statusMap.get(id);
      return status === PlayerStatus.ACTIVE || status === PlayerStatus.ALL_IN;
    });

    if (potAmount > 0) {
      const prev = pots[pots.length - 1];
      const sameAsPrevious =
        prev &&
        prev.eligiblePlayers.length === eligible.length &&
        eligible.every(id => prev.eligiblePlayers.includes(id));

      if (sameAsPrevious) {
        prev.amount += potAmount;
      } else {
        pots.push({
          id: Math.random().toString(36).substr(2, 9),
          amount: potAmount,
          eligiblePlayers: eligible,
          isMain: pots.length === 0,
        });
      }
    }
    previous = level;
  }

  // Consolidate any side pots that have the same eligible players as the main pot
  if (pots.length > 1) {
    const mainEligible = pots[0].eligiblePlayers.slice().sort().join(',');
    for (let i = pots.length - 1; i > 0; i--) {
      const potEligible = pots[i].eligiblePlayers.slice().sort().join(',');
      if (potEligible === mainEligible) {
        pots[0].amount += pots[i].amount;
        pots.splice(i, 1);
      }
    }
  }

  return pots;
}
