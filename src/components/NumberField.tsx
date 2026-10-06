import { useEffect, useState } from 'react';

type Props = { value: number; onChange: (value: number) => void; onValidityChange?: (valid: boolean) => void; label: string; min?: number; signed?: boolean; decimal?: boolean; disabled?: boolean; className?: string };

export function NumberField({ value, onChange, onValidityChange, label, min = 0, signed = false, decimal = false, disabled = false, className }: Props) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => { setDraft(String(value)); }, [value]);
  const parsed = Number(draft);
  const pattern = decimal ? /^-?\d+(\.\d+)?$/ : /^-?\d+$/;
  const valid = draft.trim() !== '' && pattern.test(draft) && (decimal ? Number.isFinite(parsed) : Number.isSafeInteger(parsed)) && (signed || parsed >= min);
  return <span className={className}><input aria-label={label} inputMode="numeric" disabled={disabled} value={draft} onChange={(event) => {
    const next = event.target.value; setDraft(next);
    const amount = Number(next);
    const nextValid = next.trim() !== '' && pattern.test(next) && (decimal ? Number.isFinite(amount) : Number.isSafeInteger(amount)) && (signed || amount >= min);
    onValidityChange?.(nextValid);
    if (nextValid) onChange(amount);
  }} />{!valid && <small className="form-error" role="alert">{decimal ? '有効な数値' : '整数'}を入力してください</small>}</span>;
}
