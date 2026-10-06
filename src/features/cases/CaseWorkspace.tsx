import { useEffect, useState, type ChangeEvent } from 'react';
import { addCase, createCase, createSampleCase, removeCase, selectCase } from '../../domain/cases';
import type { CaseStore, Participant, SettlementCase, SettlementMode } from '../../domain/model';
import { modeInfo } from '../../data';
import { exportCaseStore, parseCaseStore } from '../../storage/caseStorage';

type Props = { store: CaseStore; onChange: (next: CaseStore) => void; saveStatus: 'saved' | 'error' | 'invalid'; defaultMode?: SettlementMode };
const modes: SettlementMode[] = ['normal', 'poker', 'mahjong', 'noriumi', 'roulette'];
const palette = ['#f6a623', '#5ad1c8', '#ff7d8e', '#8d83ff', '#4a9bdd', '#b58c6b'];
function id() { return globalThis.crypto?.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(36).slice(2)}`; }

export function CaseWorkspace({ store, onChange, saveStatus, defaultMode = 'normal' }: Props) {
  const [title, setTitle] = useState('');
  const [mode, setMode] = useState<SettlementMode>(defaultMode);
  useEffect(() => { setMode(defaultMode); }, [defaultMode]);
  const [personName, setPersonName] = useState('');
  const [importError, setImportError] = useState('');
  const active = store.cases.find((item) => item.id === store.activeCaseId) ?? null;

  const updateActive = (next: SettlementCase) => onChange({ ...store, cases: store.cases.map((item) => item.id === next.id ? { ...next, updatedAt: new Date().toISOString() } : item) });
  const create = (selectedMode = mode, sample = false) => {
    const now = new Date().toISOString();
    const name = title.trim() || modeInfo[selectedMode].title;
    const next = sample ? { ...createSampleCase(selectedMode, id(), now), title: name } : createCase(selectedMode, name, id(), now);
    onChange(addCase(store, next)); setTitle(''); setMode(selectedMode);
  };
  const addPerson = () => {
    if (!active || !personName.trim()) return;
    const name = personName.trim();
    const person: Participant = { id: id(), name, initials: name.slice(0, 2), color: palette[active.participants.length % palette.length] };
    updateActive({ ...active, participants: [...active.participants, person] });
    setPersonName('');
  };
  const removePerson = (person: Participant) => {
    if (!active) return;
    if (active.mode === 'normal' && active.expenses.some((expense) => expense.payerId === person.id)) { window.alert('支払者になっている明細を先に変更してください'); return; }
    if (active.mode === 'mahjong' && active.matches.some((match) => match.players.some((player) => player.participantId === person.id))) { window.alert('半荘の席を先に変更してください'); return; }
    if (!window.confirm(`${person.name}を削除しますか？入力行も削除されます。`)) return;
    const participants = active.participants.filter((item) => item.id !== person.id);
    switch (active.mode) {
      case 'normal': updateActive({ ...active, participants, expenses: active.expenses.map((expense) => ({ ...expense, participantIds: expense.participantIds.filter((participantId) => participantId !== person.id) })) }); break;
      case 'poker': { const amounts = { ...active.amounts }; delete amounts[person.id]; updateActive({ ...active, participants, amounts }); break; }
      case 'noriumi': { const entries = { ...active.entries }; delete entries[person.id]; updateActive({ ...active, participants, entries }); break; }
      case 'roulette': { const amounts = { ...active.amounts }; delete amounts[person.id]; updateActive({ ...active, participants, amounts, winnerId: null }); break; }
      case 'mahjong': updateActive({ ...active, participants }); break;
    }
  };
  const readImport = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImportError('');
    if (file.size > 1024 * 1024) { setImportError('読み込めません: ファイルが 1 MiB を超えています'); event.target.value = ''; return; }
    const reader = new FileReader();
    reader.onload = () => {
      const result = parseCaseStore(String(reader.result ?? ''));
      if (!result.ok) { setImportError(`読み込めません: ${result.error}`); return; }
      if (window.confirm('現在の全記録を読み込んだ内容で上書きしますか？')) onChange(result.value);
    };
    reader.onerror = () => setImportError('読み込めません: ファイルを開けません');
    reader.readAsText(file);
    event.target.value = '';
  };
  const download = () => {
    const blob = new Blob([exportCaseStore(store)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = 'settlement-backup.json'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  return <section className="case-workspace card" aria-label="記録と参加者">
    <div className="case-workspace-heading"><div><h2>精算記録</h2><p>このブラウザに保存。データ消去に備えて JSON を書き出してください。</p></div><span className={saveStatus === 'saved' ? 'save-ok' : 'save-error'} role="status">{saveStatus === 'error' ? '保存できません' : saveStatus === 'invalid' ? '入力中・未保存' : '保存済み'}</span></div>
    <div className="case-create"><input aria-label="記録名" placeholder="記録名（例：旅行）" value={title} onChange={(event) => setTitle(event.target.value)} />
      <select aria-label="記録の種類" value={mode} onChange={(event) => setMode(event.target.value as SettlementMode)}>{modes.map((item) => <option key={item} value={item}>{modeInfo[item].label}</option>)}</select>
      <button type="button" className="primary-button" onClick={() => create()}>記録を作成</button>
    </div>
    <div className="case-quick-create">{modes.filter((item) => item !== 'normal').map((item) => <button type="button" className="outline-button" key={item} onClick={() => create(item)}>{modeInfo[item].label}を作成</button>)}</div>
    <div className="case-list" aria-label="記録一覧">{store.cases.length === 0 ? <p>記録はまだありません。新しく作成してください。</p> : store.cases.map((item) => <button type="button" className={item.id === active?.id ? 'case-list-item active' : 'case-list-item'} key={item.id} onClick={() => onChange(selectCase(store, item.id))} aria-label={`${item.title}を開く`}>{item.title}<small>{modeInfo[item.mode].label}</small></button>)}</div>
    {active && <div className="case-current"><div className="case-current-heading"><h3>{active.title} <small>{modeInfo[active.mode].label}</small></h3><div><button type="button" className="outline-button" onClick={() => create(active.mode, true)}>サンプルを読み込む</button> <button type="button" className="remove-button" onClick={() => { if (window.confirm(`「${active.title}」を削除しますか？`)) onChange(removeCase(store, active.id)); }}>記録を削除</button></div></div>
      <div className="participant-add"><input aria-label="参加者名" placeholder="参加者名" value={personName} onChange={(event) => setPersonName(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') addPerson(); }} /><button type="button" className="outline-button" onClick={addPerson}>参加者を追加</button></div>
      {active.participants.length === 0 ? <p>参加者を追加してください。</p> : <div className="case-people">{active.participants.map((person) => <div className="case-person" key={person.id}><span className="avatar avatar-small" style={{ backgroundColor: person.color }}>{person.initials}</span><input aria-label={`${person.name}の名前`} value={person.name} onChange={(event) => { const name = event.target.value; updateActive({ ...active, participants: active.participants.map((item) => item.id === person.id ? { ...item, name, initials: name.slice(0, 2) } : item) }); }} /><button type="button" className="remove-button" aria-label={`${person.name}を削除`} onClick={() => removePerson(person)}>削除</button></div>)}</div>}
    </div>}
    <div className="case-backup"><button type="button" className="outline-button" onClick={download}>JSON を書き出す</button><label className="outline-button">JSON を読み込む<input type="file" accept=".json,application/json" onChange={readImport} /></label></div>
    {importError && <p className="form-error" role="alert">{importError}</p>}
  </section>;
}
