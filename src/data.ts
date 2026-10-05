import type { ExpenseItem, Participant, SettlementMode } from './domain/model';

export const participants: Participant[] = [
  { id: 'mitsu', name: 'みつる', initials: 'MS', color: '#f6a623' },
  { id: 'ken', name: 'けん', initials: 'KN', color: '#5ad1c8' },
  { id: 'yuki', name: 'ゆうき', initials: 'YK', color: '#ff7d8e' },
  { id: 'sato', name: 'さとし', initials: 'ST', color: '#8d83ff' },
];

export const modeInfo: Record<SettlementMode, { label: string; title: string; description: string; icon: string }> = {
  normal: { label: '通常精算', title: '週末キャンプの精算', description: '明細ごとに参加者を選んで、きっちり割り勘。', icon: '◎' },
  poker: { label: 'ポーカー', title: 'Poker Night #24', description: 'チップの増減を入力して、最終収支を精算。', icon: '♠' },
  mahjong: { label: '麻雀', title: 'いつもの雀荘', description: '点棒の収支から、支払いを自動で整理。', icon: '🀄' },
  noriumi: { label: 'ノリ打ち', title: 'ノリ打ち精算', description: '投資と回収をまとめて、収支をシェア。', icon: '◈' },
  roulette: { label: '全額払いルーレット', title: '全額払いルーレット', description: '今夜の支払い担当をランダムに決めよう。', icon: '◉' },
};

export const defaultExpenses: ExpenseItem[] = [
  { id: 'stay', label: 'コテージ宿泊費', amount: 24000, payerId: 'mitsu', participantIds: ['mitsu', 'ken', 'yuki', 'sato'] },
  { id: 'bbq', label: 'BBQ 食材・飲み物', amount: 8600, payerId: 'ken', participantIds: ['mitsu', 'ken', 'yuki', 'sato'] },
  { id: 'train', label: 'レンタカー・ガソリン', amount: 7200, payerId: 'yuki', participantIds: ['mitsu', 'ken', 'yuki'] },
];

export const gameNotes: Record<Exclude<SettlementMode, 'normal' | 'roulette'>, { metric: string; values: string[] }> = {
  poker: { metric: 'チップ収支', values: ['+ ¥12,000', '- ¥4,000', '+ ¥7,500', '- ¥15,500'] },
  mahjong: { metric: '点棒収支', values: ['+ 42,000', '- 18,000', '+ 6,000', '- 30,000'] },
  noriumi: { metric: '投資 / 回収', values: ['¥10,000 / ¥18,500', '¥10,000 / ¥3,000', '¥10,000 / ¥12,000', '¥10,000 / ¥6,500'] },
};
