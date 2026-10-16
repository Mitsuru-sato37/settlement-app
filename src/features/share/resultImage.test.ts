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

  it('measures a long title at its rendered font size', async () => {
    // The renderer creates its own canvas; record the font seen by measureText.
    const fonts: string[] = [];
    vi.mocked(HTMLCanvasElement.prototype.getContext).mockImplementation(() => ({
      fillRect: vi.fn(), fillText: vi.fn(),
      measureText: vi.fn(function (this: CanvasRenderingContext2D, text: string) { fonts.push(this.font); return { width: [...text].length * 20 }; }),
    } as unknown as CanvasRenderingContext2D));
    await renderResultPng(input({ title: 'とても長い精算結果のタイトル' }));
    expect(fonts[0]).toContain('40px');
  });

  it('keeps wrapped names clear of amounts', async () => {
    const painted: { text: string; x: number; y: number }[] = [];
    vi.mocked(HTMLCanvasElement.prototype.getContext).mockImplementation(() => ({
      fillRect: vi.fn(),
      fillText: vi.fn((text: string, x: number, y: number) => painted.push({ text, x, y })),
      measureText: vi.fn((text: string) => ({ width: [...text].length * 30 })),
    } as unknown as CanvasRenderingContext2D));
    const longName = '非常に長い日本語の参加者名として表示を確認するための人';
    await renderResultPng(input({
      participants: [{ ...people[0], name: longName }, people[1]],
      balances: [{ participantId: 'a', amount: -12345 }, { participantId: 'b', amount: 12345 }],
      transfers: [{ fromId: 'a', toId: 'b', amount: 12345 }],
    }));
    const amount = painted.find((item) => item.text === '支払い 12,345円')!;
    const sameBalanceLine = painted.filter((item) => item.y === amount.y && item.x < amount.x);
    expect(sameBalanceLine.every((item) => item.x + [...item.text].length * 30 + 40 <= amount.x)).toBe(true);
    const transferAmount = painted.find((item) => item.text === '12,345円')!;
    const sameTransferLine = painted.filter((item) => item.y === transferAmount.y && item.x < transferAmount.x);
    expect(sameTransferLine.every((item) => item.x + [...item.text].length * 30 + 40 <= transferAmount.x)).toBe(true);
  });

  it('keeps every digit of a large valid balance and transfer inside the PNG', async () => {
    const painted: { text: string; x: number; y: number }[] = [];
    vi.mocked(HTMLCanvasElement.prototype.getContext).mockImplementation(() => ({
      fillRect: vi.fn(),
      fillText: vi.fn((text: string, x: number, y: number) => painted.push({ text, x, y })),
      measureText: vi.fn((text: string) => ({ width: [...text].length * 20 })),
    } as unknown as CanvasRenderingContext2D));
    await renderResultPng(input({
      participants: people.slice(0, 2),
      balances: [{ participantId: 'a', amount: Number.MAX_SAFE_INTEGER }, { participantId: 'b', amount: -Number.MAX_SAFE_INTEGER }],
      transfers: [{ fromId: 'b', toId: 'a', amount: Number.MAX_SAFE_INTEGER }],
    }));
    const money = painted.filter((item) => item.text.includes('9,007,199,254,740,991'));
    expect(money).toHaveLength(3);
    expect(money.every((item) => item.x >= 72 && item.x + [...item.text].length * 20 <= 1008)).toBe(true);
    for (const item of money) {
      const sameLine = painted.filter((other) => other !== item && other.y === item.y && other.x < item.x);
      expect(sameLine.every((other) => other.x + [...other.text].length * 20 + 40 <= item.x)).toBe(true);
    }
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
