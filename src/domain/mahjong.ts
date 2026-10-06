import type { Balance, MahjongCase, MahjongMatch, MahjongSettings, SettlementResult } from './model';
import { finalizeBalances } from './settlement';

function roundBalances(raw: Balance[]): Balance[] {
  const floors = raw.map((item) => Math.floor(item.amount));
  const rawTotal = raw.reduce((sum, item) => sum + item.amount, 0);
  const target = Math.abs(rawTotal) < 1e-7 ? 0 : Math.round(rawTotal);
  let remaining = target - floors.reduce((sum, amount) => sum + amount, 0);
  const order = raw.map((item, index) => ({ index, fraction: item.amount - floors[index] }))
    .sort((left, right) => right.fraction - left.fraction || left.index - right.index);
  for (const item of order) { if (remaining <= 0) break; floors[item.index] += 1; remaining -= 1; }
  return raw.map((item, index) => ({ participantId: item.participantId, amount: floors[index] }));
}

export function calculateMahjongMatch(match: MahjongMatch, settings: MahjongSettings, playerCount: 3 | 4): SettlementResult {
  const issues: string[] = [];
  if (match.players.length !== playerCount || match.players.some((player) => !player.participantId)
    || new Set(match.players.map((player) => player.participantId)).size !== match.players.length) issues.push('席に異なる参加者を選んでください');
  if (match.players.some((player) => !Number.isSafeInteger(player.points) || player.points < 0 || !Number.isSafeInteger(player.chips) || player.chips < 0)) issues.push('点数とチップは0以上の整数にしてください');
  if (!Number.isSafeInteger(settings.startingPoints) || settings.startingPoints <= 0 || !Number.isSafeInteger(settings.returnPoints) || settings.returnPoints <= 0
    || !Number.isSafeInteger(settings.oka) || !Number.isFinite(settings.rate) || settings.rate < 0
    || settings.uma.length !== playerCount || !settings.uma.every(Number.isSafeInteger)
    || !Number.isSafeInteger(settings.chipValue) || settings.chipValue < 0) issues.push('ルール設定を確認してください');
  const pointsTotal = match.players.reduce((sum, player) => sum + player.points, 0);
  if (pointsTotal !== settings.startingPoints * playerCount) issues.push(`持ち点合計が ${settings.startingPoints * playerCount} 点になっていません`);
  if (issues.length > 0) return finalizeBalances(match.players.map((player) => ({ participantId: player.participantId, amount: 0 })), issues);
  const ranked = match.players.map((player, index) => ({ player, index })).sort((left, right) => right.player.points - left.player.points || left.index - right.index);
  const rankById = new Map(ranked.map((item, rank) => [item.player.participantId, rank]));
  const averageChips = match.players.reduce((sum, player) => sum + player.chips, 0) / playerCount;
  const raw = match.players.map((player) => {
    const rank = rankById.get(player.participantId)!;
    const points = player.points - settings.returnPoints + settings.uma[rank] + (rank === 0 ? settings.oka : 0);
    const chipAmount = settings.includeChips ? (player.chips - averageChips) * settings.chipValue : 0;
    return { participantId: player.participantId, amount: points * settings.rate / 1000 + chipAmount };
  });
  if (raw.some((item) => !Number.isFinite(item.amount) || !Number.isSafeInteger(Math.round(item.amount)))
    || !Number.isSafeInteger(Math.round(raw.reduce((sum, item) => sum + item.amount, 0)))) {
    return finalizeBalances(match.players.map((player) => ({ participantId: player.participantId, amount: 0 })), ['計算結果が円の安全な範囲を超えています']);
  }
  return finalizeBalances(roundBalances(raw), []);
}

export function calculateMahjongCase(value: MahjongCase): SettlementResult {
  const issues: string[] = [];
  if (value.matches.length === 0) issues.push('半荘を追加してください');
  const amounts = new Map(value.participants.map((person) => [person.id, 0]));
  for (const match of value.matches) {
    const result = calculateMahjongMatch(match, value.settings, value.playerCount);
    if (match.players.some((player) => player.participantId && !amounts.has(player.participantId))) issues.push(`${match.label}: 記録にない参加者がいます`);
    if (result.issues.length > 0) issues.push(...result.issues.map((issue) => `${match.label}: ${issue}`));
    else for (const balance of result.balances) amounts.set(balance.participantId, (amounts.get(balance.participantId) ?? 0) + balance.amount);
  }
  if ([...amounts.values()].some((amount) => !Number.isSafeInteger(amount))) issues.push('累計金額が円の安全な範囲を超えています');
  return finalizeBalances(value.participants.map((person) => ({ participantId: person.id, amount: Number.isSafeInteger(amounts.get(person.id)) ? amounts.get(person.id)! : 0 })), issues);
}
