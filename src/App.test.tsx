// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { STORAGE_KEY } from './storage/caseStorage';
import { addCase, createCase, createEmptyStore } from './domain/cases';
import App from './App';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root | undefined;
let container: HTMLDivElement | undefined;
beforeEach(() => { localStorage.clear(); });
afterEach(async () => { if (root) await act(async () => root!.unmount()); container?.remove(); root = undefined; container = undefined; vi.restoreAllMocks(); });

async function mount() {
  container ??= document.createElement('div'); if (!container.isConnected) document.body.append(container);
  root = createRoot(container); await act(async () => root!.render(<App />));
  return container;
}
async function click(label: string) {
  const button = [...container!.querySelectorAll('button')].find((item) => item.textContent?.includes(label) || item.getAttribute('aria-label') === label);
  expect(button, label).toBeDefined(); await act(async () => button!.click());
}
async function input(label: string, text: string) {
  const field = container!.querySelector<HTMLInputElement>(`[aria-label="${label}"]`);
  expect(field, label).not.toBeNull();
  await act(async () => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(field, text); field!.dispatchEvent(new Event('input', { bubbles: true })); });
}
async function reload() {
  await act(async () => root!.unmount()); root = undefined;
  await mount();
}
async function addPeople(names: string[]) {
  for (const name of names) { await input('参加者名', name); await click('参加者を追加'); }
}

describe('practical settlement app', () => {
  it('starts without sample values or fake save labels and restores edited normal settlement', async () => {
    const screen = await mount();
    expect(screen.textContent).toContain('記録はまだありません');
    expect(screen.textContent).not.toContain('¥9,950');
    expect(screen.textContent).not.toContain('自動保存済み');
    await input('記録名', '旅行'); await click('記録を作成');
    await input('参加者名', 'あき'); await click('参加者を追加');
    await input('参加者名', 'びん'); await click('参加者を追加');
    await click('明細を追加'); await input('明細名 1', '食事'); await input('金額 1', '1000'); await click('びんを対象にする');
    expect(screen.querySelector('.transfer-row')?.textContent).toContain('¥500');
    await input('金額 1', 'abc');
    expect(screen.textContent).toContain('入力中・未保存');
    await input('金額 1', '1000');
    expect(localStorage.getItem(STORAGE_KEY)).toContain('食事');
    await act(async () => root!.unmount()); root = undefined;
    await mount();
    expect(container!.textContent).toContain('旅行');
    expect(container!.querySelector('.transfer-row')?.textContent).toContain('¥500');
  });

  it('creates independent records in all modes without carrying over participants', async () => {
    const screen = await mount();
    await click('記録を作成'); await input('参加者名', 'あき'); await click('参加者を追加');
    for (const label of ['ポーカー', '麻雀', 'ノリ打ち', '全額払いルーレット']) {
      await click(`${label}を作成`);
      expect(screen.textContent).toContain('参加者を追加してください');
    }
    expect(screen.querySelectorAll('.case-list-item')).toHaveLength(5);
    await click('通常精算');
    expect(screen.querySelector('.case-current')?.textContent).toContain('あき');
  });

  it('creates the mode selected in the left navigation', async () => {
    const screen = await mount();
    await click('ポーカー');
    await click('記録を作成');
    expect(screen.querySelector('.game-card h2')?.textContent).toBe('最終収支を入力');
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).cases[0].mode).toBe('poker');
  });

  it('reports failed local saves without claiming success', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    const screen = await mount();
    await click('記録を作成');
    expect(screen.textContent).toContain('保存できません');
    expect(screen.textContent).not.toContain('自動保存済み');
  });

  it('does not overwrite unreadable saved data during initial hydration', async () => {
    localStorage.setItem(STORAGE_KEY, '{broken');
    const screen = await mount();
    expect(screen.textContent).toContain('保存データを読み込めません');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('{broken');
    await click('記録を作成');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('{broken');
  });

  it('saves an imported backup even when the original browser data was unreadable', async () => {
    localStorage.setItem(STORAGE_KEY, '{broken');
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const screen = await mount();
    const backup = addCase(createEmptyStore(), createCase('normal', '復元した旅行', 'restored', 'now'));
    const field = screen.querySelector<HTMLInputElement>('input[type=file]')!;
    Object.defineProperty(field, 'files', { value: [new File([JSON.stringify(backup)], 'backup.json', { type: 'application/json' })] });
    await act(async () => { field.dispatchEvent(new Event('change', { bubbles: true })); await new Promise((resolve) => setTimeout(resolve, 30)); });
    expect(screen.textContent).toContain('復元した旅行');
    expect(screen.textContent).not.toContain('保存データを読み込めません');
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual(backup);
  });

  it('restores poker entries and the concrete transfer after reopening', async () => {
    await mount(); await click('ポーカーを作成'); await addPeople(['あき', 'びん']);
    await input('あきの収支', '1200'); await input('びんの収支', '-1200');
    expect(container!.querySelector('.transfer-row')?.textContent).toContain('¥1,200');
    await reload();
    expect(container!.querySelector<HTMLInputElement>('[aria-label="びんの収支"]')?.value).toBe('-1200');
    expect(container!.querySelector('.transfer-row')?.textContent).toContain('¥1,200');
  });

  it('restores equal noriumi settlement after reopening', async () => {
    await mount(); await click('ノリ打ちを作成'); await addPeople(['あき', 'びん']);
    await input('あきの投資額', '1000'); await input('あきの回収額', '2000'); await input('びんの投資額', '1000');
    expect(container!.querySelector('.transfer-row')?.textContent).toContain('¥1,000');
    await reload();
    expect(container!.querySelector<HTMLInputElement>('[aria-label="あきの回収額"]')?.value).toBe('2000');
    expect(container!.querySelector('.transfer-row')?.textContent).toContain('¥1,000');
  });

  it('restores a mahjong hanchan and its cumulative transfer after reopening', async () => {
    await mount(); await click('麻雀を作成'); await addPeople(['あき', 'びん', 'ちえ', 'だい']);
    await click('半荘を追加');
    await input('半荘1 席1の点数', '40000'); await input('半荘1 席2の点数', '10000');
    expect(container!.querySelector('.mahjong-summary .transfer-row')).not.toBeNull();
    await reload();
    expect(container!.querySelector<HTMLInputElement>('[aria-label="半荘1 席1の点数"]')?.value).toBe('40000');
    expect(container!.querySelector('.mahjong-summary .transfer-row')).not.toBeNull();
  });

  it('restores roulette amounts, winner, and wheel angle after reopening', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9);
    await mount(); await click('全額払いルーレットを作成'); await addPeople(['あき', 'びん']);
    await input('あきの支払額', '100'); await input('びんの支払額', '100');
    await click('ルーレットを回す');
    const wheel = container!.querySelector('.roulette-wheel')!;
    await act(async () => { const event = new Event('transitionend', { bubbles: true }); Object.defineProperty(event, 'propertyName', { value: 'transform' }); wheel.dispatchEvent(event); });
    expect(container!.textContent).toContain('びん が全額お支払い');
    const angle = wheel.getAttribute('style');
    await reload();
    expect(container!.textContent).toContain('びん が全額お支払い');
    expect(container!.querySelector('.roulette-wheel')?.getAttribute('style')).toBe(angle);
  });
});
