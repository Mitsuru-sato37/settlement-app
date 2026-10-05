import type { SettlementMode } from '../domain/model';
import { modeInfo } from '../data';
import { Avatar } from './Avatar';

type Props = { activeMode: SettlementMode; onChange: (mode: SettlementMode) => void };

export function ModeNav({ activeMode, onChange }: Props) {
  return <aside className="sidebar">
    <div className="brand"><span className="brand-mark">↗</span><span>settlement</span></div>
    <div className="workspace"><span className="workspace-dot" />週末キャンプ <span className="chevron">⌄</span></div>
    <p className="nav-label">精算モード</p>
    <nav>
      {(Object.keys(modeInfo) as SettlementMode[]).map((mode) => (
        <button className={`nav-item ${activeMode === mode ? 'active' : ''}`} key={mode} onClick={() => onChange(mode)}>
          <span className="nav-icon">{modeInfo[mode].icon}</span><span>{modeInfo[mode].label}</span>
          {mode === 'normal' && <span className="nav-count">3</span>}
        </button>
      ))}
    </nav>
    <div className="sidebar-bottom"><button className="help-link">? <span>使い方ガイド</span></button><div className="profile"><Avatar participant={{ ...{ id: 'me', name: 'みつる', initials: 'MS', color: '#f6a623' } }} small /><span><strong>みつる</strong><small>マイアカウント</small></span><span className="chevron">⌄</span></div></div>
  </aside>;
}
