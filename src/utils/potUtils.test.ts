import { calculateSidePots } from './potUtils';
import { PlayerStatus } from '../models/Player';

describe('calculateSidePots', () => {
  test('returns single main pot when no all-ins', () => {
    const contributions = new Map([
      ['a', 100],
      ['b', 100],
      ['c', 100],
    ]);
    const players = [
      { id: 'a', status: PlayerStatus.ACTIVE },
      { id: 'b', status: PlayerStatus.ACTIVE },
      { id: 'c', status: PlayerStatus.ACTIVE },
    ];

    const pots = calculateSidePots(contributions, players);
    expect(pots).toHaveLength(1);
    expect(pots[0].amount).toBe(300);
    expect(pots[0].eligiblePlayers).toEqual(expect.arrayContaining(['a', 'b', 'c']));
    expect(pots[0].isMain).toBe(true);
  });

  test('creates side pot when a player is all-in', () => {
    const contributions = new Map([
      ['a', 50],
      ['b', 100],
      ['c', 100],
    ]);
    const players = [
      { id: 'a', status: PlayerStatus.ALL_IN },
      { id: 'b', status: PlayerStatus.ACTIVE },
      { id: 'c', status: PlayerStatus.ACTIVE },
    ];

    const pots = calculateSidePots(contributions, players);
    expect(pots).toHaveLength(2);

    const mainPot = pots[0];
    const sidePot = pots[1];

    expect(mainPot.amount).toBe(150);
    expect(mainPot.eligiblePlayers).toEqual(expect.arrayContaining(['a', 'b', 'c']));
    expect(sidePot.amount).toBe(100);
    expect(sidePot.eligiblePlayers).toEqual(expect.arrayContaining(['b', 'c']));
    expect(sidePot.eligiblePlayers).not.toContain('a');
  });

  test('does not create redundant side pot when all-in is fully called', () => {
    const contributions = new Map([
      ['a', 50],
      ['b', 50],
    ]);
    const players = [
      { id: 'a', status: PlayerStatus.ALL_IN },
      { id: 'b', status: PlayerStatus.ACTIVE },
    ];

    const pots = calculateSidePots(contributions, players);
    expect(pots).toHaveLength(1);
    expect(pots[0].amount).toBe(100);
    expect(pots[0].eligiblePlayers).toEqual(expect.arrayContaining(['a', 'b']));
    expect(pots[0].isMain).toBe(true);
  });
});
