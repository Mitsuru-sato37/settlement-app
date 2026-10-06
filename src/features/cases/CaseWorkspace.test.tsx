// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { addCase, createCase, createEmptyStore } from '../../domain/cases';
import type { CaseStore, MahjongCase, NormalCase, PokerCase } from '../../domain/model';
import { CaseWorkspace } from './CaseWorkspace';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const now = '2026-10-06T00:00:00.000Z';
let dispose: (() => Promise<void>) | undefined;
afterEach(async () => { await dispose?.(); dispose = undefined; vi.restoreAllMocks(); });

async function render(initial: CaseStore = createEmptyStore(), saveStatus: 'saved' | 'error' = 'saved') {
  const container = document.createElement('div'); document.body.append(container);
  const root = createRoot(container);
  let store = initial;
  const changes = vi.fn((next: CaseStore) => { store = next; root.render(<CaseWorkspace store={store} onChange={changes} saveStatus={saveStatus} />); });
  await act(async () => root.render(<CaseWorkspace store={store} onChange={changes} saveStatus={saveStatus} />));
  dispose = async () => { await act(async () => root.unmount()); container.remove(); };
  const click = async (name: string) => {
    const button = [...container.querySelectorAll('button')].find((item) => item.textContent?.includes(name) || item.getAttribute('aria-label') === name);
    expect(button, name).toBeDefined(); await act(async () => button!.click());
  };
  const input = async (label: string, value: string) => {
    const field = container.querySelector<HTMLInputElement>(`[aria-label="${label}"]`);
    expect(field, label).not.toBeNull(); await act(async () => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(field, value); field!.dispatchEvent(new Event('input', { bubbles: true })); });
  };
  return { container, click, input, changes, get store() { return store; } };
}

describe('case workspace', () => {
  it('creates and switches independent records', async () => {
    const view = await render();
    await view.input('記録名', '旅行'); await view.click('記録を作成');
    expect(view.store.cases).toHaveLength(1);
    await view.input('参加者名', 'あき'); await view.click('参加者を追加');
    expect(view.store.cases[0].participants.map((person) => person.name)).toEqual(['あき']);
    await view.click('ポーカーを作成');
    expect(view.store.cases[1].participants).toEqual([]);
    await view.click('旅行を開く');
    expect(view.store.cases[0].participants.map((person) => person.name)).toEqual(['あき']);
  });

  it('does not replace a saved participant name with an empty one', async () => {
    const view = await render();
    await view.click('記録を作成');
    await view.input('参加者名', 'あき'); await view.click('参加者を追加');
    await view.input('あきの名前', '');
    expect(view.store.cases[0].participants[0].name).toBe('あき');
    expect(view.container.querySelector<HTMLInputElement>('[aria-label="あきの名前"]')?.value).toBe('あき');
  });

  it('reports failed saves', async () => {
    const view = await render(createEmptyStore(), 'error');
    expect(view.container.textContent).toContain('保存できません');
  });

  it('does not delete payers or mahjong seats still referenced', async () => {
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    const participant = { id: 'p1', name: 'あき', initials: 'あ', color: '#f6a623' };
    const normal: NormalCase = { ...createCase('normal', '旅行', 'n1', now) as NormalCase, participants: [participant], expenses: [{ id: 'e1', label: '宿', amount: 1000, payerId: 'p1', participantIds: ['p1'] }] };
    const mahjong: MahjongCase = { ...createCase('mahjong', '卓', 'm1', now) as MahjongCase, participants: [participant], matches: [{ id: 'h1', label: '半荘1', players: [{ participantId: 'p1', points: 25000, chips: 0 }] }] };
    const view = await render(addCase(addCase(createEmptyStore(), normal), mahjong));
    await view.click('あきを削除');
    expect(view.store.cases[1].participants).toHaveLength(1);
    await view.click('旅行を開く'); await view.click('あきを削除');
    expect(view.store.cases[0].participants).toHaveLength(1);
  });

  it('removes just the deleted participant input from poker', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const people = [{ id: 'a', name: 'A', initials: 'A', color: '#fff' }, { id: 'b', name: 'B', initials: 'B', color: '#fff' }];
    const poker: PokerCase = { ...createCase('poker', '対局', 'p1', now) as PokerCase, participants: people, amounts: { a: 100, b: -100 } };
    const view = await render(addCase(createEmptyStore(), poker));
    await view.click('Aを削除');
    expect((view.store.cases[0] as PokerCase).amounts).toEqual({ b: -100 });
    expect(view.store.cases[0].participants.map((person) => person.id)).toEqual(['b']);
  });

  it('keeps records if deletion or import replacement is declined or invalid', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const view = await render(addCase(createEmptyStore(), createCase('normal', '旅行', 'n1', now)));
    await view.click('記録を削除');
    expect(view.store.cases).toHaveLength(1);
    const file = new File(['{broken'], 'backup.json', { type: 'application/json' });
    const field = view.container.querySelector<HTMLInputElement>('input[type=file]');
    expect(field).not.toBeNull();
    await act(async () => { Object.defineProperty(field, 'files', { value: [file] }); field!.dispatchEvent(new Event('change', { bubbles: true })); await new Promise((resolve) => setTimeout(resolve, 20)); });
    expect(view.store.cases).toHaveLength(1);
    expect(view.container.textContent).toContain('読み込めません');
  });

  it('replaces records only after a valid JSON import is confirmed', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const view = await render(addCase(createEmptyStore(), createCase('normal', '旅行', 'n1', now)));
    const replacement = addCase(createEmptyStore(), createCase('poker', '対局', 'p1', now));
    const upload = async () => {
      const field = view.container.querySelector<HTMLInputElement>('input[type=file]')!;
      Object.defineProperty(field, 'files', { value: [new File([JSON.stringify(replacement)], 'backup.json', { type: 'application/json' })], configurable: true });
      await act(async () => { field.dispatchEvent(new Event('change', { bubbles: true })); await new Promise((resolve) => setTimeout(resolve, 20)); });
    };
    await upload();
    expect(view.store.cases[0].title).toBe('旅行');
    confirm.mockReturnValue(true);
    await upload();
    expect(view.store.cases[0].title).toBe('対局');
  });
});
