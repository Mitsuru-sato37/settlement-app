import { useEffect, useRef, useState } from 'react';
import type { ShareImageInput } from '../features/share/resultImage';
import { renderResultPng } from '../features/share/resultImage';
import { downloadPng, sharePng } from '../features/share/sharePng';

type Input = Omit<ShareImageInput, 'createdAt'>;
type Prepared = { signature: string; file: File };

export function ResultShareActions({ input, recordId }: { input: Input | null; recordId: string }) {
  const signature = input ? JSON.stringify([recordId, input.title, input.modeLabel, input.participants.map((person) => [person.id, person.name]), input.balances, input.transfers]) : null;
  const latestSignature = useRef(signature);
  latestSignature.current = signature;
  const [prepared, setPrepared] = useState<Prepared | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!input || !signature) { setPrepared(null); return; }
    let current = true;
    setMessage('');
    const snapshot = input;
    void renderResultPng({ ...snapshot, createdAt: new Date() }).then((blob) => {
      if (current) setPrepared({ signature, file: new File([blob], `settlement-${recordId}.png`, { type: 'image/png' }) });
    }).catch(() => { if (current) setMessage('画像を作成できません。内容を確認して再読み込みしてください。'); });
    return () => { current = false; };
  }, [signature]);

  if (!input) return null;
  const file = prepared?.signature === signature ? prepared.file : null;
  const onShare = () => {
    if (!file) return;
    setMessage('');
    void sharePng(file).then((result) => {
      if (latestSignature.current === signature && result === 'unsupported') setMessage('この環境では画像を直接共有できません。PNGを保存して送ってください。');
    }).catch(() => { if (latestSignature.current === signature) setMessage('共有できませんでした。PNGを保存して送ってください。'); });
  };
  const onSave = () => {
    if (!file) return;
    try { downloadPng(file); setMessage(''); }
    catch { setMessage('PNGを保存できませんでした。'); }
  };
  return <div className="result-share-actions">
    <div className="result-share-buttons">
      <button type="button" disabled={!file} onClick={onShare}>画像を共有</button>
      <button type="button" disabled={!file} onClick={onSave}>PNGを保存</button>
    </div>
    {!file && !message && <p role="status">画像を準備しています…</p>}
    {message && <p role="status">{message}</p>}
  </div>;
}
