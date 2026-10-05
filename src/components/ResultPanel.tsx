import type { Balance, Participant } from '../domain/model';
import { Avatar } from './Avatar';

export function ResultPanel({ balances, participants }: { balances: Balance[]; participants: Participant[] }) {
  return <section className="result-panel card"><div className="section-heading"><div><span className="eyebrow">CURRENT BALANCE</span><h2>精算結果</h2></div><span className="settled-badge">● 計算済み</span></div><div className="balance-list">{balances.map((balance) => { const person = participants.find((participant) => participant.id === balance.participantId)!; return <div className="balance-row" key={balance.participantId}><div className="person"><Avatar participant={person} small /><strong>{person.name}</strong></div><span className={balance.amount >= 0 ? 'positive' : 'negative'}>{balance.amount >= 0 ? '受け取り' : '支払い'} <strong>¥{Math.abs(balance.amount).toLocaleString('ja-JP')}</strong></span></div>; })}</div><div className="transfer-note"><span>↔</span><span>差額は参加者間で自動的に相殺されます</span></div></section>;
}
