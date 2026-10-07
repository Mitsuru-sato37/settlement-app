import { describe, expect, it } from 'vitest';
import { createCase, defaultMahjongSettings } from './cases';
import type { MahjongCase, MahjongMatch, MahjongPlayerInput } from './model';
import { calculateMahjongCase, calculateMahjongMatch } from './mahjong';

const players = (ids: string[], points: number[], chips = ids.map(() => 0)): MahjongPlayerInput[] => ids.map((participantId, index) => ({ participantId, points: points[index], chips: chips[index] }));
const match = (ids: string[], points: number[], chips?: number[]): MahjongMatch => ({ id: 'h1', label: '半荘1', players: players(ids, points, chips) });

describe('mahjong settlement', () => {
  it('settles four-player and three-player default points and oka to zero', () => {
    const four = calculateMahjongMatch(match(['a', 'b', 'c', 'd'], [40000, 30000, 20000, 10000]), defaultMahjongSettings(4), 4);
    expect(four.balances.map((item) => item.amount)).toEqual([2500, 500, -1000, -2000]);
    expect(four.difference).toBe(0);
    const three = calculateMahjongMatch(match(['a', 'b', 'c'], [45000, 35000, 25000]), defaultMahjongSettings(3), 3);
    expect(three.balances.map((item) => item.amount)).toEqual([2000, -250, -1750]);
    expect(three.difference).toBe(0);
  });

  it('derives the top-up from the return-point gap and keeps a custom return zero-sum', () => {
    const settings = { ...defaultMahjongSettings(4), returnPoints: 28000, rate: 100 };
    const result = calculateMahjongMatch(match(['a', 'b', 'c', 'd'], [40000, 30000, 20000, 10000]), settings, 4);

    expect(result.balances.map((item) => item.amount)).toEqual([4400, 1200, -1800, -3800]);
    expect(result.difference).toBe(0);
  });

  it('uses seat order for equal scores and applies custom uma, rate and chips', () => {
    const settings = { ...defaultMahjongSettings(4), startingPoints: 25000, returnPoints: 25000, uma: [3000, 1000, -1000, -3000], rate: 100, includeChips: true, chipValue: 50 };
    const result = calculateMahjongMatch(match(['a', 'b', 'c', 'd'], [25000, 25000, 25000, 25000], [2, 0, 0, 0]), settings, 4);
    expect(result.balances.map((item) => item.amount)).toEqual([375, 75, -125, -325]);
  });

  it('withholds transfers for invalid point totals and preserves real rule differences', () => {
    const invalid = calculateMahjongMatch(match(['a', 'b', 'c', 'd'], [40000, 30000, 20000, 9000]), defaultMahjongSettings(4), 4);
    expect(invalid.transfers).toEqual([]);
    expect(invalid.issues.join(' ')).toContain('持ち点合計');
    const settings = { ...defaultMahjongSettings(4), uma: [20000, 10000, -10000, -40000] };
    expect(calculateMahjongMatch(match(['a', 'b', 'c', 'd'], [40000, 30000, 20000, 10000]), settings, 4).difference).toBe(1000);
  });

  it('accumulates multiple matches with different seats and blocks invalid match totals', () => {
    const value = createCase('mahjong', '卓', 'm1', 'now') as MahjongCase;
    value.participants = ['a', 'b', 'c', 'd', 'e'].map((id) => ({ id, name: id, initials: id, color: '#fff' }));
    value.matches = [match(['a', 'b', 'c', 'd'], [40000, 30000, 20000, 10000]), { ...match(['e', 'b', 'a', 'c'], [40000, 30000, 20000, 10000]), id: 'h2' }];
    expect(calculateMahjongCase(value).balances).toEqual([
      { participantId: 'a', amount: 1500 }, { participantId: 'b', amount: 1000 }, { participantId: 'c', amount: -3000 }, { participantId: 'd', amount: -2000 }, { participantId: 'e', amount: 2500 },
    ]);
    value.matches[1].players[0].points = 39999;
    expect(calculateMahjongCase(value).transfers).toEqual([]);
  });

  it('does not invent a balance difference from fractional yen rounding', () => {
    const settings = { ...defaultMahjongSettings(3), rate: 0.1, includeChips: true, chipValue: 1 };
    const result = calculateMahjongMatch(match(['a', 'b', 'c'], [45000, 35000, 25000], [1, 0, 0]), settings, 3);
    expect(result.difference).toBe(0);
    expect(result.balances.reduce((sum, item) => sum + item.amount, 0)).toBe(0);
  });

  it('never exposes non-finite yen when an extreme custom rate overflows', () => {
    const settings = { ...defaultMahjongSettings(4), rate: Number.MAX_VALUE };
    const result = calculateMahjongMatch(match(['a', 'b', 'c', 'd'], [40000, 30000, 20000, 10000]), settings, 4);
    expect(result.transfers).toEqual([]);
    expect(result.issues.length).toBeGreaterThan(0);
    expect(result.balances.every((item) => Number.isSafeInteger(item.amount))).toBe(true);
  });
});
