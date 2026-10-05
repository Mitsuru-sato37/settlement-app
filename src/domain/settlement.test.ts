import { describe, expect, it } from 'vitest';
import { calculateGameBalance, calculateRouletteShares, calculateSettlement, calculateTransfers, splitExpense } from './settlement';

describe('settlement calculations', () => {
  it('splits an expense equally among selected participants', () => {
    expect(splitExpense({ amount: 3000, participantIds: ['a', 'b', 'c'] })).toEqual([
      { participantId: 'a', amount: 1000 },
      { participantId: 'b', amount: 1000 },
      { participantId: 'c', amount: 1000 },
    ]);
  });

  it('returns no shares when an expense has no participants', () => {
    expect(splitExpense({ amount: 1200, participantIds: [] })).toEqual([]);
  });

  it('assigns remainder yen so shares add up to the original amount', () => {
    const shares = splitExpense({ amount: 1000, participantIds: ['a', 'b', 'c'] });
    expect(shares.reduce((total, share) => total + share.amount, 0)).toBe(1000);
    expect(shares.map((share) => share.amount)).toEqual([334, 333, 333]);
  });

  it('updates balances when a receipt recipient is changed', () => {
    const summary = calculateSettlement(
      [
        { id: 'dinner', label: '夕食', amount: 3000, payerId: 'a', participantIds: ['a', 'b'] },
        { id: 'taxi', label: 'タクシー', amount: 1000, payerId: 'b', participantIds: ['b', 'c'] },
      ],
      ['a', 'b', 'c'],
    );
    expect(summary.total).toBe(4000);
    expect(summary.balances).toEqual([
      { participantId: 'a', amount: 1500 },
      { participantId: 'b', amount: -1000 },
      { participantId: 'c', amount: -500 },
    ]);
  });

  it('creates concrete payments from debtors to recipients', () => {
    expect(calculateTransfers([
      { participantId: 'a', amount: 1500 },
      { participantId: 'b', amount: -1000 },
      { participantId: 'c', amount: -500 },
    ])).toEqual([
      { fromId: 'b', toId: 'a', amount: 1000 },
      { fromId: 'c', toId: 'a', amount: 500 },
    ]);
  });

  it('reports whether a game balance is settled to zero', () => {
    expect(calculateGameBalance([12000, -4000, 7500, -15500])).toEqual({ total: 0, difference: 0, isBalanced: true });
    expect(calculateGameBalance([12000, -4000])).toEqual({ total: 8000, difference: 8000, isBalanced: false });
  });

  it('calculates editable roulette amounts and percentages', () => {
    expect(calculateRouletteShares({ a: 1000, b: 500 })).toEqual([
      { participantId: 'a', amount: 1000, percentage: 66.7 },
      { participantId: 'b', amount: 500, percentage: 33.3 },
    ]);
  });
});
