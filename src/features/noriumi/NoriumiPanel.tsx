import { NumberField } from '../../components/NumberField';
import { ResultPanel } from '../../components/ResultPanel';
import type { NoriumiCase } from '../../domain/model';
import { calculateNoriumiCase, splitEqualProfit } from '../../domain/noriumi';

type Props = { value: NoriumiCase; onChange: (next: NoriumiCase) => void };

export function NoriumiPanel({ value, onChange }: Props) {
  const result = calculateNoriumiCase(value);
  const total = value.participants.reduce((sum, person) => {
    const entry = value.entries[person.id] ?? { investment: 0, recovery: 0 };
    return sum + entry.recovery - entry.investment;
  }, 0);
  const shares = splitEqualProfit(total, value.participants.length);
  const update = (id: string, changes: Partial<{ investment: number; recovery: number }>) => onChange({ ...value, entries: { ...value.entries, [id]: { ...(value.entries[id] ?? { investment: 0, recovery: 0 }), ...changes } } });
  return <div className="mode-panel"><section className="card game-card"><div className="section-heading"><div><span className="eyebrow">ノリ打ち</span><h2>投資と回収</h2></div></div>
    <p className="section-description">全員の損益を均等に分けます。端数の 1 円は表示順で配ります。</p>
    <div className="noriumi-head"><span>参加者</span><span>投資額</span><span>回収額</span><span>均等取り分</span></div>
    {value.participants.length === 0 ? <p>参加者を追加してください。</p> : value.participants.map((person, index) => <div className="noriumi-row" key={person.id}><strong>{person.name}</strong>
      <NumberField label={`${person.name}の投資額`} value={value.entries[person.id]?.investment ?? 0} onChange={(investment) => update(person.id, { investment })} />
      <NumberField label={`${person.name}の回収額`} value={value.entries[person.id]?.recovery ?? 0} onChange={(recovery) => update(person.id, { recovery })} />
      <span>¥{shares[index]?.toLocaleString('ja-JP') ?? 0}</span></div>)}
    <div className="game-total"><span>全体損益</span><strong>¥{total.toLocaleString('ja-JP')}</strong></div>
  </section><ResultPanel balances={result.balances} participants={value.participants} transfers={result.transfers} issues={result.issues} title="均等精算の結果" /></div>;
}
