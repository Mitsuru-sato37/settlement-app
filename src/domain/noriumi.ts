import type { NoriumiCase, SettlementResult } from './model';
import { finalizeBalances } from './settlement';

export function splitEqualProfit(total: number, count: number): number[] {
  if (count <= 0) return [];
  const base = Math.floor(total / count);
  const remainder = total - base * count;
  return Array.from({ length: count }, (_, index) => base + (index < remainder ? 1 : 0));
}

export function calculateNoriumiCase(value: NoriumiCase): SettlementResult {
  const issues: string[] = [];
  if (value.participants.length === 0) issues.push('参加者を追加してください');
  const nets = value.participants.map((person) => {
    const entry = value.entries[person.id] ?? { investment: 0, recovery: 0 };
    if (!Number.isSafeInteger(entry.investment) || entry.investment < 0 || !Number.isSafeInteger(entry.recovery) || entry.recovery < 0) issues.push(`${person.name}: 投資額と回収額は0円以上の整数にしてください`);
    return Number.isSafeInteger(entry.investment) && Number.isSafeInteger(entry.recovery) ? entry.recovery - entry.investment : 0;
  });
  const total = nets.reduce((sum, amount) => sum + amount, 0);
  const shares = splitEqualProfit(total, value.participants.length);
  return finalizeBalances(value.participants.map((person, index) => ({ participantId: person.id, amount: shares[index] - nets[index] })), issues);
}
