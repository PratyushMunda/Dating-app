export type PresenceResponse =
  | { status: 'WAITING' }
  | { status: 'PAIRED'; pairId: string };

export type DecisionResponse =
  | { result: 'MATCH_CONFIRMED' }
  | { result: 'CANCELLED' }
  | { status: 'WAITING_OTHER' }
  | { status: 'EXPIRED' };

const BASE_URL = 'https://irldate-server.onrender.com';

export async function sendPresence(
  userId: string,
  lat: number,
  lng: number
): Promise<PresenceResponse> {
  const res = await fetch(`${BASE_URL}/presence`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, lat, lng }),
  });

  return res.json();
}

export async function sendDecision(
  pairId: string,
  userId: string,
  decision: 'ACCEPT' | 'DECLINE'
): Promise<DecisionResponse> {
  const res = await fetch(`${BASE_URL}/decision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pairId, userId, decision }),
  });

  return res.json();
}
