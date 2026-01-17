// src/logic/matchMachine.ts

export type MatchState =
  | 'IDLE'
  | 'DATE_MODE_ON'
  | 'NEARBY_CANDIDATE_FOUND'
  | 'AWAITING_CONFIRMATION'
  | 'NAVIGATING'
  | 'VERY_CLOSE'
  | 'MATCHED'
  | 'CANCELLED';

export type MatchEvent =
  | 'DATE_MODE_ENABLED'
  | 'DATE_MODE_DISABLED'
  | 'NEARBY_DETECTED'
  | 'USER_ACCEPTED'
  | 'USER_DECLINED'
  | 'WAITING_OTHER'
  | 'BOTH_ACCEPTED'
  | 'PARTNER_DECLINED'
  | 'DIRECTION_CORRECT'
  | 'DIRECTION_WRONG'
  | 'DISTANCE_DECREASING'
  | 'DISTANCE_INCREASING'
  | 'BLUETOOTH_CLOSE'
  | 'MATCH_CONFIRMED'
  | 'CANCEL';

export const initialMatchState: MatchState = 'IDLE';

export function matchReducer(
  state: MatchState,
  event: MatchEvent
): MatchState {
  switch (state) {
    case 'IDLE':
      if (event === 'DATE_MODE_ENABLED') return 'DATE_MODE_ON';
      return state;

    case 'DATE_MODE_ON':
      if (event === 'NEARBY_DETECTED') return 'NEARBY_CANDIDATE_FOUND';
      if (event === 'DATE_MODE_DISABLED') return 'IDLE';
      return state;

    case 'NEARBY_CANDIDATE_FOUND':
      if (event === 'USER_ACCEPTED') return 'AWAITING_CONFIRMATION';
      if (event === 'USER_DECLINED') return 'CANCELLED';
      return state;

    case 'AWAITING_CONFIRMATION':
      if (event === 'WAITING_OTHER') return 'AWAITING_CONFIRMATION';
      if (event === 'BOTH_ACCEPTED') return 'NAVIGATING';
      if (event === 'PARTNER_DECLINED') return 'CANCELLED';
      if (event === 'USER_DECLINED') return 'CANCELLED';
      return state;

    case 'NAVIGATING':
      if (event === 'BLUETOOTH_CLOSE') return 'VERY_CLOSE';
      if (event === 'CANCEL') return 'CANCELLED';
      return state;

    case 'VERY_CLOSE':
      if (event === 'MATCH_CONFIRMED') return 'MATCHED';
      return state;

    case 'CANCELLED':
      if (event === 'DATE_MODE_ENABLED') return 'DATE_MODE_ON';
      return state;

    case 'MATCHED':
      return 'IDLE';

    default:
      return state;
  }
}
