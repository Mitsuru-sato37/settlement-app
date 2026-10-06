import { describe, expect, it } from 'vitest';
import { createCase } from './cases';
import type { NoriumiCase } from './model';
import { calculateNoriumiCase, splitEqualProfit } from './noriumi';

function base(ids: string[]): NoriumiCase {
  const value = createCase('noriumi', 'ノリ打ち', 'n1', 'now') as NoriumiCase;
  value.participants = ids.map((id) => ({ id, name: id, initials: id, color: '#fff' }));
  return value;
}

describe('noriumi equal settlement', () => {
  it('sends 1000 yen from A to B for equal profit shares', () => {
    const value = base(['a', 'b']);
    value.entries = { a: { investment: 1000, recovery: 2000 }, b: { investment: 1000, recovery: 0 } };
    expect(calculateNoriumiCase(value).transfers).toEqual([{ fromId: 'a', toId: 'b', amount: 1000 }]);
  });

  it('allocates one-yen remainder in display order, including negative totals', () => {
    expect(splitEqualProfit(1, 3)).toEqual([1, 0, 0]);
    expect(splitEqualProfit(-1, 3)).toEqual([0, 0, -1]);
  });

  it('keeps a zero-sum transfer balance even for overall losses', () => {
    const value = base(['a', 'b', 'c']);
    value.entries = { a: { investment: 100, recovery: 0 }, b: { investment: 100, recovery: 0 }, c: { investment: 100, recovery: 0 } };
    expect(calculateNoriumiCase(value).balances.reduce((sum, item) => sum + item.amount, 0)).toBe(0);
    value.entries.a.recovery = 299;
    expect(calculateNoriumiCase(value).balances.reduce((sum, item) => sum + item.amount, 0)).toBe(0);
    expect(calculateNoriumiCase(value).issues).toEqual([]);
  });
});
