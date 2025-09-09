import { ActionType } from '../models/Game';
import { Player } from '../models/Player';

export interface VPIPStats {
  handsPlayed: number;
  handsVoluntarilyPlayed: number;
  vpip: number;
}

/** Determine if an action should count toward VPIP */
export function isVPIPAction(
  player: Player,
  action: ActionType,
  currentBet: number,
  bigBlind: number,
  currentRound: number
): boolean {
  if (currentRound !== 0) return false; // only pre-flop
  if (action === ActionType.FOLD) return false;
  if (player.isBigBlind && action === ActionType.CHECK && currentBet === bigBlind) {
    return false; // BB check when no raise
  }
  return [ActionType.BET, ActionType.CALL, ActionType.RAISE, ActionType.ALL_IN].includes(action);
}

/** Update VPIP stats when a qualifying action occurs */
export function updateVPIP(stats: VPIPStats, didVPIP: boolean): void {
  if (didVPIP) {
    stats.handsVoluntarilyPlayed += 1;
    stats.vpip = Math.round((stats.handsVoluntarilyPlayed / stats.handsPlayed) * 100);
  }
}
