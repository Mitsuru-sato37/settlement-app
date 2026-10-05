import { useEffect, useMemo, useState } from 'react';
import { calculateRouletteShares, calculateSettlement, calculateTransfers, calculateGameBalance } from './domain/settlement';
import type { ExpenseItem, SettlementMode } from './domain/model';
import { defaultExpenses, gameNotes, modeInfo, participants as initialParticipants } from './data';
import { ModeNav } from './components/ModeNav';
import { Avatar } from './components/Avatar';
import { ExpenseRow } from './components/ExpenseRow';
import { ResultPanel } from './components/ResultPanel';
import { StatCard } from './components/StatCard';

function App() {
  const [mode, setMode] = useState<SettlementMode>('normal');
  const [expenses, setExpenses] = useState<ExpenseItem[]>(defaultExpenses);
  const [participants, setParticipants] = useState(initialParticipants);
  const [isParticipantPanelOpen, setParticipantPanelOpen] = useState(false);
  const [newParticipantName, setNewParticipantName] = useState('');
  const info = modeInfo[mode];
  const summary = useMemo(() => calculateSettlement(expenses, participants.map((participant) => participant.id)), [expenses]);
  const transfers = useMemo(() => calculateTransfers(summary.balances), [summary.balances]);

  const toggleParticipant = (expenseId: string, participantId: string) => setExpenses((current) => current.map((item) => item.id !== expenseId ? item : { ...item, participantIds: item.participantIds.includes(participantId) ? item.participantIds.filter((id) => id !== participantId) : [...item.participantIds, participantId] }));

  const addParticipant = () => {
    const name = newParticipantName.trim();
    if (!name) return;
    const colors = ['#f6a623', '#5ad1c8', '#ff7d8e', '#8d83ff', '#62b7f5', '#b1d66b'];
    setParticipants((current) => [...current, { id: `participant-${Date.now()}`, name, initials: name.slice(0, 2).toUpperCase(), color: colors[current.length % colors.length] }]);
    setNewParticipantName('');
  };

  const removeParticipant = (participantId: string) => {
    if (participants.length <= 1) return;
    const nextParticipantId = participants.find((participant) => participant.id !== participantId)?.id;
    setParticipants((current) => current.filter((participant) => participant.id !== participantId));
    setExpenses((current) => current.map((item) => ({ ...item, participantIds: item.participantIds.filter((id) => id !== participantId), payerId: item.payerId === participantId ? nextParticipantId ?? item.payerId : item.payerId })));
  };

  return <div className="app-shell"><ModeNav activeMode={mode} onChange={setMode} /><main className="main-content"><header className="topbar"><div className="breadcrumb"><span>精算</span><span>/</span><strong>{info.label}</strong></div><button className="icon-button">◔</button><button className="share-button">共有する <span>↗</span></button></header><div className="content-wrap"><section className="hero"><div><div className="mode-kicker"><span className="mode-symbol">{info.icon}</span><span>{info.label}</span></div><h1>{info.title}</h1><p>{info.description}</p></div><div className="hero-people">{participants.map((participant) => <Avatar participant={participant} key={participant.id} />)}<button className="add-person" aria-label="参加者を管理" onClick={() => setParticipantPanelOpen((open) => !open)}>＋</button><span className="people-count">{participants.length}人参加</span></div></section>
    {isParticipantPanelOpen && <section className="participant-manager card"><div><span className="eyebrow">PARTICIPANTS</span><h2>参加者を管理</h2><p>追加した人は必要な明細の対象者チップから選択できます。</p></div><div className="participant-add"><input value={newParticipantName} onChange={(event) => setNewParticipantName(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && addParticipant()} placeholder="参加者名を入力" aria-label="参加者名" /><button className="primary-button" onClick={addParticipant}>追加</button></div><div className="participant-manage-list">{participants.map((participant) => <div className="participant-manage-item" key={participant.id}><div className="person"><Avatar participant={participant} small /><strong>{participant.name}</strong></div><button className="remove-button" disabled={participants.length <= 1} onClick={() => removeParticipant(participant.id)}>削除</button></div>)}</div></section>}
    {mode === 'normal' ? <><section className="stats-grid"><StatCard label="TOTAL AMOUNT" value={`¥${summary.total.toLocaleString('ja-JP')}`} meta="3件の支払い" accent /><StatCard label="PER PERSON" value="¥9,950" meta="均等割りの場合" /><StatCard label="LAST UPDATED" value="たった今" meta="自動保存済み" /></section><section className="card expenses-card"><div className="section-heading"><div><span className="eyebrow">BREAKDOWN</span><h2>支払い内訳</h2></div><button className="outline-button">＋ 明細を追加</button></div><p className="section-description">明細ごとに対象者を選択できます。選択を変えると自動で再計算されます。</p><div className="expense-list">{expenses.map((item) => <ExpenseRow item={item} participants={participants} onToggle={toggleParticipant} key={item.id} />)}</div></section><ResultPanel balances={summary.balances} participants={participants} transfers={transfers} /></> : mode === 'roulette' ? <RoulettePanel participants={participants} /> : <GamePanel mode={mode} participants={participants} />}
    <footer><span>settlement v0.1 · ローカルモック</span><span>変更は自動保存されます</span></footer></div></main></div>;
}

function GamePanel({ mode, participants }: { mode: Exclude<SettlementMode, 'normal' | 'roulette'>; participants: typeof initialParticipants }) { const note = gameNotes[mode]; const status = calculateGameBalance(note.balances.slice(0, participants.length)); const balances = participants.map((participant, index) => ({ participantId: participant.id, amount: note.balances[index] ?? 0 })); return <><section className="card game-card"><div className="section-heading"><div><span className="eyebrow">GAME SUMMARY</span><h2>{note.metric}</h2></div><div className={`balance-status ${status.isBalanced ? 'is-balanced' : 'is-unbalanced'}`}><span>{status.isBalanced ? '✓' : '!'}</span>{status.isBalanced ? '収支一致' : `差額 ¥${status.difference.toLocaleString('ja-JP')}`}</div></div><p className="section-description">全員の収支を合計すると0円になるか確認できます。</p><div className="game-list">{participants.map((participant, index) => <div className="game-row" key={participant.id}><div className="person"><Avatar participant={participant} small /><strong>{participant.name}</strong></div><span className={index % 2 === 0 ? 'positive' : 'negative'}>{note.values[index] ?? '入力待ち'}</span><button className="edit-button">編集</button></div>)}</div><div className="game-total"><span>全員の収支合計</span><strong className={status.isBalanced ? 'positive' : 'negative'}>{status.total >= 0 ? '+' : ''}¥{status.total.toLocaleString('ja-JP')}</strong></div></section><ResultPanel balances={balances} participants={participants} /></>; }

function RoulettePanel({ participants }: { participants: typeof initialParticipants }) { const [winner, setWinner] = useState(0); const [amounts, setAmounts] = useState<Record<string, number>>(() => Object.fromEntries(participants.map((participant, index) => [participant.id, [12000, 8500, 6500, 3000][index] ?? 0]))); useEffect(() => setAmounts((current) => Object.fromEntries(participants.map((participant) => [participant.id, current[participant.id] ?? 0]))), [participants]); const safeWinner = Math.min(winner, participants.length - 1); const payer = participants[safeWinner]; const shares = calculateRouletteShares(amounts); const total = shares.reduce((sum, share) => sum + share.amount, 0); const updateAmount = (participantId: string, value: string) => setAmounts((current) => ({ ...current, [participantId]: Math.max(0, Number(value) || 0) })); return <section className="card roulette-card"><div className="roulette-wheel">◉</div><span className="eyebrow">TONIGHT'S PAYER</span><h2>{payer.name} が全額お支払い</h2><p>ルーレットを回すか、各自の支払い額を直接編集できます。</p><button className="primary-button" onClick={() => setWinner((safeWinner + 1) % participants.length)}>ルーレットを回す <span>↻</span></button><div className="roulette-editor"><div className="subsection-heading"><span className="eyebrow">PAYMENT BREAKDOWN</span><strong>合計 ¥{total.toLocaleString('ja-JP')}</strong></div>{participants.map((participant) => { const share = shares.find((item) => item.participantId === participant.id)!; return <div className="roulette-edit-row" key={participant.id}><div className="person"><Avatar participant={participant} small /><strong>{participant.name}</strong></div><label><span>¥</span><input type="number" min="0" step="100" value={share.amount} onChange={(event) => updateAmount(participant.id, event.target.value)} aria-label={`${participant.name}の支払額`} /></label><strong className="share-percent">{share.percentage.toFixed(1)}%</strong></div>; })}</div><div className="roulette-members">{participants.map((participant, index) => <div className={`roulette-member ${index === safeWinner ? 'winner' : ''}`} key={participant.id}><Avatar participant={participant} small /><span>{participant.name}</span>{index === safeWinner && <span className="winner-mark">★</span>}</div>)}</div></section>; }

export default App;
