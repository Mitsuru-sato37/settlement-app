import type { SettlementMode } from '../domain/model';
import { modeInfo } from '../data';

type Props = { activeMode: SettlementMode; onChange: (mode: SettlementMode) => void };

export function ModeNav({ activeMode, onChange }: Props) {
  return <aside className="sidebar">
    <div className="brand"><span className="brand-mark">↗</span><span>settlement</span></div>
    <p className="nav-label">精算モード</p>
    <nav>
      {(Object.keys(modeInfo) as SettlementMode[]).map((mode) => (
        <button type="button" className={`nav-item ${activeMode === mode ? 'active' : ''}`} key={mode} onClick={() => onChange(mode)}>
          <span className="nav-icon">{modeInfo[mode].icon}</span><span>{modeInfo[mode].label}</span>
        </button>
      ))}
    </nav>
    <div className="sidebar-bottom"><p className="sidebar-note">入力内容はこのブラウザに保存されます。</p></div>
  </aside>;
}
