import { useMemo, useState } from 'react';
import { calculateSettlement } from './domain/settlement';
import type { ExpenseItem, SettlementMode } from './domain/model';
import { defaultExpenses, gameNotes, modeInfo, participants } from './data';
import { ModeNav } from './components/ModeNav';
import { Avatar } from './components/Avatar';
import { ExpenseRow } from './components/ExpenseRow';
import { ResultPanel } from './components/ResultPanel';
import { StatCard } from './components/StatCard';

function App() {
  const [mode, setMode] = useState<SettlementMode>('normal');
  const [expenses, setExpenses] = useState<ExpenseItem[]>(defaultExpenses);
  const info = modeInfo[mode];
  const summary = useMemo(() => calculateSettlement(expenses, participants.map((participant) => participant.id)), [expenses]);

  const toggleParticipant = (expenseId: string, participantId: string) => setExpenses((current) => current.map((item) => item.id !== expenseId ? item : { ...item, participantIds: item.participantIds.includes(participantId) ? item.participantIds.filter((id) => id !== participantId) : [...item.participantIds, participantId] }));

  return <div className="app-shell"><ModeNav activeMode={mode} onChange={setMode} /><main className="main-content"><header className="topbar"><div className="breadcrumb"><span>精算</span><span>/</span><strong>{info.label}</strong></div><button className="icon-button">◔</button><button className="share-button">共有する <span>↗</span></button></header><div className="content-wrap"><section className="hero"><div><div className="mode-kicker"><span className="mode-symbol">{info.icon}</span><span>{info.label}</span></div><h1>{info.title}</h1><p>{info.description}</p></div><div className="hero-people">{participants.map((participant) => <Avatar participant={participant} key={participant.id} />)}<button className="add-person">＋</button><span className="people-count">4人参加</span></div></section>
    {mode === 'normal' ? <><section className="stats-grid"><StatCard label="TOTAL AMOUNT" value={`¥${summary.total.toLocaleString('ja-JP')}`} meta="3件の支払い" accent /><StatCard label="PER PERSON" value="¥9,950" meta="均等割りの場合" /><StatCard label="LAST UPDATED" value="たった今" meta="自動保存済み" /></section><section className="card expenses-card"><div className="section-heading"><div><span className="eyebrow">BREAKDOWN</span><h2>支払い内訳</h2></div><button className="outline-button">＋ 明細を追加</button></div><p className="section-description">明細ごとに対象者を選択できます。選択を変えると自動で再計算されます。</p><div className="expense-list">{expenses.map((item) => <ExpenseRow item={item} participants={participants} onToggle={toggleParticipant} key={item.id} />)}</div></section><ResultPanel balances={summary.balances} participants={participants} /></> : mode === 'roulette' ? <RoulettePanel /> : <GamePanel mode={mode} />}
    <footer><span>settlement v0.1 · ローカルモック</span><span>変更は自動保存されます</span></footer></div></main></div>;
}

function GamePanel({ mode }: { mode: Exclude<SettlementMode, 'normal' | 'roulette'> }) { const note = gameNotes[mode]; return <><section className="card game-card"><div className="section-heading"><div><span className="eyebrow">GAME SUMMARY</span><h2>{note.metric}</h2></div><button className="outline-button">＋ 行を追加</button></div><div className="game-list">{participants.map((participant, index) => <div className="game-row" key={participant.id}><div className="person"><Avatar participant={participant} small /><strong>{participant.name}</strong></div><span className={index % 2 === 0 ? 'positive' : 'negative'}>{note.values[index]}</span><button className="edit-button">編集</button></div>)}</div></section><ResultPanel balances={participants.map((participant, index) => ({ participantId: participant.id, amount: index % 2 === 0 ? 4500 : -4500 }))} participants={participants} /></>; }

function RoulettePanel() { const [winner, setWinner] = useState(0); const payer = participants[winner]; return <section className="card roulette-card"><div className="roulette-wheel">◉</div><span className="eyebrow">TONIGHT'S PAYER</span><h2>{payer.name} が全額お支払い</h2><p>ルーレットを回して、今夜の支払い担当を決めます。</p><button className="primary-button" onClick={() => setWinner((winner + 1) % participants.length)}>ルーレットを回す <span>↻</span></button><div className="roulette-members">{participants.map((participant, index) => <div className={`roulette-member ${index === winner ? 'winner' : ''}`} key={participant.id}><Avatar participant={participant} small /><span>{participant.name}</span>{index === winner && <span className="winner-mark">★</span>}</div>)}</div></section>; }

export default App;
