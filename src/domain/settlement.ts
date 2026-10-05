import type { Balance, ExpenseItem, SettlementSummary } from './model';

type SplitInput = Pick<ExpenseItem, 'amount' | 'participantIds'>;

export function splitExpense({ amount, participantIds }: SplitInput): Balance[] {
  if (participantIds.length === 0) return [];
  const base = Math.floor(amount / participantIds.length);
  const remainder = amount - base * participantIds.length;
  return participantIds.map((participantId, index) => ({
    participantId,
    amount: base + (index < remainder ? 1 : 0),
  }));
}

export function calculateSettlement(items: ExpenseItem[], participantIds: string[]): SettlementSummary {
  const balances = new Map(participantIds.map((participantId) => [participantId, 0]));
  let total = 0;

  items.forEach((item) => {
    total += item.amount;
    balances.set(item.payerId, (balances.get(item.payerId) ?? 0) + item.amount);
    splitExpense(item).forEach((share) => {
      balances.set(share.participantId, (balances.get(share.participantId) ?? 0) - share.amount);
    });
  });

  return {
    total,
    balances: participantIds.map((participantId) => ({
      participantId,
      amount: balances.get(participantId) ?? 0,
    })),
  };
}
