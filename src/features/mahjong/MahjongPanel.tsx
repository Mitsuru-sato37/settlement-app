import { NumberField } from '../../components/NumberField';
import { ResultPanel } from '../../components/ResultPanel';
import { defaultMahjongSettings } from '../../domain/cases';
import { calculateMahjongCase, calculateMahjongMatch } from '../../domain/mahjong';
import type { MahjongCase, MahjongMatch, MahjongSettings } from '../../domain/model';

type Props = { value: MahjongCase; onChange: (next: MahjongCase) => void };
function id() { return globalThis.crypto?.randomUUID?.() ?? `h-${Date.now()}-${Math.random().toString(36).slice(2)}`; }

export function MahjongPanel({ value, onChange }: Props) {
  const result = calculateMahjongCase(value);
  const updateSettings = (changes: Partial<MahjongSettings>) => onChange({ ...value, settings: { ...value.settings, ...changes } });
  const updateMatch = (matchId: string, next: MahjongMatch) => onChange({ ...value, matches: value.matches.map((item) => item.id === matchId ? next : item) });
  const addMatch = () => {
    const label = `半荘${value.nextMatchNumber}`;
    const players = Array.from({ length: value.playerCount }, (_, index) => ({ participantId: value.participants[index]?.id ?? '', points: value.settings.startingPoints, chips: 0 }));
    onChange({ ...value, matches: [...value.matches, { id: id(), label, players }], nextMatchNumber: value.nextMatchNumber + 1 });
  };
  const changeCount = (count: 3 | 4) => {
    if (count === value.playerCount) return;
    if (value.matches.length > 0 && !window.confirm('人数を変更すると既存の半荘を削除します。続けますか？')) return;
    onChange({ ...value, playerCount: count, settings: defaultMahjongSettings(count), matches: [], nextMatchNumber: 1 });
  };
  const changePlayer = (match: MahjongMatch, index: number, changes: Partial<MahjongMatch['players'][number]>) => updateMatch(match.id, { ...match, players: match.players.map((player, seat) => seat === index ? { ...player, ...changes } : player) });

  return <div className="mode-panel">
    <div className="mahjong-summary"><ResultPanel balances={result.balances} participants={value.participants} transfers={result.transfers} issues={result.issues} title="現時点での集計" eyebrow="全半荘の累計" /></div>
    <section className="card game-card"><div className="section-heading"><div><span className="eyebrow">麻雀</span><h2>ルール設定</h2></div></div>
      <div className="mahjong-settings">
        <label>人数<select aria-label="麻雀人数" value={value.playerCount} onChange={(event) => changeCount(Number(event.target.value) as 3 | 4)}><option value="4">四麻</option><option value="3">三麻</option></select></label>
        <label>開始点<NumberField label="開始点" value={value.settings.startingPoints} onChange={(startingPoints) => updateSettings({ startingPoints })} /></label>
        <label>返し点<NumberField label="返し点" value={value.settings.returnPoints} onChange={(returnPoints) => updateSettings({ returnPoints })} /></label>
        <label>レート（1000点あたり円）<NumberField label="レート" value={value.settings.rate} decimal onChange={(rate) => updateSettings({ rate })} /></label>
        <label>オカ（点）<NumberField label="オカ" value={value.settings.oka} signed onChange={(oka) => updateSettings({ oka })} /></label>
        {value.settings.uma.map((uma, index) => <label key={index}>{index + 1}位ウマ（点）<NumberField label={`${index + 1}位ウマ`} value={uma} signed onChange={(amount) => updateSettings({ uma: value.settings.uma.map((item, rank) => rank === index ? amount : item) })} /></label>)}
        <label className="checkbox-label"><input aria-label="チップを含める" type="checkbox" checked={value.settings.includeChips} onChange={(event) => updateSettings({ includeChips: event.target.checked })} />チップを含める</label>
        {value.settings.includeChips && <label>チップ1枚（円）<NumberField label="チップ単価" value={value.settings.chipValue} onChange={(chipValue) => updateSettings({ chipValue })} /></label>}
      </div><p className="section-description">点5は 50 円、点ピンは 100 円を目安に、自由に入力できます。</p>
    </section>
    <section className="card game-card mahjong-records"><div className="section-heading"><div><span className="eyebrow">半荘の記録</span><h2>古い順に記録、最新を上に表示</h2></div><div className="history-actions"><button type="button" className="outline-button add-match-button" onClick={addMatch}>＋ 半荘を追加</button></div></div>
      {value.matches.length === 0 ? <p className="section-description">半荘はまだありません。</p> : [...value.matches].reverse().map((match) => {
        const matchResult = calculateMahjongMatch(match, value.settings, value.playerCount);
        return <div className="match-card" key={match.id}><div className="match-heading"><strong>{match.label}</strong><button type="button" className="remove-button" onClick={() => { if (window.confirm(`${match.label}を削除しますか？`)) onChange({ ...value, matches: value.matches.filter((item) => item.id !== match.id) }); }}>削除</button></div>
          <div className="mahjong-list">{match.players.map((player, index) => <div className="mahjong-row" key={index}><label>席 {index + 1}<select aria-label={`${match.label} 席${index + 1}`} value={player.participantId} onChange={(event) => changePlayer(match, index, { participantId: event.target.value })}><option value="">選択してください</option>{value.participants.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select></label><label>終局持ち点<NumberField label={`${match.label} 席${index + 1}の点数`} value={player.points} onChange={(points) => changePlayer(match, index, { points })} /></label><label>チップ枚数<NumberField label={`${match.label} 席${index + 1}のチップ`} value={player.chips} onChange={(chips) => changePlayer(match, index, { chips })} /></label><strong>{matchResult.balances[index]?.amount.toLocaleString('ja-JP') ?? 0} 円</strong></div>)}</div>
          {matchResult.issues.length > 0 ? <div className="result-issues">{matchResult.issues.map((issue, index) => <p key={index}>{issue}</p>)}</div> : <div className="game-total">半荘収支：一致</div>}
        </div>;
      })}
    </section>
  </div>;
}
