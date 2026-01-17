export type PresenceResponse =
  | { status: 'WAITING' }
  | { status: 'PAIRED'; pairId: string; otherUser: { userId: string; lat: number; lon: number } };

export type DecisionResponse =
  | { result: 'MATCH_CONFIRMED' }
  | { result: 'CANCELLED' }
  | { status: 'WAITING_OTHER' }
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
  if (authToken) return { ...headers, Authorization: `Bearer ${authToken}` };
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
  const res = await fetch(`${BASE_URL}/presence`, {
    method: 'POST',
    headers: withAuth({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ userId, lat, lon }),
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
