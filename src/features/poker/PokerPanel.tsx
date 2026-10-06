import { NumberField } from '../../components/NumberField';
import { ResultPanel } from '../../components/ResultPanel';
import type { PokerCase } from '../../domain/model';
import { calculateGameBalance, calculatePokerCase } from '../../domain/settlement';

type Props = { value: PokerCase; onChange: (next: PokerCase) => void };

export function PokerPanel({ value, onChange }: Props) {
  const result = calculatePokerCase(value);
  const status = calculateGameBalance(result.balances.map((balance) => balance.amount));
  return <div className="mode-panel"><section className="card game-card"><div className="section-heading"><div><span className="eyebrow">ポーカー</span><h2>最終収支を入力</h2></div></div>
    <p className="section-description">受け取る人はプラス、支払う人はマイナス。全員の合計が 0 円になると送金を表示します。</p>
    <div className="game-list">{value.participants.length === 0 ? <p>参加者を追加してください。</p> : value.participants.map((person) => <div className="game-row" key={person.id}><strong>{person.name}</strong><NumberField label={`${person.name}の収支`} value={value.amounts[person.id] ?? 0} signed onChange={(amount) => onChange({ ...value, amounts: { ...value.amounts, [person.id]: amount } })} /><span>円</span></div>)}</div>
    <div className="game-total"><span>全員の収支合計</span><strong>¥{status.total.toLocaleString('ja-JP')}</strong></div>
  </section><ResultPanel balances={result.balances} participants={value.participants} transfers={result.transfers} status={status} issues={result.issues} /></div>;
}
