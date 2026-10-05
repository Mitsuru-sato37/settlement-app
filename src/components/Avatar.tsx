import type { Participant } from '../domain/model';

export function Avatar({ participant, small = false }: { participant: Participant; small?: boolean }) {
  return <span className={`avatar ${small ? 'avatar-small' : ''}`} style={{ backgroundColor: participant.color }} title={participant.name}>{participant.initials}</span>;
}
