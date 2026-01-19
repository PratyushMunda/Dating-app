export type PresenceResponse =
  | { status: 'WAITING' }
  | { status: 'PAIRED'; pairId: string; otherUser: { userId: string; lat: number; lon: number } };

export type DecisionResponse =
  | { status: 'MATCH_CONFIRMED' }
  | { status: 'CANCELLED' }
  | { status: 'WAITING_OTHER'; otherUserDecision?: string }
  | { status: 'BOTH_ACCEPTED' }
  | { status: 'PENDING'; myDecision?: string; otherDecision?: string }
  | { status: 'EXPIRED' };

export type LocationResponse = {
  userId: string;
  lat: number;
  lon: number;
  lastSeen: string;
};

const BASE_URL = 'https://server-irldate.onrender.com';

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
  console.log('setAuthToken called with:', token ? token.substring(0, 10) + '...' : 'null');
}

async function parseOrThrow(res: Response, fallback: string) {
  let data: any = null;
  try {
    data = await res.json();
  } catch (e) {
    // ignore JSON parse errors
  }

  if (!res.ok) {
    const message = data?.error || fallback;
    throw new Error(message);
  }

  return data;
}

export async function signup(
  username: string,
  password: string
): Promise<{ token: string; userId: string }> {
  const res = await fetch(`${BASE_URL}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  return parseOrThrow(res, 'Signup failed');
}

function withAuth(headers: Record<string, string>) {
  if (authToken) {
    console.log('withAuth: Token found, adding header:', authToken.substring(0, 10) + '...');
    return { ...headers, Authorization: `Bearer ${authToken}` };
  }
  console.warn('withAuth: NO TOKEN SET!');
  return headers;
}

export async function login(
  username: string,
  password: string
): Promise<{ token: string; userId: string }> {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  return parseOrThrow(res, 'Invalid credentials');
}

export async function sendPresence(
  userId: string,
  lat: number,
  lon: number
): Promise<PresenceResponse> {
  if (!authToken) {
    console.error('sendPresence: authToken is null!');
  }
  
  const headers = withAuth({ 'Content-Type': 'application/json' });
  console.log('sendPresence: Full headers:', JSON.stringify(headers));
  console.log('sendPresence: Auth header present?', !!headers.Authorization);
  console.log('sendPresence: Sending location', { userId, lat, lon, hasAuth: !!authToken });
  
  const res = await fetch(`${BASE_URL}/presence`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ userId, lat, lon }),
  });

  console.log('sendPresence: Response status:', res.status);
  console.log('sendPresence: Response ok:', res.ok);

  if (!res.ok) {
    const text = await res.text();
    console.error('sendPresence failed:', res.status, text);
    throw new Error(`Presence failed: ${res.status} - ${text}`);
  }
  
  return res.json();
}

export async function sendDecision(
  pairId: string,
  userId: string,
  decision: 'ACCEPT' | 'DECLINE'
): Promise<DecisionResponse> {
  const res = await fetch(`${BASE_URL}/decision`, {
    method: 'POST',
    headers: withAuth({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ pairId, userId, decision }),
  });

  return res.json();
}

export async function getPairedUserLocation(
  pairId: string,
  userId: string
): Promise<LocationResponse> {
  const res = await fetch(`${BASE_URL}/location/${pairId}/${userId}`, {
    headers: withAuth({}),
  });
  return res.json();
}

export async function clearPresence(userId: string): Promise<{ status: string }> {
  const res = await fetch(`${BASE_URL}/presence/${userId}`, {
    method: 'DELETE',
    headers: withAuth({}),
  });
  return res.json();
}

export async function checkPairStatus(pairId: string): Promise<DecisionResponse> {
  const res = await fetch(`${BASE_URL}/decision/${pairId}`, {
    headers: withAuth({}),
  });
  return res.json();
}
