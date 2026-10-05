import type { Balance, GameBalanceStatus, Participant, Transfer } from '../domain/model';
import { Avatar } from './Avatar';

type ResultPanelProps = {
  balances: Balance[];
  participants: Participant[];
  transfers?: Transfer[];
  title?: string;
  eyebrow?: string;
  status?: GameBalanceStatus;
};

export function ResultPanel({ balances, participants, transfers = [], title = '精算結果', eyebrow = '現在の収支', status }: ResultPanelProps) {
  return <section className="result-panel card">
    <div className="section-heading">
      <div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2></div>
      {status
        ? <div className={`balance-status ${status.isBalanced ? 'is-balanced' : 'is-unbalanced'}`}><span>{status.isBalanced ? '✓' : '!'}</span>{status.isBalanced ? '収支一致' : `差額 ¥${status.difference.toLocaleString('ja-JP')}`}</div>
        : <span className="settled-badge">● 計算済み</span>}
    </div>
    <div className="balance-list">{balances.map((balance) => {
      const person = participants.find((participant) => participant.id === balance.participantId)!;
      return <div className="balance-row" key={balance.participantId}>
        <div className="person"><Avatar participant={person} small /><strong>{person.name}</strong></div>
        <span className={balance.amount >= 0 ? 'positive' : 'negative'}>{balance.amount >= 0 ? '受け取り' : '支払い'} <strong>¥{Math.abs(balance.amount).toLocaleString('ja-JP')}</strong></span>
      </div>;
    })}</div>
    {transfers.length > 0 && <div className="transfers">
      <div className="subsection-heading"><span className="eyebrow">支払いの流れ</span><span>{transfers.length}件</span></div>
      {transfers.map((transfer) => {
        const from = participants.find((participant) => participant.id === transfer.fromId)!;
        const to = participants.find((participant) => participant.id === transfer.toId)!;
        return <div className="transfer-row" key={`${transfer.fromId}-${transfer.toId}`}>
          <div className="person"><Avatar participant={from} small /><strong>{from.name}</strong></div>
          <span className="transfer-arrow">→</span>
          <div className="person"><Avatar participant={to} small /><strong>{to.name}</strong></div>
          <strong className="transfer-amount">¥{transfer.amount.toLocaleString('ja-JP')}</strong>
        </div>;
      })}
    </div>}
    <div className="transfer-note"><span>↔</span><span>差額は参加者間で自動的に相殺されます</span></div>
  </section>;
}
