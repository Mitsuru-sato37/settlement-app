import { defaultExpenses, gameNotes, modeInfo, participants } from '../data';
import type { CaseStore, MahjongSettings, SettlementCase, SettlementMode } from './model';

export function defaultMahjongSettings(playerCount: 3 | 4): MahjongSettings {
  return playerCount === 4
    ? { startingPoints: 25000, returnPoints: 30000, rate: 50, oka: 20000, uma: [20000, 10000, -10000, -20000], includeChips: false, chipValue: 100 }
    : { startingPoints: 35000, returnPoints: 40000, rate: 50, oka: 15000, uma: [20000, 0, -20000], includeChips: false, chipValue: 100 };
}

export function createEmptyStore(): CaseStore {
  return { schemaVersion: 1, activeCaseId: null, cases: [] };
}

export function createCase(mode: SettlementMode, title: string, id: string, now: string): SettlementCase {
  const common = { id, title, participants: [], createdAt: now, updatedAt: now };
  switch (mode) {
    case 'normal': return { ...common, mode, expenses: [] };
    case 'poker': return { ...common, mode, amounts: {} };
    case 'mahjong': return { ...common, mode, playerCount: 4, settings: defaultMahjongSettings(4), matches: [], nextMatchNumber: 1 };
    case 'noriumi': return { ...common, mode, entries: {} };
    case 'roulette': return { ...common, mode, amounts: {}, winnerId: null, rotation: 0 };
  }
}

export function addCase(store: CaseStore, item: SettlementCase): CaseStore {
  if (store.cases.some((record) => record.id === item.id)) return store;
  return { ...store, activeCaseId: item.id, cases: [...store.cases, item] };
}

export function removeCase(store: CaseStore, id: string): CaseStore {
  if (!store.cases.some((record) => record.id === id)) return store;
  const cases = store.cases.filter((record) => record.id !== id);
  return { ...store, cases, activeCaseId: store.activeCaseId === id ? (cases[0]?.id ?? null) : store.activeCaseId };
}

export function selectCase(store: CaseStore, id: string): CaseStore {
  if (!store.cases.some((record) => record.id === id)) return store;
  return { ...store, activeCaseId: id };
}

export function createSampleCase(mode: SettlementMode, id: string, now: string): SettlementCase {
  const base = createCase(mode, modeInfo[mode].title, id, now);
  const sampleParticipants = participants.map((participant) => ({ ...participant }));
  switch (base.mode) {
    case 'normal': return { ...base, participants: sampleParticipants, expenses: defaultExpenses.map((item) => ({ ...item, participantIds: [...item.participantIds] })) };
    case 'poker': return { ...base, participants: sampleParticipants, amounts: Object.fromEntries(participants.map((participant, index) => [participant.id, gameNotes.poker.balances[index]])) };
    case 'mahjong': return { ...base, participants: sampleParticipants };
    case 'noriumi': return { ...base, participants: sampleParticipants, entries: Object.fromEntries(participants.map((participant, index) => [participant.id, { investment: 10000, recovery: [18500, 3000, 12000, 6500][index] }])) };
    case 'roulette': return { ...base, participants: sampleParticipants, amounts: { mitsu: 12000, ken: 8500, yuki: 6500, sato: 3000 } };
  }
}
