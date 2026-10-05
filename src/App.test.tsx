// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';
import App from './App';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('mahjong view', () => {
  it('shows the running summary first and newer hanchan above older ones', async () => {
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    try {
      await act(async () => root.render(<App />));
      const clickButton = async (label: string) => {
        const button = [...container.querySelectorAll('button')].find((candidate) => candidate.textContent?.includes(label));
        expect(button).toBeDefined();
        await act(async () => button!.click());
      };

      await clickButton('麻雀');
      const addMatchButton = [...container.querySelectorAll('.mahjong-records button')].find((button) => button.textContent?.includes('半荘を追加'));
      const firstMatch = container.querySelector('.mahjong-records .match-card');
      expect(addMatchButton).toBeDefined();
      expect(firstMatch).not.toBeNull();
      expect(addMatchButton!.compareDocumentPosition(firstMatch!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      await clickButton('半荘を追加');

      const summary = [...container.querySelectorAll('h2')].find((heading) => heading.textContent === '現時点での集計');
      const settings = container.querySelector('.mahjong-settings');
      expect(summary).toBeDefined();
      expect(settings).toBeDefined();
      expect(summary!.compareDocumentPosition(settings!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect([...container.querySelectorAll('.match-heading strong')].map((heading) => heading.textContent)).toEqual(['半荘2', '半荘1']);

      const oldestMatch = [...container.querySelectorAll('.match-card')].find((card) => card.querySelector('.match-heading strong')?.textContent === '半荘1');
      await act(async () => oldestMatch?.querySelector('button')?.click());
      await clickButton('半荘を追加');
      expect([...container.querySelectorAll('.match-heading strong')].map((heading) => heading.textContent)).toEqual(['半荘3', '半荘2']);
    } finally {
      await act(async () => root.unmount());
      container.remove();
    }
  });
});
