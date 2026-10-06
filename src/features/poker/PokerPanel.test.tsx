// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';
import { createCase } from '../../domain/cases';
import type { PokerCase } from '../../domain/model';
import { PokerPanel } from './PokerPanel';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let dispose: (() => Promise<void>) | undefined;
afterEach(async () => { await dispose?.(); dispose = undefined; });

describe('poker panel', () => {
  it('updates amounts, difference and transfers from edited values', async () => {
    const container = document.createElement('div'); document.body.append(container); const root = createRoot(container);
    let value = createCase('poker', '対局', 'p1', 'now') as PokerCase;
    value.participants = [{ id: 'a', name: 'あき', initials: 'あ', color: '#fff' }, { id: 'b', name: 'びん', initials: 'び', color: '#fff' }];
    const onChange = (next: PokerCase) => { value = next; root.render(<PokerPanel value={value} onChange={onChange} />); };
    await act(async () => root.render(<PokerPanel value={value} onChange={onChange} />));
    dispose = async () => { await act(async () => root.unmount()); container.remove(); };
    const input = async (name: string, text: string) => { const field = container.querySelector<HTMLInputElement>(`[aria-label="${name}"]`)!; await act(async () => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(field, text); field.dispatchEvent(new Event('input', { bubbles: true })); }); };
    await input('あきの収支', '1200'); await input('びんの収支', '-1000');
    expect(container.textContent).toContain('差額 ¥200');
    expect(container.querySelectorAll('.transfer-row')).toHaveLength(0);
    await input('びんの収支', '-1200');
    expect(value.amounts).toEqual({ a: 1200, b: -1200 });
    expect(container.querySelector('.transfer-row')?.textContent).toContain('¥1,200');
  });
});
