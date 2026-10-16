import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderResultPng, wrapText } from './resultImage';
import type { ShareImageInput } from './resultImage';

const people = [
  { id: 'a', name: 'あき', initials: 'あ', color: '#aaa' },
  { id: 'b', name: 'びん', initials: 'び', color: '#bbb' },
  { id: 'c', name: 'ちえ', initials: 'ち', color: '#ccc' },
];

function input(overrides: Partial<ShareImageInput> = {}): ShareImageInput {
  return {
    title: '旅行の精算', modeLabel: '通常精算', createdAt: new Date('2026-10-16T10:00:00+09:00'),
    participants: people,
    balances: [{ participantId: 'a', amount: 1000 }, { participantId: 'b', amount: -600 }, { participantId: 'c', amount: -400 }],
    transfers: [{ fromId: 'b', toId: 'a', amount: 600 }, { fromId: 'c', toId: 'a', amount: 400 }],
    ...overrides,
  };
}

describe('result image', () => {
  const drawn: string[] = [];
  const canvases: HTMLCanvasElement[] = [];

  beforeEach(() => {
    drawn.length = 0; canvases.length = 0;
    const create = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tagName, options) => {
      const element = create(tagName, options);
      if (tagName === 'canvas') canvases.push(element as HTMLCanvasElement);
      return element;
    });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      fillRect: vi.fn(),
      fillText: vi.fn((text: string) => drawn.push(text)),
      measureText: vi.fn((text: string) => ({ width: [...text].length * 20 })),
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) => callback(new Blob(['png'], { type: 'image/png' })));
  });
  afterEach(() => vi.restoreAllMocks());

  it('wraps a long Japanese name without dropping characters', () => {
    const text = 'とても長い参加者の名前';
    const lines = wrapText(text, 60, (part) => [...part].length * 20);
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.join('')).toBe(text);
  });

  it('renders every balance and transfer from the confirmed result', async () => {
    const blob = await renderResultPng(input());
    expect(blob.type).toBe('image/png');
    expect(blob.size).toBeGreaterThan(0);
    const all = drawn.join(' ');
    for (const text of ['旅行の精算', '通常精算', 'あき', 'びん', 'ちえ', '受け取り', '支払い', '1,000', '600', '400']) expect(all).toContain(text);
    expect(drawn.filter((text) => text.includes('びん') || text.includes('ちえ')).length).toBeGreaterThanOrEqual(4);
  });

  it('says no transfer is needed and grows the image for many people', async () => {
    await renderResultPng(input({ participants: [people[0]], balances: [{ participantId: 'a', amount: 0 }], transfers: [] }));
    const smallHeight = canvases[canvases.length - 1]?.height ?? 0;
    expect(drawn.join(' ')).toContain('送金なし');
    const many = Array.from({ length: 24 }, (_, index) => ({ id: `p${index}`, name: `参加者${index + 1}`, initials: '参', color: '#ddd' }));
    await renderResultPng(input({ participants: many, balances: many.map((person) => ({ participantId: person.id, amount: 0 })), transfers: [] }));
    expect(canvases[canvases.length - 1].height).toBeGreaterThan(smallHeight);
    expect(drawn.join(' ')).toContain('参加者24');
  });

  it('rejects a failed PNG encoding', async () => {
    vi.mocked(HTMLCanvasElement.prototype.toBlob).mockImplementation((callback) => callback(null));
    await expect(renderResultPng(input())).rejects.toThrow();
  });
});
