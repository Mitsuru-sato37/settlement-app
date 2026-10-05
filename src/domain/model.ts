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
