import type { ExpenseItem, Participant } from '../domain/model';
import { Avatar } from './Avatar';

type Props = { item: ExpenseItem; participants: Participant[]; onToggle: (id: string, participantId: string) => void };

export function ExpenseRow({ item, participants, onToggle }: Props) {
  const payer = participants.find((participant) => participant.id === item.payerId);
  return <div className="expense-row">
    <div className="expense-info"><span className="expense-icon">{item.id === 'stay' ? '⌂' : item.id === 'bbq' ? '♨' : '▱'}</span><div><strong>{item.label}</strong><span className="payer-label">{payer?.name} が支払い</span></div></div>
    <div className="expense-participants">{participants.map((participant) => <button key={participant.id} className={`participant-chip ${item.participantIds.includes(participant.id) ? 'selected' : ''}`} onClick={() => onToggle(item.id, participant.id)}><Avatar participant={participant} small /><span>{participant.name}</span>{item.participantIds.includes(participant.id) && <span className="check">✓</span>}</button>)}</div>
    <strong className="expense-amount">¥{item.amount.toLocaleString('ja-JP')}</strong>
  </div>;
}
