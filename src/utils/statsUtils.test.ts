import { isVPIPAction, updateVPIP, VPIPStats } from './statsUtils';
import { Player } from '../models/Player';
import { ActionType } from '../models/Game';

const createPlayer = (opts: Partial<Player> = {}) => {
  const p = new Player({ name: 'Test', seatNumber: 1, stack: 100 });
  Object.assign(p, opts);
  return p;
};

describe('isVPIPAction', () => {
  test('big blind check with no raise does not count', () => {
    const player = createPlayer({ isBigBlind: true });
    const result = isVPIPAction(player, ActionType.CHECK, 10, 10, 0);
    expect(result).toBe(false);
  });

  test('big blind call after raise counts', () => {
    const player = createPlayer({ isBigBlind: true });
    const result = isVPIPAction(player, ActionType.CALL, 20, 10, 0);
    expect(result).toBe(true);
  });

  test('post-flop actions do not count', () => {
    const player = createPlayer();
    const result = isVPIPAction(player, ActionType.BET, 10, 10, 1);
    expect(result).toBe(false);
  });
});

describe('updateVPIP', () => {
  test('increments handsVoluntarilyPlayed and vpip', () => {
    const stats: VPIPStats = { handsPlayed: 2, handsVoluntarilyPlayed: 1, vpip: 50 };
    updateVPIP(stats, true);
    expect(stats.handsVoluntarilyPlayed).toBe(2);
    expect(stats.vpip).toBe(100);
  });
});
