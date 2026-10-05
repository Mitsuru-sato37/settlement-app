import { useEffect, useMemo, useState } from 'react';
import { calculateGameBalance, calculateMahjongBalances, calculateRouletteShares, calculateRouletteTargetRotation, calculateSettlement, calculateTransfers, pickWeightedParticipant } from './domain/settlement';
import type { ExpenseItem, MahjongPlayerInput, MahjongSettings, SettlementMode } from './domain/model';
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
    {mode === 'normal' ? <><section className="stats-grid"><StatCard label="合計金額" value={`¥${summary.total.toLocaleString('ja-JP')}`} meta="3件の支払い" accent /><StatCard label="1人あたり" value="¥9,950" meta="均等割りの場合" /><StatCard label="最終更新" value="たった今" meta="自動保存済み" /></section><section className="card expenses-card"><div className="section-heading"><div><span className="eyebrow">支払い内訳</span><h2>明細</h2></div><button className="outline-button">＋ 明細を追加</button></div><p className="section-description">明細ごとに対象者を選択できます。選択を変えると自動で再計算されます。</p><div className="expense-list">{expenses.map((item) => <ExpenseRow item={item} participants={participants} onToggle={toggleParticipant} key={item.id} />)}</div></section><ResultPanel balances={summary.balances} participants={participants} transfers={transfers} /></> : mode === 'roulette' ? <RoulettePanel participants={participants} /> : <GamePanel mode={mode} participants={participants} />}
    <footer><span>settlement v0.1 · ローカルモック</span><span>変更は自動保存されます</span></footer></div></main></div>;
}

function GamePanel({ mode, participants }: { mode: Exclude<SettlementMode, 'normal' | 'roulette'>; participants: typeof initialParticipants }) { if (mode === 'mahjong') return <MahjongPanel participants={participants} />; const note = gameNotes[mode]; const balances = participants.map((participant, index) => ({ participantId: participant.id, amount: note.balances[index] ?? 0 })); const status = calculateGameBalance(balances.map((balance) => balance.amount)); const transfers = calculateTransfers(balances); return <><section className="card game-card"><div className="section-heading"><div><span className="eyebrow">ゲーム収支</span><h2>{note.metric}</h2></div><div className={`balance-status ${status.isBalanced ? 'is-balanced' : 'is-unbalanced'}`}><span>{status.isBalanced ? '✓' : '!'}</span>{status.isBalanced ? '収支一致' : `差額 ¥${status.difference.toLocaleString('ja-JP')}`}</div></div><p className="section-description">全員の収支を合計すると0円になるか確認できます。</p><div className="game-list">{participants.map((participant, index) => <div className="game-row" key={participant.id}><div className="person"><Avatar participant={participant} small /><strong>{participant.name}</strong></div><span className={balances[index].amount >= 0 ? 'positive' : 'negative'}>{note.values[index] ?? '入力待ち'}</span><button className="edit-button">編集</button></div>)}</div><div className="game-total"><span>全員の収支合計</span><strong className={status.isBalanced ? 'positive' : 'negative'}>{status.total >= 0 ? '+' : ''}¥{status.total.toLocaleString('ja-JP')}</strong></div></section><ResultPanel balances={balances} participants={participants} transfers={transfers} /></>; }

const umaOptions = {
  4: [20000, 10000, -10000, -20000],
  3: [20000, 0, -20000],
};

const mahjongDefaults = (playerCount: 3 | 4): MahjongSettings => playerCount === 4
  ? { startingPoints: 25000, returnPoints: 30000, rate: 50, oka: 20000, uma: umaOptions[4], includeChips: false, chipValue: 100 }
  : { startingPoints: 35000, returnPoints: 40000, rate: 50, oka: 15000, uma: umaOptions[3], includeChips: false, chipValue: 100 };

type MahjongMatch = { id: string; label: string; players: MahjongPlayerInput[] };

function MahjongPanel({ participants }: { participants: typeof initialParticipants }) {
  const initialCount = participants.length >= 4 ? 4 : 3;
  const [playerCount, setPlayerCount] = useState<3 | 4>(initialCount);
  const [settings, setSettings] = useState<MahjongSettings>(() => mahjongDefaults(initialCount));
  const activeParticipants = participants.slice(0, playerCount);
  const [matches, setMatches] = useState<MahjongMatch[]>(() => [{ id: 'match-1', label: '半荘1', players: activeParticipants.map((participant) => ({ participantId: participant.id, points: settings.startingPoints, chips: 0 })) }]);

  useEffect(() => {
    setMatches((current) => current.map((match) => ({ ...match, players: activeParticipants.map((participant) => match.players.find((player) => player.participantId === participant.id) ?? { participantId: participant.id, points: settings.startingPoints, chips: 0 }) })));
  }, [playerCount, participants, settings.startingPoints]);

  const matchBalances = matches.map((match) => ({ ...match, balances: calculateMahjongBalances(match.players, settings) }));
  const finalBalances = activeParticipants.map((participant) => ({ participantId: participant.id, amount: matchBalances.reduce((sum, match) => sum + (match.balances.find((balance) => balance.participantId === participant.id)?.amount ?? 0), 0) }));
  const transfers = calculateTransfers(finalBalances);
  const status = calculateGameBalance(finalBalances.map((balance) => balance.amount));
  const scoreTarget = settings.startingPoints * activeParticipants.length;
  const updateSetting = <K extends keyof MahjongSettings>(key: K, value: MahjongSettings[K]) => setSettings((current) => ({ ...current, [key]: value }));
  const changePlayerCount = (value: 3 | 4) => { setPlayerCount(value); setSettings(mahjongDefaults(value)); };
  const updateMatchPlayer = (matchId: string, participantId: string, field: 'points' | 'chips', value: string) => setMatches((current) => current.map((match) => match.id !== matchId ? match : { ...match, players: match.players.map((player) => player.participantId === participantId ? { ...player, [field]: Math.max(0, Number(value) || 0) } : player) }));
  const addMatch = () => setMatches((current) => [...current, { id: `match-${Date.now()}`, label: `半荘${current.length + 1}`, players: activeParticipants.map((participant) => ({ participantId: participant.id, points: settings.startingPoints, chips: 0 })) }]);
  const removeMatch = (matchId: string) => setMatches((current) => current.length > 1 ? current.filter((match) => match.id !== matchId) : current);

  return <><section className="card game-card mahjong-card"><div className="section-heading"><div><span className="eyebrow">麻雀の計算条件</span><h2>半荘ごとに記録</h2></div><div className={`balance-status ${status.isBalanced ? 'is-balanced' : 'is-unbalanced'}`}><span>{status.isBalanced ? '✓' : '!'}</span>{status.isBalanced ? '収支一致' : `差額 ¥${status.difference.toLocaleString('ja-JP')}`}</div></div><div className="mahjong-settings"><label>人数<select value={playerCount} onChange={(event) => changePlayerCount(Number(event.target.value) as 3 | 4)}><option value="4">四麻</option><option value="3">三麻</option></select></label><label>レート<select value={settings.rate} onChange={(event) => updateSetting('rate', Number(event.target.value))}><option value="50">点5（×50円）</option><option value="100">点ピン（×100円）</option></select></label><label>開始点<input type="number" step="1000" value={settings.startingPoints} onChange={(event) => updateSetting('startingPoints', Math.max(0, Number(event.target.value) || 0))} /></label><label>返し点<input type="number" step="1000" value={settings.returnPoints} onChange={(event) => updateSetting('returnPoints', Math.max(0, Number(event.target.value) || 0))} /></label><label>オカ<input type="number" step="1000" value={settings.oka} onChange={(event) => updateSetting('oka', Number(event.target.value) || 0)} /></label><label>チップ価値<input type="number" step="10" value={settings.chipValue} onChange={(event) => updateSetting('chipValue', Math.max(0, Number(event.target.value) || 0))} /></label><label className="checkbox-label"><input type="checkbox" checked={settings.includeChips} onChange={(event) => updateSetting('includeChips', event.target.checked)} />チップを収支に含める</label></div><div className="uma-editor"><span>ウマ（順位ごと・点数換算）</span>{settings.uma.map((value, index) => <label key={index}>{index + 1}着<input type="number" step="1000" value={value} onChange={(event) => setSettings((current) => ({ ...current, uma: current.uma.map((uma, umaIndex) => umaIndex === index ? Number(event.target.value) || 0 : uma) }))} /></label>)}</div><p className="section-description">開始点・返し点・オカ・ウマ・レートはすべて変更できます。持ち点の合計は {scoreTarget.toLocaleString('ja-JP')} 点が基準です。</p>{matchBalances.map((match) => <div className="match-card" key={match.id}><div className="match-heading"><div><span className="eyebrow">対局記録</span><strong>{match.label}</strong></div><button className="remove-button" disabled={matches.length <= 1} onClick={() => removeMatch(match.id)}>削除</button></div><div className="mahjong-list">{activeParticipants.map((participant) => { const player = match.players.find((entry) => entry.participantId === participant.id)!; const balance = match.balances.find((entry) => entry.participantId === participant.id)?.amount ?? 0; return <div className="mahjong-row" key={participant.id}><div className="person"><Avatar participant={participant} small /><strong>{participant.name}</strong></div><label><span>終局持ち点</span><input type="number" min="0" step="100" value={player.points} onChange={(event) => updateMatchPlayer(match.id, participant.id, 'points', event.target.value)} /></label><label><span>チップ枚数</span><input type="number" min="0" step="1" value={player.chips} onChange={(event) => updateMatchPlayer(match.id, participant.id, 'chips', event.target.value)} /></label><strong className={balance >= 0 ? 'positive' : 'negative'}>{balance >= 0 ? '+' : ''}¥{balance.toLocaleString('ja-JP')}</strong></div>; })}</div><div className="game-total"><span>この半荘の持ち点合計 {match.players.reduce((sum, player) => sum + player.points, 0).toLocaleString('ja-JP')} 点</span><strong>{match.balances.reduce((sum, balance) => sum + balance.amount, 0) === 0 ? '収支一致' : '差額あり'}</strong></div></div>)}<button className="outline-button add-match-button" onClick={addMatch}>＋ 半荘を追加</button></section><ResultPanel balances={finalBalances} participants={activeParticipants} transfers={transfers} /></>;
}

function RoulettePanel({ participants }: { participants: typeof initialParticipants }) {
  const [winner, setWinner] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [amounts, setAmounts] = useState<Record<string, number>>(() => Object.fromEntries(participants.map((participant, index) => [participant.id, [12000, 8500, 6500, 3000][index] ?? 0])));
  useEffect(() => setAmounts((current) => Object.fromEntries(participants.map((participant) => [participant.id, current[participant.id] ?? 0]))), [participants]);
  const safeWinner = Math.min(winner, Math.max(0, participants.length - 1));
  const payer = participants[safeWinner];
  const shares = calculateRouletteShares(amounts);
  const total = shares.reduce((sum, share) => sum + share.amount, 0);
  let segmentStart = 0;
  const wheelSegments = shares.map((share, index) => {
    const segmentEnd = total === 0 ? 0 : segmentStart + (share.amount / total) * 100;
    const segment = `${participants[index]?.color ?? '#d9e0e8'} ${segmentStart}% ${segmentEnd}%`;
    segmentStart = segmentEnd;
    return segment;
  }).join(', ');
  const wheelBackground = total > 0 ? `conic-gradient(from 0deg, ${wheelSegments})` : 'radial-gradient(circle, #f6a623 0 7%, #fff1d5 8% 17%, #d58a3d 18% 20%, #fff8eb 21% 50%, #f6a623 51% 53%, #fff1d5 54%)';
  const updateAmount = (participantId: string, value: string) => setAmounts((current) => ({ ...current, [participantId]: Math.max(0, Number(value) || 0) }));
  const spin = () => {
    if (spinning || total === 0) return;
    const selectedId = pickWeightedParticipant(shares, Math.random());
    if (!selectedId) return;
    const nextRotation = calculateRouletteTargetRotation(rotation, shares, selectedId);
    if (nextRotation === null) return;
    setRotation(nextRotation);
    setSpinning(true);
    window.setTimeout(() => {
      setWinner(participants.findIndex((participant) => participant.id === selectedId));
      setSpinning(false);
    }, 2800);
  };
  return <section className="card roulette-card"><span className="roulette-pointer" aria-hidden="true">▼</span><div className={`roulette-wheel ${spinning ? 'spinning' : ''}`} style={{ background: wheelBackground, transform: `rotate(${rotation}deg)` }}><span>◉</span></div><span className="eyebrow">今夜の支払い担当</span><h2>{spinning ? 'ルーレットが回っています…' : `${payer?.name ?? '支払者'} が全額お支払い`}</h2><p>支払額が多い人ほど、ホイールの面積と当選確率が大きくなります。</p><button className="primary-button" disabled={spinning || total === 0} onClick={spin}>{spinning ? '抽選中…' : total === 0 ? '支払額を入力してください' : 'ルーレットを回す'} <span>↻</span></button><div className="roulette-total"><span>支払い総額</span><strong>¥{total.toLocaleString('ja-JP')}</strong></div><div className="roulette-editor"><div className="subsection-heading"><span className="eyebrow">支払い内訳</span><strong>{participants.length}人で分担</strong></div>{participants.map((participant) => { const share = shares.find((item) => item.participantId === participant.id)!; return <div className="roulette-edit-row" key={participant.id}><div className="person"><span className="roulette-color-dot" style={{ backgroundColor: participant.color }} /><Avatar participant={participant} small /><strong>{participant.name}</strong></div><label><span>¥</span><input type="number" min="0" step="100" value={share.amount} onChange={(event) => updateAmount(participant.id, event.target.value)} aria-label={`${participant.name}の支払額`} /></label><strong className="share-percent">{share.percentage.toFixed(1)}%</strong></div>; })}</div><p className="roulette-probability-note">ホイールの色付き面積が、その人に当たる確率です。</p><div className="roulette-members">{participants.map((participant, index) => <div className={`roulette-member ${index === safeWinner ? 'winner' : ''}`} key={participant.id}><Avatar participant={participant} small /><span>{participant.name}</span>{index === safeWinner && <span className="winner-mark">★</span>}</div>)}</div></section>;
}

export default App;
