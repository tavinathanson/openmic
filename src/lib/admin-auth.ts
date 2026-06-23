import { createHmac, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';

export const ADMIN_COOKIE_NAME = 'admin_session';
export const ADMIN_COOKIE_MAX_AGE = 60 * 60 * 12; // 12 hours, in seconds

function sessionSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error('ADMIN_SESSION_SECRET is not set');
  return secret;
}

function sign(value: string): string {
  return createHmac('sha256', sessionSecret()).update(value).digest('hex');
}

function constantTimeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/** Mint a signed session token of the form `<expiryMs>.<hmac>`. */
export function createSessionToken(now: number = Date.now()): string {
  const payload = String(now + ADMIN_COOKIE_MAX_AGE * 1000);
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string | undefined): boolean {
  if (!token) return false;
  const idx = token.lastIndexOf('.');
  if (idx < 0) return false;
  const payload = token.slice(0, idx);
  const signature = token.slice(idx + 1);
  if (!constantTimeEqual(sign(payload), signature)) return false;
  const expiry = Number(payload);
  return Number.isFinite(expiry) && expiry > Date.now();
}

/** True when the request carries a valid admin session cookie. */
export async function requireAdmin(): Promise<boolean> {
  const store = await cookies();
  return verifySessionToken(store.get(ADMIN_COOKIE_NAME)?.value);
}

/** Constant-time check of a submitted password against ADMIN_PASSWORD. */
export function verifyPassword(password: unknown): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || typeof password !== 'string') return false;
  return constantTimeEqual(password, expected);
}
