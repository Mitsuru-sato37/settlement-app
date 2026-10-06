import { useEffect, useRef, useState } from 'react';
import { Avatar } from '../../components/Avatar';
import { NumberField } from '../../components/NumberField';
import type { RouletteCase } from '../../domain/model';
import { calculateRouletteShares, calculateRouletteTargetRotation, pickWeightedParticipant } from '../../domain/settlement';

type Props = { value: RouletteCase; onChange: (next: RouletteCase) => void; random?: () => number; onDraftValidityChange?: (valid: boolean) => void };

export function RoulettePanel({ value, onChange, random = Math.random, onDraftValidityChange }: Props) {
  const [spinning, setSpinning] = useState(false);
  const [invalidIds, setInvalidIds] = useState<Record<string, boolean>>({});
  const pending = useRef<{ winnerId: string; signature: string } | null>(null);
  const timer = useRef<number | null>(null);
  const latest = useRef(value); latest.current = value;
  const signature = JSON.stringify([value.participants.map((person) => [person.id, person.color]), value.amounts]);
  const previousSignature = useRef(signature);
  const orderedAmounts = Object.fromEntries(value.participants.map((person) => [person.id, value.amounts[person.id] ?? 0]));
  const shares = calculateRouletteShares(orderedAmounts);
  const total = shares.reduce((sum, share) => sum + share.amount, 0);
  const hasInvalid = value.participants.some((person) => invalidIds[person.id]);
  useEffect(() => { onDraftValidityChange?.(!hasInvalid); }, [hasInvalid, onDraftValidityChange]);
  const winner = value.participants.find((person) => person.id === value.winnerId && (orderedAmounts[person.id] ?? 0) > 0);

  const clearTimer = () => { if (timer.current !== null) { window.clearTimeout(timer.current); timer.current = null; } };
  const finish = () => {
    const current = pending.current;
    if (!current) return;
    pending.current = null; clearTimer(); setSpinning(false);
    const active = latest.current;
    const activeSignature = JSON.stringify([active.participants.map((person) => [person.id, person.color]), active.amounts]);
    if (activeSignature !== current.signature || !active.participants.some((person) => person.id === current.winnerId) || (active.amounts[current.winnerId] ?? 0) <= 0) return;
    onChange({ ...active, winnerId: current.winnerId });
  };
  useEffect(() => {
    if (previousSignature.current !== signature) {
      previousSignature.current = signature;
      if (pending.current) { pending.current = null; clearTimer(); setSpinning(false); }
      if (value.winnerId) onChange({ ...value, winnerId: null });
    }
  }, [signature]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { if (timer.current !== null) window.clearTimeout(timer.current); }, []);

  let start = 0;
  const segments = shares.map((share, index) => {
    const end = total === 0 ? 0 : start + share.amount / total * 100;
    const segment = `${value.participants[index].color} ${start}% ${end}%`;
    start = end;
    return segment;
  }).join(', ');
  const background = total > 0 ? `conic-gradient(from 0deg, ${segments})` : '#f4f6f8';
  const spin = () => {
    if (spinning || hasInvalid || total <= 0) return;
    const selected = pickWeightedParticipant(shares, random());
    if (!selected) return;
    const rotation = calculateRouletteTargetRotation(value.rotation, shares, selected);
    if (rotation === null) return;
    pending.current = { winnerId: selected, signature };
    setSpinning(true);
    onChange({ ...value, winnerId: null, rotation });
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) timer.current = window.setTimeout(finish, 0);
    else timer.current = window.setTimeout(finish, 3800);
  };
  const updateAmount = (participantId: string, amount: number) => onChange({ ...value, amounts: { ...value.amounts, [participantId]: amount }, winnerId: null });
  const setValidity = (participantId: string, valid: boolean) => {
    setInvalidIds((current) => ({ ...current, [participantId]: !valid }));
    if (!valid && value.winnerId) onChange({ ...value, winnerId: null });
  };

  return <section className="card roulette-card">
    <div className="roulette-stage"><span className="roulette-pointer" aria-hidden="true">▼</span><div className={`roulette-wheel ${spinning ? 'spinning' : ''}`} onTransitionEnd={(event) => { if (event.target === event.currentTarget && event.propertyName === 'transform') finish(); }} style={{ background, transform: `rotate(${value.rotation}deg)` }}><span>◉</span></div></div>
    <span className="eyebrow">今夜の支払い担当</span>
    <h2>{spinning ? 'ルーレットが回っています…' : winner ? `${winner.name} が全額お支払い` : 'ルーレットを回して支払者を決定'}</h2>
    <p>支払額が多い人ほど、ホイールの面積と当選確率が大きくなります。</p>
    <button type="button" className="primary-button" disabled={spinning || hasInvalid || total === 0} onClick={spin}>{spinning ? '抽選中…' : total === 0 || hasInvalid ? '支払額を入力してください' : 'ルーレットを回す'} <span>↻</span></button>
    <div className="roulette-total"><span>支払い総額</span><strong>¥{total.toLocaleString('ja-JP')}</strong></div>
    <div className="roulette-editor"><div className="subsection-heading"><span className="eyebrow">支払い内訳</span><strong>{value.participants.length}人</strong></div>
      {value.participants.map((person, index) => <div className="roulette-edit-row" key={person.id}><div className="person"><span className="roulette-color-dot" style={{ backgroundColor: person.color }} /><Avatar participant={person} small /><strong>{person.name}</strong></div><label><span>¥</span><NumberField label={`${person.name}の支払額`} value={orderedAmounts[person.id]} disabled={spinning} onChange={(amount) => updateAmount(person.id, amount)} onValidityChange={(valid) => setValidity(person.id, valid)} /></label><strong className="share-percent">{shares[index].percentage.toFixed(1)}%</strong></div>)}
    </div><p className="roulette-probability-note">ホイールの色付き面積が、その人に当たる確率です。</p>
    <div className="roulette-members">{value.participants.map((person) => <div className={`roulette-member ${person.id === winner?.id ? 'winner' : ''}`} key={person.id}><Avatar participant={person} small /><span>{person.name}</span>{person.id === winner?.id && <span className="winner-mark">★</span>}</div>)}</div>
  </section>;
}
