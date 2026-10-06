import { beforeEach, describe, expect, it, vi } from 'vitest';
import { addCase, createCase, createEmptyStore } from '../domain/cases';
import type { NormalCase } from '../domain/model';
import { exportCaseStore, loadCaseStore, parseCaseStore, saveCaseStore, STORAGE_KEY } from './caseStorage';

const now = '2026-10-06T00:00:00.000Z';

beforeEach(() => localStorage.clear());

describe('case storage', () => {
  it('round-trips records for all five modes', () => {
    const modes = ['normal', 'poker', 'mahjong', 'noriumi', 'roulette'] as const;
    const store = modes.reduce((current, mode, index) => addCase(current, createCase(mode, mode, `c${index}`, now)), createEmptyStore());
    expect(saveCaseStore(localStorage, store)).toEqual({ ok: true });
    expect(loadCaseStore(localStorage)).toEqual({ ok: true, value: store });
    expect(parseCaseStore(exportCaseStore(store))).toEqual({ ok: true, value: store });
  });

  it('starts empty only if the key is absent', () => {
    expect(loadCaseStore(localStorage)).toEqual({ ok: true, value: createEmptyStore() });
    localStorage.setItem(STORAGE_KEY, '{broken');
    expect(loadCaseStore(localStorage).ok).toBe(false);
    expect(localStorage.getItem(STORAGE_KEY)).toBe('{broken');
  });

  it('rejects unknown versions, broken JSON, oversized files and duplicate record IDs', () => {
    expect(parseCaseStore('{"schemaVersion":2,"activeCaseId":null,"cases":[]}').ok).toBe(false);
    expect(parseCaseStore('{broken').ok).toBe(false);
    expect(parseCaseStore(' '.repeat(1024 * 1024 + 1)).ok).toBe(false);
    const record = createCase('normal', '旅行', 'same', now);
    expect(parseCaseStore(JSON.stringify({ schemaVersion: 1, activeCaseId: 'same', cases: [record, record] })).ok).toBe(false);
  });

  it('rejects references to missing participants and non-integer amounts', () => {
    const normal = createCase('normal', '旅行', 'c1', now) as NormalCase;
    normal.expenses = [{ id: 'e1', label: '食事', amount: 1200, payerId: 'missing', participantIds: [] }];
    expect(parseCaseStore(JSON.stringify({ schemaVersion: 1, activeCaseId: 'c1', cases: [normal] })).ok).toBe(false);
    normal.participants = [{ id: 'p1', name: 'A', initials: 'A', color: '#fff' }];
    normal.expenses[0].payerId = 'p1';
    normal.expenses[0].amount = 1.5;
    expect(parseCaseStore(JSON.stringify({ schemaVersion: 1, activeCaseId: 'c1', cases: [normal] })).ok).toBe(false);
  });

  it('reports failed writes without deleting the previous value', () => {
    const storage = { getItem: vi.fn(() => 'previous'), setItem: vi.fn(() => { throw new Error('quota'); }) } as unknown as Storage;
    expect(saveCaseStore(storage, createEmptyStore()).ok).toBe(false);
    expect(storage.getItem(STORAGE_KEY)).toBe('previous');
  });
});
