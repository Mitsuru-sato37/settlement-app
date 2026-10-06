// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';
import { createCase } from '../../domain/cases';
import type { NormalCase } from '../../domain/model';
import { NormalPanel } from './NormalPanel';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let cleanup: (() => Promise<void>) | undefined;
afterEach(async () => { await cleanup?.(); cleanup = undefined; });

async function render() {
  const container = document.createElement('div'); document.body.append(container);
  const root = createRoot(container);
  let value = createCase('normal', '旅行', 'n1', 'now') as NormalCase;
  value.participants = [
    { id: 'a', name: 'あき', initials: 'あ', color: '#fff' },
    { id: 'b', name: 'びん', initials: 'び', color: '#fff' },
  ];
  const onChange = (next: NormalCase) => { value = next; root.render(<NormalPanel value={value} onChange={onChange} />); };
  await act(async () => root.render(<NormalPanel value={value} onChange={onChange} />));
  cleanup = async () => { await act(async () => root.unmount()); container.remove(); };
  const click = async (name: string) => { const button = [...container.querySelectorAll('button')].find((item) => item.textContent?.includes(name) || item.getAttribute('aria-label') === name); expect(button, name).toBeDefined(); await act(async () => button!.click()); };
  const input = async (name: string, text: string) => { const field = container.querySelector<HTMLInputElement>(`[aria-label="${name}"]`); expect(field, name).not.toBeNull(); await act(async () => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(field, text); field!.dispatchEvent(new Event('input', { bubbles: true })); }); };
  return { container, click, input, get value() { return value; } };
}

describe('normal panel', () => {
  it('adds, edits and removes expenses and recalculates concrete payments', async () => {
    const view = await render();
    await view.click('明細を追加');
    expect(view.value.expenses).toHaveLength(1);
    await view.input('明細名 1', '食事'); await view.input('金額 1', '1000');
    await view.click('びんを対象にする');
    expect(view.container.textContent).toContain('びん');
    expect(view.container.textContent).toContain('¥500');
    expect(view.value.expenses[0].participantIds).toEqual(['a', 'b']);
    await view.input('金額 1', 'abc');
    expect(view.container.querySelectorAll('.transfer-row')).toHaveLength(0);
    expect(view.container.textContent).toContain('入力中の数値');
    await view.input('金額 1', '1000');
    expect(view.container.querySelectorAll('.transfer-row')).toHaveLength(1);
    await view.click('明細 1 を削除');
    expect(view.value.expenses).toEqual([]);
  });

  it('shows the exact total and no transfer when line items exceed safe-number arithmetic', async () => {
    const view = await render();
    await view.click('明細を追加'); await view.click('明細を追加');
    await view.input('金額 1', String(Number.MAX_SAFE_INTEGER));
    await view.input('金額 2', '2');
    expect(view.container.querySelector('.normal-stats')?.textContent).toContain('9,007,199,254,740,993');
    expect(view.container.textContent).toContain('合計金額が円の安全な範囲を超えています');
    expect(view.container.querySelectorAll('.transfer-row')).toHaveLength(0);
  });
});
