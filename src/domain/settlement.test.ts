import { describe, expect, it } from 'vitest';
import { calculateSettlement, splitExpense } from './settlement';

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
});
