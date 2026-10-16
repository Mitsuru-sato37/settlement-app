// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ResultShareActions } from './ResultShareActions';
import { renderResultPng } from '../features/share/resultImage';
import { downloadPng, sharePng } from '../features/share/sharePng';

vi.mock('../features/share/resultImage', () => ({ renderResultPng: vi.fn() }));
vi.mock('../features/share/sharePng', () => ({ sharePng: vi.fn(), downloadPng: vi.fn() }));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const person = { id: 'a', name: 'あき', initials: 'あ', color: '#aaa' };
const base = { title: '旅行', modeLabel: '通常精算', participants: [person], balances: [{ participantId: 'a', amount: 0 }], transfers: [] };
let root: Root;
let host: HTMLDivElement;
const deferred = () => { let resolve!: (value: Blob) => void; const promise = new Promise<Blob>((done) => { resolve = done; }); return { promise, resolve }; };
const button = (label: string) => [...host.querySelectorAll('button')].find((item) => item.textContent?.includes(label))!;
async function show(input: typeof base | null = base, recordId = 'case-a') { await act(async () => root.render(<ResultShareActions input={input} recordId={recordId} />)); }

beforeEach(() => { host = document.createElement('div'); document.body.append(host); root = createRoot(host); vi.resetAllMocks(); });
afterEach(async () => { await act(async () => root.unmount()); host.remove(); });

describe('result share actions', () => {
  it('waits for the current PNG and never exposes a stale PNG after an edit or case switch', async () => {
    const first = deferred(); const second = deferred(); const third = deferred();
    vi.mocked(renderResultPng).mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise).mockReturnValueOnce(third.promise);
    await show();
    expect(button('画像を共有').disabled).toBe(true);
    await show({ ...base, balances: [{ participantId: 'a', amount: 1 }] });
    await act(async () => first.resolve(new Blob(['old'], { type: 'image/png' })));
    expect(button('画像を共有').disabled).toBe(true);
    await act(async () => second.resolve(new Blob(['new'], { type: 'image/png' })));
    expect(button('画像を共有').disabled).toBe(false);
    await show({ ...base, balances: [{ participantId: 'a', amount: 1 }] }, 'case-b');
    expect(button('画像を共有').disabled).toBe(true);
    await act(async () => third.resolve(new Blob(['case-b'], { type: 'image/png' })));
    expect(button('画像を共有').disabled).toBe(false);
  });

  it('shares the prepared file directly and offers the same file for download', async () => {
    vi.mocked(renderResultPng).mockResolvedValue(new Blob(['png'], { type: 'image/png' }));
    vi.mocked(sharePng).mockResolvedValue('shared');
    await show();
    const file = vi.mocked(sharePng).mock.calls[0]?.[0];
    expect(file).toBeUndefined();
    await act(async () => button('画像を共有').click());
    expect(sharePng).toHaveBeenCalledOnce();
    const sharedFile = vi.mocked(sharePng).mock.calls[0][0];
    expect(sharedFile).toBeInstanceOf(File);
    expect(sharedFile.type).toBe('image/png');
    await act(async () => button('PNGを保存').click());
    expect(downloadPng).toHaveBeenCalledWith(sharedFile);
  });

  it('shows a save hint for unsupported sharing, ignores cancellation, and displays failures', async () => {
    vi.mocked(renderResultPng).mockResolvedValue(new Blob(['png'], { type: 'image/png' }));
    vi.mocked(sharePng).mockResolvedValueOnce('unsupported').mockResolvedValueOnce('cancelled').mockRejectedValueOnce(new Error('share failed'));
    await show();
    await act(async () => button('画像を共有').click());
    expect(host.textContent).toContain('PNGを保存');
    await act(async () => button('画像を共有').click());
    expect(host.textContent).not.toContain('キャンセル');
    await act(async () => button('画像を共有').click());
    expect(host.textContent).toContain('共有できません');
  });

  it('shows a generation error and hides actions when input is unavailable', async () => {
    vi.mocked(renderResultPng).mockRejectedValue(new Error('canvas failed'));
    await show();
    expect(host.textContent).toContain('画像を作成できません');
    expect(button('画像を共有').disabled).toBe(true);
    await show(null);
    expect(host.querySelector('button')).toBeNull();
  });
});
