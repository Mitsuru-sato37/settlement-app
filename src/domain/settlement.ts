import type { Balance, ExpenseItem, GameBalanceStatus, MahjongPlayerInput, MahjongSettings, RouletteShare, SettlementSummary, Transfer } from './model';

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

export function calculateTransfers(balances: Balance[]): Transfer[] {
  const creditors = balances.filter((balance) => balance.amount > 0).map((balance) => ({ id: balance.participantId, amount: balance.amount }));
  const debtors = balances.filter((balance) => balance.amount < 0).map((balance) => ({ id: balance.participantId, amount: Math.abs(balance.amount) }));
  const transfers: Transfer[] = [];
  let creditorIndex = 0;
  let debtorIndex = 0;

  while (creditorIndex < creditors.length && debtorIndex < debtors.length) {
    const creditor = creditors[creditorIndex];
    const debtor = debtors[debtorIndex];
    const amount = Math.min(creditor.amount, debtor.amount);
    transfers.push({ fromId: debtor.id, toId: creditor.id, amount });
    creditor.amount -= amount;
    debtor.amount -= amount;
    if (creditor.amount === 0) creditorIndex += 1;
    if (debtor.amount === 0) debtorIndex += 1;
  }

  return transfers;
}

export function calculateGameBalance(values: number[]): GameBalanceStatus {
  const total = values.reduce((sum, value) => sum + value, 0);
  return { total, difference: Math.abs(total), isBalanced: total === 0 };
}

export function calculateMahjongBalances(players: MahjongPlayerInput[], settings: MahjongSettings): Balance[] {
  const ranked = [...players].sort((left, right) => right.points - left.points);
  const averageChips = players.length === 0 ? 0 : players.reduce((sum, player) => sum + player.chips, 0) / players.length;
  return ranked.map((player, rank) => {
    const pointBalance = ((player.points - settings.returnPoints) / 1000) * settings.rate;
    const umaBalance = ((settings.uma[rank] ?? 0) / 1000) * settings.rate;
    const okaBalance = rank === 0 ? (settings.oka / 1000) * settings.rate : 0;
    const chipBalance = settings.includeChips ? (player.chips - averageChips) * settings.chipValue : 0;
    return { participantId: player.participantId, amount: Math.round(pointBalance + umaBalance + okaBalance + chipBalance) };
  }).sort((left, right) => players.findIndex((player) => player.participantId === left.participantId) - players.findIndex((player) => player.participantId === right.participantId));
}

export function calculateRouletteShares(amounts: Record<string, number>): RouletteShare[] {
  const total = Object.values(amounts).reduce((sum, amount) => sum + Math.max(0, amount), 0);
  return Object.entries(amounts).map(([participantId, amount]) => {
    const safeAmount = Math.max(0, amount);
    return { participantId, amount: safeAmount, percentage: total === 0 ? 0 : Math.round((safeAmount / total) * 1000) / 10 };
  });
}
