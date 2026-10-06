import { describe, expect, it } from 'vitest';
import { addCase, createCase, createEmptyStore, removeCase, selectCase } from './cases';

const now = '2026-10-06T00:00:00.000Z';

describe('settlement cases', () => {
  it('starts with no records', () => {
    expect(createEmptyStore()).toEqual({ schemaVersion: 1, activeCaseId: null, cases: [] });
  });

  it('creates an empty normal record with its own participants', () => {
    expect(createCase('normal', '旅行', 'c1', now)).toMatchObject({
      mode: 'normal', title: '旅行', id: 'c1', participants: [], expenses: [], createdAt: now, updatedAt: now,
    });
  });

  it('keeps different modes independent while switching and removing records', () => {
    const normal = createCase('normal', '旅行', 'c1', now);
    const poker = createCase('poker', '対局', 'c2', now);
    const store = addCase(addCase(createEmptyStore(), normal), poker);
    expect(store.activeCaseId).toBe('c2');
    expect(selectCase(store, 'c1').activeCaseId).toBe('c1');
    expect(selectCase(store, 'missing')).toBe(store);
    expect(store.cases[0]).toBe(normal);
    expect(removeCase(store, 'c2').cases).toEqual([normal]);
  });
});
