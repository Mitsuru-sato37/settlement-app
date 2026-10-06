// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';
import { createCase } from '../../domain/cases';
import type { RouletteCase } from '../../domain/model';
import { RoulettePanel } from './RoulettePanel';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let dispose: (() => Promise<void>) | undefined;
afterEach(async () => { await dispose?.(); dispose = undefined; });

async function render(amounts: Record<string, number>, random = () => 0.85) {
  const container = document.createElement('div'); document.body.append(container); const root = createRoot(container);
  let value = createCase('roulette', '支払い', 'r1', 'now') as RouletteCase;
  value.participants = [{ id: 'a', name: 'あき', initials: 'あ', color: '#ff0000' }, { id: 'b', name: 'びん', initials: 'び', color: '#0000ff' }];
  value.amounts = amounts;
  const onChange = (next: RouletteCase) => { value = next; root.render(<RoulettePanel value={value} onChange={onChange} random={random} />); };
  await act(async () => root.render(<RoulettePanel value={value} onChange={onChange} random={random} />));
  dispose = async () => { await act(async () => root.unmount()); container.remove(); };
  const click = async () => { const button = [...container.querySelectorAll('button')].find((item) => item.textContent?.includes('ルーレットを回す'))!; await act(async () => button.click()); };
  return { container, click, get value() { return value; } };
}

describe('roulette panel', () => {
  it('cannot spin when the total is zero', async () => {
    const view = await render({ a: 0, b: 0 });
    expect(view.container.querySelector<HTMLButtonElement>('.roulette-card .primary-button')?.disabled).toBe(true);
  });

  it('keeps the selected color under the pointer and reveals winner only after stopping', async () => {
    const view = await render({ a: 800, b: 200 });
    await view.click();
    expect(view.value.winnerId).toBeNull();
    expect(view.container.textContent).toContain('回っています');
    expect(view.container.querySelector<HTMLInputElement>('[aria-label="あきの支払額"]')?.disabled).toBe(true);
    expect(view.value.rotation).toBe(2196);
    const wheel = view.container.querySelector('.roulette-wheel')!;
    await act(async () => { const event = new Event('transitionend', { bubbles: true }); Object.defineProperty(event, 'propertyName', { value: 'transform' }); wheel.dispatchEvent(event); });
    expect(view.value.winnerId).toBe('b');
    expect(view.container.textContent).toContain('びん が全額お支払い');
    const input = view.container.querySelector<HTMLInputElement>('[aria-label="あきの支払額"]')!;
    await act(async () => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, '900'); input.dispatchEvent(new Event('input', { bubbles: true })); });
    expect(view.value.winnerId).toBeNull();
    expect(view.container.textContent).not.toContain('びん が全額お支払い');
    const invalidInput = view.container.querySelector<HTMLInputElement>('[aria-label="あきの支払額"]')!;
    await act(async () => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(invalidInput, 'oops'); invalidInput.dispatchEvent(new Event('input', { bubbles: true })); });
    expect(view.container.querySelector<HTMLButtonElement>('.roulette-card .primary-button')?.disabled).toBe(true);
    await act(async () => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(invalidInput, '900'); invalidInput.dispatchEvent(new Event('input', { bubbles: true })); });
    await view.click();
    expect(view.value.rotation).toBeGreaterThan(2196);
  });
});
