import { describe, expect, it } from 'vitest';
import { calculateGameBalance, calculateMahjongBalances, calculateNormalCase, calculatePokerCase, calculateRouletteShares, calculateRouletteTargetRotation, calculateSettlement, calculateTransfers, finalizeBalances, pickWeightedParticipant, splitExpense } from './settlement';
import { createCase } from './cases';
import type { NormalCase, PokerCase } from './model';

describe('settlement calculations', () => {
  it('does not suggest payments for unbalanced results', () => {
    expect(finalizeBalances([{ participantId: 'a', amount: 1 }], [])).toEqual({
      balances: [{ participantId: 'a', amount: 1 }], transfers: [], issues: expect.any(Array), difference: 1,
    });
  });

  it('rejects an expense with no recipients or an unknown payer', () => {
    const value = createCase('normal', '旅行', 'n1', 'now') as NormalCase;
    value.participants = [{ id: 'a', name: 'A', initials: 'A', color: '#fff' }];
    value.expenses = [{ id: 'e1', label: '食事', amount: 1000, payerId: 'a', participantIds: [] }];
    expect(calculateNormalCase(value).transfers).toEqual([]);
    expect(calculateNormalCase(value).issues).toContain('食事: 対象者を選んでください');
    value.expenses[0].participantIds = ['a']; value.expenses[0].payerId = 'missing';
    expect(calculateNormalCase(value).issues).toContain('食事: 支払者が見つかりません');
  });

  it('uses participant display order for a one-yen remainder even if selection order differs', () => {
    const value = createCase('normal', '旅行', 'n1', 'now') as NormalCase;
    value.participants = ['a', 'b', 'c'].map((id) => ({ id, name: id, initials: id, color: '#fff' }));
    value.expenses = [{ id: 'e1', label: '食事', amount: 1, payerId: 'a', participantIds: ['c', 'b', 'a'] }];
    expect(calculateNormalCase(value).transfers).toEqual([]);
    value.expenses[0].label = '';
    expect(calculateNormalCase(value).issues).toContain('明細1: 名称を入力してください');
  });

  it('settles poker only when all final balances sum to zero', () => {
    const value = createCase('poker', '対局', 'p1', 'now') as PokerCase;
    value.participants = [{ id: 'a', name: 'A', initials: 'A', color: '#fff' }, { id: 'b', name: 'B', initials: 'B', color: '#fff' }];
    value.amounts = { a: 1200, b: -1200 };
    expect(calculatePokerCase(value).transfers).toEqual([{ fromId: 'b', toId: 'a', amount: 1200 }]);
    value.amounts.b = -1000;
    expect(calculatePokerCase(value)).toMatchObject({ difference: 200, transfers: [] });
  });
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

  it('picks a roulette participant from the payment-weighted range', () => {
    const shares = calculateRouletteShares({ a: 800, b: 200 });
    expect(pickWeightedParticipant(shares, 0.1)).toBe('a');
    expect(pickWeightedParticipant(shares, 0.85)).toBe('b');
    expect(pickWeightedParticipant(calculateRouletteShares({ a: 0, b: 0 }), 0.5)).toBeNull();
  });

  it('never selects a zero-yen candidate and centers a boundary selection on its color', () => {
    const shares = calculateRouletteShares({ zero: 0, a: 1, b: 3 });
    expect(pickWeightedParticipant(shares, 0)).toBe('a');
    expect(pickWeightedParticipant(shares, 0.25)).toBe('b');
    const rotation = calculateRouletteTargetRotation(0, shares, 'b')!;
    const midpoint = (1 + 3 / 2) / 4 * 360;
    expect((rotation + midpoint) % 360).toBeCloseTo(0);
    expect(calculateRouletteTargetRotation(rotation, shares, 'a')!).toBeGreaterThan(rotation);
  });

  it('calculates a stop rotation that centers the selected segment under the pointer', () => {
    const shares = calculateRouletteShares({ a: 800, b: 200 });
    expect(calculateRouletteTargetRotation(0, shares, 'b')).toBe(2196);
  });

  it('keeps the selected segment under the pointer across consecutive spins', () => {
    const shares = calculateRouletteShares({ a: 12000, b: 8500, c: 6500, d: 3000 });
    const firstRotation = calculateRouletteTargetRotation(0, shares, 'b');
    expect(firstRotation).not.toBeNull();
    const secondRotation = calculateRouletteTargetRotation(firstRotation!, shares, 'c');
    expect(secondRotation).not.toBeNull();
    expect(((secondRotation! % 360) + 285) % 360).toBe(0);
  });

  it('calculates mahjong settlement from scores, rate, uma, and chips', () => {
    expect(calculateMahjongBalances([
      { participantId: 'a', points: 45000, chips: 2 },
      { participantId: 'b', points: 35000, chips: 0 },
      { participantId: 'c', points: 30000, chips: 1 },
      { participantId: 'd', points: 30000, chips: 1 },
    ], { startingPoints: 35000, returnPoints: 35000, rate: 50, oka: 0, uma: [20000, 10000, -10000, -20000], includeChips: true, chipValue: 100 })).toEqual([
      { participantId: 'a', amount: 1600 },
      { participantId: 'b', amount: 400 },
      { participantId: 'c', amount: -750 },
      { participantId: 'd', amount: -1250 },
    ]);
  });

  it('combines balances across multiple mahjong hanchan', () => {
    expect(calculateMahjongBalances([
      { participantId: 'a', points: 40000, chips: 0 },
      { participantId: 'b', points: 30000, chips: 0 },
    ], { startingPoints: 35000, returnPoints: 35000, rate: 50, oka: 0, uma: [0, 0], includeChips: false, chipValue: 100 })).toEqual([
      { participantId: 'a', amount: 250 },
      { participantId: 'b', amount: -250 },
    ]);
  });
});
