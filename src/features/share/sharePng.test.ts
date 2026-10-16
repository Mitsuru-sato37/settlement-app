import { afterEach, describe, expect, it, vi } from 'vitest';
import { downloadPng, sharePng } from './sharePng';

const file = () => new File(['png'], 'result.png', { type: 'image/png' });

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.useRealTimers(); });

describe('PNG sharing', () => {
  it('passes the prepared PNG to the OS share dialog in the click task', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const canShare = vi.fn().mockReturnValue(true);
    vi.stubGlobal('navigator', { canShare, share });
    const png = file();
    const outcome = sharePng(png);
    expect(canShare).toHaveBeenCalledWith({ files: [png] });
    expect(share).toHaveBeenCalledWith(expect.objectContaining({ files: [png] }));
    expect(await outcome).toBe('shared');
  });

  it('reports unsupported file sharing without opening a share dialog', async () => {
    const share = vi.fn();
    vi.stubGlobal('navigator', { canShare: vi.fn().mockReturnValue(false), share });
    expect(await sharePng(file())).toBe('unsupported');
    expect(share).not.toHaveBeenCalled();
  });

  it('treats a cancelled share as a normal outcome', async () => {
    vi.stubGlobal('navigator', { canShare: vi.fn().mockReturnValue(true), share: vi.fn().mockRejectedValue(new DOMException('cancelled', 'AbortError')) });
    expect(await sharePng(file())).toBe('cancelled');
  });

  it('surfaces unexpected sharing errors', async () => {
    vi.stubGlobal('navigator', { canShare: vi.fn().mockReturnValue(true), share: vi.fn().mockRejectedValue(new Error('blocked')) });
    await expect(sharePng(file())).rejects.toThrow('blocked');
  });

  it('downloads the same PNG and releases its object URL', () => {
    vi.useFakeTimers();
    const createObjectURL = vi.fn().mockReturnValue('blob:result');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      expect(this.download).toBe('result.png');
      expect(this.href).toBe('blob:result');
    });
    const png = file();
    downloadPng(png);
    expect(createObjectURL).toHaveBeenCalledWith(png);
    expect(click).toHaveBeenCalledOnce();
    vi.runAllTimers();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:result');
  });
});
