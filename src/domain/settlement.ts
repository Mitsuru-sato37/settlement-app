import type { Balance, ExpenseItem, GameBalanceStatus, MahjongPlayerInput, MahjongSettings, NormalCase, PokerCase, RouletteShare, SettlementResult, SettlementSummary, Transfer } from './model';

export function finalizeBalances(balances: Balance[], issues: string[]): SettlementResult {
  const difference = Math.abs(balances.reduce((sum, balance) => sum + balance.amount, 0));
  const allIssues = [...issues];
  if (difference !== 0) allIssues.push(`収支が ${difference} 円一致していません`);
  return { balances, transfers: allIssues.length === 0 ? calculateTransfers(balances) : [], issues: allIssues, difference };
}

export function calculateNormalCase(value: NormalCase): SettlementResult {
  const ids = new Set(value.participants.map((person) => person.id));
  const issues: string[] = [];
  const validItems = value.expenses.filter((item, index) => {
    const before = issues.length;
    const label = item.label.trim() || `明細${index + 1}`;
    if (!item.label.trim()) issues.push(`${label}: 名称を入力してください`);
    if (!Number.isSafeInteger(item.amount) || item.amount < 0) issues.push(`${label}: 金額は0円以上の整数にしてください`);
    if (!ids.has(item.payerId)) issues.push(`${label}: 支払者が見つかりません`);
    if (item.participantIds.length === 0) issues.push(`${label}: 対象者を選んでください`);
    if (item.participantIds.some((id) => !ids.has(id)) || new Set(item.participantIds).size !== item.participantIds.length) issues.push(`${label}: 対象者が正しくありません`);
    return before === issues.length;
  });
  const orderedItems = validItems.map((item) => ({ ...item, participantIds: value.participants.map((person) => person.id).filter((id) => item.participantIds.includes(id)) }));
  if (orderedItems.reduce((sum, item) => sum + BigInt(item.amount), 0n) > BigInt(Number.MAX_SAFE_INTEGER)) {
    return finalizeBalances(value.participants.map((person) => ({ participantId: person.id, amount: 0 })), [...issues, '合計金額が円の安全な範囲を超えています']);
  }
  const summary = calculateSettlement(orderedItems, value.participants.map((person) => person.id));
  return finalizeBalances(summary.balances, issues);
}

export function calculatePokerCase(value: PokerCase): SettlementResult {
  const issues: string[] = [];
  if (value.participants.length === 0) issues.push('参加者を追加してください');
  const balances = value.participants.map((person) => {
    const amount = value.amounts[person.id] ?? 0;
    if (!Number.isSafeInteger(amount)) issues.push(`${person.name}: 収支は整数円で入力してください`);
    return { participantId: person.id, amount: Number.isSafeInteger(amount) ? amount : 0 };
  });
  return finalizeBalances(balances, issues);
}

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
  if (items.some((item) => !Number.isSafeInteger(item.amount) || item.amount < 0)
    || items.reduce((sum, item) => sum + BigInt(item.amount), 0n) > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new RangeError('合計金額が円の安全な範囲を超えています');
  }
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
  const automaticTopUp = (settings.returnPoints - settings.startingPoints) * players.length;
  const averageChips = players.length === 0 ? 0 : players.reduce((sum, player) => sum + player.chips, 0) / players.length;
  return ranked.map((player, rank) => {
    const pointBalance = ((player.points - settings.returnPoints) / 1000) * settings.rate;
    const umaBalance = ((settings.uma[rank] ?? 0) / 1000) * settings.rate;
    const okaBalance = rank === 0 ? (automaticTopUp / 1000) * settings.rate : 0;
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

export function pickWeightedParticipant(shares: RouletteShare[], randomValue: number): string | null {
  const total = shares.reduce((sum, share) => sum + share.amount, 0);
  if (total <= 0) return null;

  if (randomValue >= 1) {
    for (let index = shares.length - 1; index >= 0; index -= 1) {
      if (shares[index].amount > 0) return shares[index].participantId;
    }
  }
  let cursor = Math.max(0, randomValue) * total;
  for (const share of shares) {
    cursor -= share.amount;
    if (cursor < 0) return share.participantId;
  }

  return shares[shares.length - 1]?.participantId ?? null;
}

export function calculateRouletteTargetRotation(currentRotation: number, shares: RouletteShare[], participantId: string): number | null {
  const total = shares.reduce((sum, share) => sum + share.amount, 0);
  const selectedIndex = shares.findIndex((share) => share.participantId === participantId);
  if (total <= 0 || selectedIndex < 0) return null;

  const selectedStart = shares.slice(0, selectedIndex).reduce((sum, share) => sum + share.amount, 0);
  const selectedAmount = shares[selectedIndex]?.amount ?? 0;
  const selectedMidpoint = ((selectedStart + selectedAmount / 2) / total) * 360;
  const targetAngle = (360 - selectedMidpoint) % 360;
  const currentAngle = ((currentRotation % 360) + 360) % 360;
  const forwardAdjustment = (targetAngle - currentAngle + 360) % 360;
  return currentRotation + 2160 + forwardAdjustment;
}
