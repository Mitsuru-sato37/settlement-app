import { useCallback, useEffect, useState } from 'react';
import { ModeNav } from './components/ModeNav';
import { Avatar } from './components/Avatar';
import { modeInfo } from './data';
import { createEmptyStore, selectCase } from './domain/cases';
import type { CaseStore, SettlementCase, SettlementMode } from './domain/model';
import { CaseWorkspace } from './features/cases/CaseWorkspace';
import { NormalPanel } from './features/normal/NormalPanel';
import { PokerPanel } from './features/poker/PokerPanel';
import { MahjongPanel } from './features/mahjong/MahjongPanel';
import { NoriumiPanel } from './features/noriumi/NoriumiPanel';
import { RoulettePanel } from './features/roulette/RoulettePanel';
import { loadCaseStore, saveCaseStore, STORAGE_KEY } from './storage/caseStorage';

function initialLoad() {
  try { return loadCaseStore(window.localStorage); }
  catch { return { ok: false as const, error: 'ブラウザの保存領域にアクセスできません' }; }
}

function App() {
  const [loaded] = useState(initialLoad);
  const [store, setStore] = useState<CaseStore>(loaded.ok ? loaded.value : createEmptyStore());
  const [loadError, setLoadError] = useState<string | null>(loaded.ok ? null : loaded.error);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'error'>(loaded.ok ? 'saved' : 'error');
  const initialActive = loaded.ok ? loaded.value.cases.find((item) => item.id === loaded.value.activeCaseId) : null;
  const [viewMode, setViewMode] = useState<SettlementMode>(initialActive?.mode ?? 'normal');
  const [draftValidity, setDraftValidity] = useState<{ caseId: string | null; valid: boolean }>({ caseId: null, valid: true });
  const active = store.cases.find((item) => item.id === store.activeCaseId) ?? null;
  const onDraftValidityChange = useCallback((valid: boolean) => {
    const caseId = active?.id ?? null;
    setDraftValidity((current) => current.caseId === caseId && current.valid === valid ? current : { caseId, valid });
  }, [active?.id]);
  const displayStatus = saveStatus === 'error' ? 'error' : active && draftValidity.caseId === active.id && !draftValidity.valid ? 'invalid' : 'saved';
  const mode = active?.mode ?? viewMode;
  const info = modeInfo[mode];

  useEffect(() => {
    if (loadError) { setSaveStatus('error'); return; }
    try { setSaveStatus(saveCaseStore(window.localStorage, store).ok ? 'saved' : 'error'); }
    catch { setSaveStatus('error'); }
  }, [store, loadError]);

  const changeStore = (next: CaseStore) => {
    const nextActive = next.cases.find((item) => item.id === next.activeCaseId);
    if (nextActive) setViewMode(nextActive.mode);
    setStore(next);
  };
  const navigate = (nextMode: SettlementMode) => {
    setViewMode(nextMode);
    const nextActive = [...store.cases].reverse().find((item) => item.mode === nextMode);
    setStore(nextActive ? selectCase(store, nextActive.id) : { ...store, activeCaseId: null });
  };
  const updateCase = (next: SettlementCase) => changeStore({ ...store, cases: store.cases.map((item) => item.id === next.id ? { ...next, updatedAt: new Date().toISOString() } : item) });
  const retrySave = () => {
    try { setSaveStatus(saveCaseStore(window.localStorage, store).ok ? 'saved' : 'error'); }
    catch { setSaveStatus('error'); }
  };
  const downloadUnreadable = () => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw === null) return;
      const url = URL.createObjectURL(new Blob([raw], { type: 'application/json' }));
      const link = document.createElement('a'); link.href = url; link.download = 'settlement-unreadable-backup.json'; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch { window.alert('元データを読み取れませんでした'); }
  };
  const restart = () => {
    if (!window.confirm('読み込めない保存データを上書きし、現在の画面の記録から保存を再開しますか？必要なら先に元データを保存してください。')) return;
    setLoadError(null);
  };

  return <div className="app-shell"><ModeNav activeMode={mode} onChange={navigate} /><main className="main-content">
    <header className="topbar"><div className="breadcrumb"><span>精算</span><span>/</span><strong>{info.label}</strong></div><span className="topbar-save">{displayStatus === 'saved' ? 'このブラウザに保存済み' : displayStatus === 'invalid' ? '入力中・未保存' : '保存できません'}{displayStatus === 'error' && !loadError && <button type="button" className="outline-button" onClick={retrySave}>再試行</button>}</span></header>
    <div className="content-wrap"><section className="hero"><div><div className="mode-kicker"><span className="mode-symbol">{info.icon}</span><span>{info.label}</span></div><h1>{active?.title ?? info.title}</h1><p>{active ? info.description : '新しい記録を作成してください。'}</p></div>{active && <div className="hero-people">{active.participants.map((person) => <Avatar participant={person} key={person.id} />)}<span className="people-count">{active.participants.length}人参加</span></div>}</section>
      {loadError && <section className="load-error card" role="alert"><strong>保存データを読み込めません</strong><p>{loadError}。元の保存データは変更していません。必要なら元データを保存し、確認してから再開してください。</p><div><button type="button" className="outline-button" onClick={downloadUnreadable}>元データを保存</button><button type="button" className="remove-button" onClick={restart}>新しい記録で再開</button></div></section>}
      <CaseWorkspace store={store} onChange={changeStore} onImport={(next) => { setLoadError(null); changeStore(next); }} saveStatus={displayStatus} defaultMode={mode} />
      {active?.mode === 'normal' ? <NormalPanel key={active.id} value={active} onChange={updateCase} onDraftValidityChange={onDraftValidityChange} /> : active?.mode === 'poker' ? <PokerPanel key={active.id} value={active} onChange={updateCase} onDraftValidityChange={onDraftValidityChange} /> : active?.mode === 'mahjong' ? <MahjongPanel key={active.id} value={active} onChange={updateCase} onDraftValidityChange={onDraftValidityChange} /> : active?.mode === 'noriumi' ? <NoriumiPanel key={active.id} value={active} onChange={updateCase} onDraftValidityChange={onDraftValidityChange} /> : active?.mode === 'roulette' ? <RoulettePanel key={active.id} value={active} onChange={updateCase} onDraftValidityChange={onDraftValidityChange} /> : <section className="card empty-mode"><h2>{info.label}の記録はまだありません</h2><p>上の「記録を作成」から始められます。</p></section>}
      <footer><span>settlement v1 · このブラウザのみで保存</span><span>ブラウザのデータ消去に備えて JSON を書き出してください</span></footer>
    </div></main></div>;
}

export default App;
