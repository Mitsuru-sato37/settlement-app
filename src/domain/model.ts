export type SettlementMode = 'normal' | 'poker' | 'mahjong' | 'noriumi' | 'roulette';

export type Participant = {
  id: string;
  name: string;
  initials: string;
  color: string;
};

export type ExpenseItem = {
  id: string;
  label: string;
  amount: number;
  payerId: string;
  participantIds: string[];
};

export type Balance = {
  participantId: string;
  amount: number;
};

export type SettlementSummary = {
  total: number;
  balances: Balance[];
};

export type Transfer = {
  fromId: string;
  toId: string;
  amount: number;
};

export type GameBalanceStatus = {
  total: number;
  difference: number;
  isBalanced: boolean;
};

export type RouletteShare = {
  participantId: string;
  amount: number;
  percentage: number;
};

export type MahjongPlayerInput = {
  participantId: string;
  points: number;
  chips: number;
};

export type MahjongSettings = {
  startingPoints: number;
  returnPoints: number;
  rate: number;
  oka: number;
  uma: number[];
  includeChips: boolean;
  chipValue: number;
};

export type SettlementResult = {
  balances: Balance[];
  transfers: Transfer[];
  issues: string[];
  difference: number;
};

type CaseBase = {
  id: string;
  title: string;
  participants: Participant[];
  createdAt: string;
  updatedAt: string;
};

export type NormalCase = CaseBase & { mode: 'normal'; expenses: ExpenseItem[] };
export type PokerCase = CaseBase & { mode: 'poker'; amounts: Record<string, number> };
export type MahjongMatch = { id: string; label: string; players: MahjongPlayerInput[] };
export type MahjongCase = CaseBase & { mode: 'mahjong'; playerCount: 3 | 4; settings: MahjongSettings; matches: MahjongMatch[]; nextMatchNumber: number };
export type NoriumiCase = CaseBase & { mode: 'noriumi'; entries: Record<string, { investment: number; recovery: number }> };
export type RouletteCase = CaseBase & { mode: 'roulette'; amounts: Record<string, number>; winnerId: string | null; rotation: number };
export type SettlementCase = NormalCase | PokerCase | MahjongCase | NoriumiCase | RouletteCase;
export type CaseStore = { schemaVersion: 1; activeCaseId: string | null; cases: SettlementCase[] };
