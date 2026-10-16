import type { Balance, Participant, Transfer } from '../../domain/model';

export type ShareImageInput = {
  title: string;
  modeLabel: string;
  createdAt: Date;
  participants: Participant[];
  balances: Balance[];
  transfers: Transfer[];
};

const WIDTH = 1080;
const PADDING = 72;
const LINE_HEIGHT = 45;
const FONT = 'system-ui, "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif';

export function wrapText(text: string, maxWidth: number, measure: (text: string) => number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const character of text) {
    if (line && measure(line + character) > maxWidth) {
      lines.push(line);
      line = character;
    } else line += character;
  }
  if (line || lines.length === 0) lines.push(line);
  return lines;
}

export async function renderResultPng(input: ShareImageInput): Promise<Blob> {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) throw new Error('画像を作成できません');
  canvas.width = WIDTH;
  context.font = `bold 40px ${FONT}`;
  const measure = (text: string) => context.measureText(text).width;
  const titleLines = wrapText(input.title, WIDTH - PADDING * 2, measure);
  context.font = `30px ${FONT}`;
  const names = new Map(input.participants.map((person) => [person.id, person.name]));
  const measureAmount = (amount: string) => {
    context.font = `bold 28px ${FONT}`;
    const width = context.measureText(amount).width;
    context.font = `30px ${FONT}`;
    return width;
  };
  const balanceRows = input.balances.map((balance) => {
    const amount = balance.amount === 0 ? '0円' : `${balance.amount > 0 ? '受け取り' : '支払い'} ${Math.abs(balance.amount).toLocaleString('ja-JP')}円`;
    const amountWidth = measureAmount(amount);
    return { lines: wrapText(names.get(balance.participantId) ?? balance.participantId, 480, measure), amount, amountWidth, separateAmount: amountWidth > 320 };
  });
  const transferRows = input.transfers.map((transfer) => {
    const amount = `${transfer.amount.toLocaleString('ja-JP')}円`;
    const amountWidth = measureAmount(amount);
    return { lines: wrapText(`${names.get(transfer.fromId) ?? transfer.fromId} → ${names.get(transfer.toId) ?? transfer.toId}`, 580, measure), amount, amountWidth, separateAmount: amountWidth > 240 };
  });
  const rowHeight = (lines: string[], separateAmount = false) => Math.max(70, lines.length * LINE_HEIGHT + 20) + (separateAmount ? LINE_HEIGHT + 5 : 0);
  const titleHeight = titleLines.length * 58;
  const balancesHeight = balanceRows.reduce((sum, row) => sum + rowHeight(row.lines, row.separateAmount), 0);
  const transfersHeight = transferRows.length === 0 ? 82 : transferRows.reduce((sum, row) => sum + rowHeight(row.lines, row.separateAmount), 0);
  const height = PADDING * 2 + titleHeight + 72 + 80 + balancesHeight + 100 + transfersHeight + 45;
  if (!Number.isSafeInteger(height) || height > 32000) throw new Error('画像が大きすぎます');
  canvas.height = height;

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, WIDTH, height);
  const draw = (text: string, x: number, y: number, font: string, color: string) => {
    context.font = font;
    context.fillStyle = color;
    context.fillText(text, x, y);
  };
  let y = PADDING + 37;
  for (const line of titleLines) { draw(line, PADDING, y, `bold 40px ${FONT}`, '#1f2b3a'); y += 58; }
  draw(`${input.modeLabel}  ·  ${new Intl.DateTimeFormat('ja-JP', { dateStyle: 'medium', timeStyle: 'short' }).format(input.createdAt)} 作成`, PADDING, y + 5, `26px ${FONT}`, '#536176');
  y += 92;
  draw('最終収支', PADDING, y, `bold 34px ${FONT}`, '#1f2b3a');
  draw('収支一致', WIDTH - PADDING - 135, y, `28px ${FONT}`, '#168671');
  y += 50;
  for (const row of balanceRows) {
    const top = y;
    context.fillStyle = '#f7f9fb';
    context.fillRect(PADDING, top, WIDTH - PADDING * 2, rowHeight(row.lines, row.separateAmount) - 8);
    row.lines.forEach((line, index) => draw(line, PADDING + 20, top + 43 + index * LINE_HEIGHT, `30px ${FONT}`, '#263243'));
    draw(row.amount, row.separateAmount ? WIDTH - PADDING - row.amountWidth : WIDTH - PADDING - 320, top + 43 + (row.separateAmount ? row.lines.length * LINE_HEIGHT : 0), `bold 28px ${FONT}`, '#263243');
    y += rowHeight(row.lines, row.separateAmount);
  }
  y += 60;
  draw('送金一覧', PADDING, y, `bold 34px ${FONT}`, '#1f2b3a');
  y += 54;
  if (transferRows.length === 0) {
    draw('送金なし', PADDING, y + 34, `30px ${FONT}`, '#536176');
    y += 82;
  } else {
    for (const row of transferRows) {
      const top = y;
      row.lines.forEach((line, index) => draw(line, PADDING, top + 42 + index * LINE_HEIGHT, `30px ${FONT}`, '#263243'));
      draw(row.amount, row.separateAmount ? WIDTH - PADDING - row.amountWidth : WIDTH - PADDING - 240, top + 42 + (row.separateAmount ? row.lines.length * LINE_HEIGHT : 0), `bold 28px ${FONT}`, '#263243');
      y += rowHeight(row.lines, row.separateAmount);
    }
  }

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('PNG画像を作成できません')), 'image/png');
  });
}
