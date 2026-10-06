import { useEffect, useState } from 'react';

type Props = { value: number; onChange: (value: number) => void; label: string; min?: number; signed?: boolean; className?: string };

export function NumberField({ value, onChange, label, min = 0, signed = false, className }: Props) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => { setDraft(String(value)); }, [value]);
  const parsed = Number(draft);
  const valid = draft.trim() !== '' && /^-?\d+$/.test(draft) && Number.isSafeInteger(parsed) && (signed || parsed >= min);
  return <span className={className}><input aria-label={label} inputMode="numeric" value={draft} onChange={(event) => {
    const next = event.target.value; setDraft(next);
    const amount = Number(next);
    if (next.trim() !== '' && /^-?\d+$/.test(next) && Number.isSafeInteger(amount) && (signed || amount >= min)) onChange(amount);
  }} />{!valid && <small className="form-error" role="alert">整数を入力してください</small>}</span>;
}
