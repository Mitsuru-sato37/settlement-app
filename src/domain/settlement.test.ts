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

  it('does not hide a one-yen difference when large balances cancel', () => {
    const limit = Number.MAX_SAFE_INTEGER;
    const values = [limit, limit, limit, 1, -limit, -limit, -limit];
    expect(calculateGameBalance(values)).toEqual({ total: 1, difference: 1, isBalanced: false });
    const result = finalizeBalances([
      { participantId: 'a', amount: limit },
      { participantId: 'b', amount: limit },
      { participantId: 'c', amount: limit },
      { participantId: 'd', amount: 1 },
      { participantId: 'e', amount: -limit },
      { participantId: 'f', amount: -limit },
      { participantId: 'g', amount: -limit },
    ], []);
    expect(result).toMatchObject({ difference: 1, transfers: [] });
    expect(result.issues).toContain('収支が 1 円一致していません');
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

  it('does not settle a normal record whose valid line items overflow the safe yen total', () => {
    const value = createCase('normal', '旅行', 'n1', 'now') as NormalCase;
    value.participants = [{ id: 'a', name: 'A', initials: 'A', color: '#fff' }, { id: 'b', name: 'B', initials: 'B', color: '#fff' }];
    value.expenses = [
      { id: 'e1', label: '宿', amount: Number.MAX_SAFE_INTEGER, payerId: 'a', participantIds: ['a', 'b'] },
      { id: 'e2', label: '食事', amount: 2, payerId: 'b', participantIds: ['a', 'b'] },
    ];
    const result = calculateNormalCase(value);
    expect(result.issues).toContain('合計金額が円の安全な範囲を超えています');
    expect(result.transfers).toEqual([]);
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

  it('settles zero and positive expenses for one and two participants without extra transfers', () => {
    const one = calculateSettlement([
      { id: 'self', label: '自分の費用', amount: Number.MAX_SAFE_INTEGER, payerId: 'a', participantIds: ['a'] },
      { id: 'zero', label: '無料', amount: 0, payerId: 'a', participantIds: ['a'] },
    ], ['a']);
    expect(one).toMatchObject({ total: Number.MAX_SAFE_INTEGER, balances: [{ participantId: 'a', amount: 0 }] });
    expect(calculateTransfers(one.balances)).toEqual([]);

    const two = calculateSettlement([
      { id: 'split', label: '小額', amount: 1, payerId: 'a', participantIds: ['b'] },
    ], ['a', 'b']);
    expect(two.balances).toEqual([{ participantId: 'a', amount: 1 }, { participantId: 'b', amount: -1 }]);
    expect(calculateTransfers(two.balances)).toEqual([{ fromId: 'b', toId: 'a', amount: 1 }]);
  });

  it('settles overlapping full and partial expense groups with no circular payments', () => {
    const value = createCase('normal', '区間精算', 'segments', 'now') as NormalCase;
    value.participants = ['a', 'b', 'c', 'd'].map((id) => ({ id, name: id, initials: id, color: '#fff' }));
    value.expenses = [
      { id: 'full', label: '富山→名古屋', amount: 9000, payerId: 'a', participantIds: ['a', 'b', 'c'] },
      { id: 'partial', label: '岐阜→名古屋', amount: 6000, payerId: 'b', participantIds: ['b', 'c'] },
      { id: 'self', label: 'A個人分', amount: 500, payerId: 'a', participantIds: ['a'] },
    ];
    const result = calculateNormalCase(value);
    expect(result.balances).toEqual([
      { participantId: 'a', amount: 6000 },
      { participantId: 'b', amount: 0 },
      { participantId: 'c', amount: -6000 },
      { participantId: 'd', amount: 0 },
    ]);
    expect(result.transfers).toEqual([{ fromId: 'c', toId: 'a', amount: 6000 }]);
    expect(result.transfers.every((transfer) => transfer.amount > 0 && transfer.fromId !== transfer.toId)).toBe(true);
  });

  it('preserves the settlement when one person makes several payments and many people share', () => {
    const value = createCase('normal', '大人数', 'many', 'now') as NormalCase;
    value.participants = ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => ({ id, name: id, initials: id, color: '#fff' }));
    value.expenses = [
      { id: '1', label: '立替1', amount: 100_000_000, payerId: 'a', participantIds: ['a', 'b', 'c', 'd', 'e', 'f'] },
      { id: '2', label: '立替2', amount: 7, payerId: 'a', participantIds: ['b', 'c', 'd', 'e', 'f'] },
      { id: '3', label: '立替3', amount: 3, payerId: 'c', participantIds: ['a', 'c'] },
    ];
    const result = calculateNormalCase(value);
    expect(result.issues).toEqual([]);
    expect(result.balances.reduce((sum, item) => sum + BigInt(item.amount), 0n)).toBe(0n);
    expect(result.transfers.reduce((sum, item) => sum + item.amount, 0)).toBe(83_333_338);
    expect(result.transfers.every((transfer) => transfer.fromId !== transfer.toId && transfer.amount > 0)).toBe(true);
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

  it('refuses to return a rounded total from the shared settlement calculator', () => {
    expect(() => calculateSettlement([
      { id: 'e1', label: '宿', amount: Number.MAX_SAFE_INTEGER, payerId: 'a', participantIds: ['a', 'b'] },
      { id: 'e2', label: '食事', amount: 2, payerId: 'b', participantIds: ['a', 'b'] },
    ], ['a', 'b'])).toThrow(RangeError);
  });

  it('lets a one-yen final slice win when another slice is one million yen', () => {
    const shares = calculateRouletteShares({ a: 1_000_000, b: 1 });
    expect(pickWeightedParticipant(shares, 0.9999995)).toBe('b');
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
