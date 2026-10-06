import { createEmptyStore } from '../domain/cases';
import type { CaseStore } from '../domain/model';

export const STORAGE_KEY = 'settlement-app:cases:v1';
const MAX_BYTES = 1024 * 1024;
type ParseResult = { ok: true; value: CaseStore } | { ok: false; error: string };

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function nonempty(value: unknown): value is string { return typeof value === 'string' && value.trim().length > 0; }
function integer(value: unknown): value is number { return typeof value === 'number' && Number.isSafeInteger(value); }
function finite(value: unknown): value is number { return typeof value === 'number' && Number.isFinite(value); }
function nonnegative(value: unknown): value is number { return integer(value) && value >= 0; }
function unique(values: string[]): boolean { return new Set(values).size === values.length; }

function validParticipants(value: unknown): value is Array<Record<string, unknown>> {
  return Array.isArray(value) && value.every((person) => record(person) && nonempty(person.id) && nonempty(person.name) && typeof person.initials === 'string' && nonempty(person.color))
    && unique(value.map((person) => person.id));
}

function validAmounts(value: unknown, ids: Set<string>, signed: boolean): boolean {
  return record(value) && Object.entries(value).every(([id, amount]) => ids.has(id) && (signed ? integer(amount) : nonnegative(amount)));
}

function validCase(value: unknown): boolean {
  if (!record(value) || !nonempty(value.id) || !nonempty(value.title) || !nonempty(value.createdAt) || !nonempty(value.updatedAt) || !validParticipants(value.participants)) return false;
  const ids = new Set(value.participants.map((person) => person.id as string));
  if (value.mode === 'normal') {
    return Array.isArray(value.expenses) && value.expenses.every((expense) => record(expense) && nonempty(expense.id) && nonempty(expense.label) && nonnegative(expense.amount)
      && typeof expense.payerId === 'string' && (expense.payerId === '' || ids.has(expense.payerId))
      && Array.isArray(expense.participantIds) && expense.participantIds.every((id: unknown) => typeof id === 'string' && ids.has(id)) && unique(expense.participantIds))
      && unique(value.expenses.map((expense: Record<string, unknown>) => expense.id as string));
  }
  if (value.mode === 'poker') return validAmounts(value.amounts, ids, true);
  if (value.mode === 'noriumi') return record(value.entries) && Object.entries(value.entries).every(([id, entry]) => ids.has(id) && record(entry) && nonnegative(entry.investment) && nonnegative(entry.recovery));
  if (value.mode === 'roulette') return validAmounts(value.amounts, ids, false) && (value.winnerId === null || (typeof value.winnerId === 'string' && ids.has(value.winnerId))) && finite(value.rotation);
  if (value.mode === 'mahjong') {
    const count = value.playerCount;
    if (count !== 3 && count !== 4) return false;
    const settings = value.settings;
    if (!record(settings) || !integer(settings.startingPoints) || settings.startingPoints <= 0 || !integer(settings.returnPoints) || settings.returnPoints <= 0
      || !finite(settings.rate) || settings.rate < 0 || !integer(settings.oka) || !Array.isArray(settings.uma) || settings.uma.length !== count
      || !settings.uma.every(integer) || typeof settings.includeChips !== 'boolean' || !nonnegative(settings.chipValue)) return false;
    if (!integer(value.nextMatchNumber) || value.nextMatchNumber < 1 || !Array.isArray(value.matches)) return false;
    return value.matches.every((match) => record(match) && nonempty(match.id) && nonempty(match.label) && Array.isArray(match.players)
      && match.players.length <= count && match.players.every((player: unknown) => record(player) && typeof player.participantId === 'string'
        && (player.participantId === '' || ids.has(player.participantId)) && integer(player.points) && integer(player.chips))
      && unique(match.players.map((player: Record<string, unknown>) => player.participantId as string).filter(Boolean)))
      && unique(value.matches.map((match: Record<string, unknown>) => match.id as string));
  }
  return false;
}

export function parseCaseStore(raw: string): ParseResult {
  if (new TextEncoder().encode(raw).byteLength > MAX_BYTES) return { ok: false, error: 'ファイルが 1 MiB を超えています' };
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { return { ok: false, error: 'JSON を読み取れません' }; }
  if (!record(parsed) || parsed.schemaVersion !== 1 || !Array.isArray(parsed.cases) || !parsed.cases.every(validCase)
    || !unique(parsed.cases.map((item: Record<string, unknown>) => item.id as string))
    || (parsed.activeCaseId !== null && (typeof parsed.activeCaseId !== 'string' || !parsed.cases.some((item: Record<string, unknown>) => item.id === parsed.activeCaseId)))) {
    return { ok: false, error: '保存データの形式・参照・バージョンが正しくありません' };
  }
  return { ok: true, value: parsed as CaseStore };
}

export function loadCaseStore(storage: Storage): ParseResult {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    return raw === null ? { ok: true, value: createEmptyStore() } : parseCaseStore(raw);
  } catch { return { ok: false, error: 'ブラウザの保存データを読み取れません' }; }
}

export function exportCaseStore(store: CaseStore): string { return JSON.stringify(store, null, 2); }

export function saveCaseStore(storage: Storage, store: CaseStore): { ok: boolean; error?: string } {
  const raw = exportCaseStore(store);
  const parsed = parseCaseStore(raw);
  if (!parsed.ok) return { ok: false, error: parsed.error };
  try { storage.setItem(STORAGE_KEY, raw); return { ok: true }; }
  catch { return { ok: false, error: 'ブラウザに保存できません。容量や設定を確認してください' }; }
}
