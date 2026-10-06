// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';
import { createCase } from '../../domain/cases';
import type { MahjongCase } from '../../domain/model';
import { MahjongPanel } from './MahjongPanel';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let dispose: (() => Promise<void>) | undefined;
afterEach(async () => { await dispose?.(); dispose = undefined; });

describe('mahjong panel', () => {
  it('shows current cumulative result first and adds newer matches above older ones', async () => {
    const container = document.createElement('div'); document.body.append(container); const root = createRoot(container);
    let value = createCase('mahjong', '卓', 'm1', 'now') as MahjongCase;
    value.participants = ['a', 'b', 'c', 'd'].map((id) => ({ id, name: id, initials: id, color: '#fff' }));
    const onChange = (next: MahjongCase) => { value = next; root.render(<MahjongPanel value={value} onChange={onChange} />); };
    await act(async () => root.render(<MahjongPanel value={value} onChange={onChange} />));
    dispose = async () => { await act(async () => root.unmount()); container.remove(); };
    const click = async (name: string) => { const button = [...container.querySelectorAll('button')].find((item) => item.textContent?.includes(name)); expect(button).toBeDefined(); await act(async () => button!.click()); };
    await click('半荘を追加'); await click('半荘を追加');
    expect(value.matches.map((item) => item.label)).toEqual(['半荘1', '半荘2']);
    expect([...container.querySelectorAll('.match-heading strong')].map((item) => item.textContent)).toEqual(['半荘2', '半荘1']);
    const heading = [...container.querySelectorAll('h2')].find((item) => item.textContent === '現時点での集計')!;
    const records = container.querySelector('.mahjong-records')!;
    expect(heading.compareDocumentPosition(records) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const add = [...container.querySelectorAll('.mahjong-records button')].find((item) => item.textContent?.includes('半荘を追加'))!;
    expect(add.compareDocumentPosition(container.querySelector('.match-card')!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(container.querySelectorAll('.transfer-row').length).toBeGreaterThan(0);
    const points = container.querySelector<HTMLInputElement>('[aria-label="半荘2 席1の点数"]')!;
    await act(async () => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(points, 'oops'); points.dispatchEvent(new Event('input', { bubbles: true })); });
    expect(container.querySelectorAll('.transfer-row')).toHaveLength(0);
  });
});
