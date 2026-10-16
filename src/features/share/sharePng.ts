export async function sharePng(file: File): Promise<'shared' | 'unsupported' | 'cancelled'> {
  if (typeof navigator.canShare !== 'function' || typeof navigator.share !== 'function' || !navigator.canShare({ files: [file] })) return 'unsupported';
  try {
    await navigator.share({ files: [file], title: '精算結果' });
    return 'shared';
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
    throw error;
  }
}

export function downloadPng(file: File): void {
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  document.body.appendChild(link);
  try { link.click(); }
  finally {
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}
