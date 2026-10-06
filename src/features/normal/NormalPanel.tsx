import { useEffect, useState } from 'react';
import type { NormalCase } from '../../domain/model';
import { calculateNormalCase } from '../../domain/settlement';
import { NumberField } from '../../components/NumberField';
import { ResultPanel } from '../../components/ResultPanel';

type Props = { value: NormalCase; onChange: (next: NormalCase) => void; onDraftValidityChange?: (valid: boolean) => void };
function id() { return globalThis.crypto?.randomUUID?.() ?? `e-${Date.now()}-${Math.random().toString(36).slice(2)}`; }

export function NormalPanel({ value, onChange, onDraftValidityChange }: Props) {
  const [invalidAmounts, setInvalidAmounts] = useState<Record<string, boolean>>({});
  const result = calculateNormalCase(value);
  const hasInvalid = value.expenses.some((expense) => invalidAmounts[expense.id]);
  useEffect(() => { onDraftValidityChange?.(!hasInvalid); }, [hasInvalid, onDraftValidityChange]);
  const issues = hasInvalid ? [...result.issues, '入力中の数値を修正してください'] : result.issues;
  const total = value.expenses.reduce((sum, expense) => sum + BigInt(Number.isSafeInteger(expense.amount) && expense.amount >= 0 ? expense.amount : 0), 0n);
  const updateExpense = (expenseId: string, changes: Partial<NormalCase['expenses'][number]>) => onChange({ ...value, expenses: value.expenses.map((item) => item.id === expenseId ? { ...item, ...changes } : item) });
  return <div className="mode-panel">
    <section className="card expenses-card"><div className="section-heading"><div><span className="eyebrow">通常精算</span><h2>支払い明細</h2></div><button type="button" className="outline-button" onClick={() => onChange({ ...value, expenses: [...value.expenses, { id: id(), label: `明細${value.expenses.length + 1}`, amount: 0, payerId: value.participants[0]?.id ?? '', participantIds: value.participants[0] ? [value.participants[0].id] : [] }] })}>＋ 明細を追加</button></div>
      <p className="section-description">支払者と、その明細を分ける対象者を選びます。</p>
      <div className="normal-stats"><span>合計 <strong>¥{total.toLocaleString('ja-JP')}</strong></span><span>明細 <strong>{value.expenses.length}件</strong></span><span>全員均等の参考額 <strong>¥{(value.participants.length ? total / BigInt(value.participants.length) : 0n).toLocaleString('ja-JP')}</strong></span></div>
      {value.expenses.length === 0 ? <p>明細はまだありません。</p> : value.expenses.map((expense, index) => <div className="normal-expense" key={expense.id}>
        <div className="normal-expense-fields"><label>名称<input aria-label={`明細名 ${index + 1}`} value={expense.label} onChange={(event) => updateExpense(expense.id, { label: event.target.value })} /></label>
          <label>金額 <NumberField label={`金額 ${index + 1}`} value={expense.amount} onChange={(amount) => updateExpense(expense.id, { amount })} onValidityChange={(valid) => setInvalidAmounts((current) => ({ ...current, [expense.id]: !valid }))} /></label>
          <label>支払者<select aria-label={`支払者 ${index + 1}`} value={expense.payerId} onChange={(event) => updateExpense(expense.id, { payerId: event.target.value })}><option value="">選択してください</option>{value.participants.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select></label>
          <button type="button" className="remove-button" aria-label={`明細 ${index + 1} を削除`} onClick={() => onChange({ ...value, expenses: value.expenses.filter((item) => item.id !== expense.id) })}>削除</button></div>
        <div className="expense-participants" aria-label={`対象者 ${index + 1}`}>{value.participants.map((person) => <button type="button" key={person.id} className={`participant-chip ${expense.participantIds.includes(person.id) ? 'selected' : ''}`} aria-label={`${person.name}を対象にする`} aria-pressed={expense.participantIds.includes(person.id)} onClick={() => updateExpense(expense.id, { participantIds: expense.participantIds.includes(person.id) ? expense.participantIds.filter((id) => id !== person.id) : [...expense.participantIds, person.id] })}>{person.name}{expense.participantIds.includes(person.id) ? ' ✓' : ''}</button>)}</div>
      </div>)}
    </section>
    <ResultPanel balances={result.balances} participants={value.participants} transfers={hasInvalid ? [] : result.transfers} issues={issues} />
  </div>;
}
