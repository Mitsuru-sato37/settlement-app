// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';
import { createCase } from '../../domain/cases';
import type { NoriumiCase } from '../../domain/model';
import { NoriumiPanel } from './NoriumiPanel';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let dispose: (() => Promise<void>) | undefined;
afterEach(async () => { await dispose?.(); dispose = undefined; });

describe('noriumi panel', () => {
  it('recomputes equal share and transfer when investment and recovery change', async () => {
    const container = document.createElement('div'); document.body.append(container); const root = createRoot(container);
    let value = createCase('noriumi', 'ノリ打ち', 'n1', 'now') as NoriumiCase;
    value.participants = [{ id: 'a', name: 'あき', initials: 'あ', color: '#fff' }, { id: 'b', name: 'びん', initials: 'び', color: '#fff' }];
    const onChange = (next: NoriumiCase) => { value = next; root.render(<NoriumiPanel value={value} onChange={onChange} />); };
    await act(async () => root.render(<NoriumiPanel value={value} onChange={onChange} />));
    dispose = async () => { await act(async () => root.unmount()); container.remove(); };
    const input = async (name: string, text: string) => { const field = container.querySelector<HTMLInputElement>(`[aria-label="${name}"]`)!; await act(async () => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(field, text); field.dispatchEvent(new Event('input', { bubbles: true })); }); };
    await input('あきの投資額', '1000'); await input('あきの回収額', '2000');
    await input('びんの投資額', '1000');
    expect(value.entries).toEqual({ a: { investment: 1000, recovery: 2000 }, b: { investment: 1000, recovery: 0 } });
    expect(container.querySelector('.transfer-row')?.textContent).toContain('¥1,000');
    expect(container.textContent).toContain('均等取り分');
    await input('あきの投資額', '');
    expect(container.querySelectorAll('.transfer-row')).toHaveLength(0);
  });
});
