import { fromZonedTime } from 'date-fns-tz';

// Signup window opens this many days before the event (for comedians only)
export const COMEDIAN_SIGNUP_WINDOW_DAYS = 14;

const EASTERN_TZ = 'America/New_York';

/** Get today's date in Eastern time as YYYY-MM-DD */
export function todayEastern(now: Date = new Date()): string {
  return now.toLocaleDateString('en-CA', { timeZone: EASTERN_TZ });
}

/** Subtract calendar days from a YYYY-MM-DD string, returns YYYY-MM-DD */
function subtractDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d - days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/**
 * Check if the comedian signup window is open for a given event date.
 * Compares calendar dates in Eastern time — flips at midnight ET.
 */
export function isComedianSignupWindowOpen(eventDateStr: string, now: Date = new Date()): boolean {
  const today = todayEastern(now);
  const opensOn = subtractDays(eventDateStr, COMEDIAN_SIGNUP_WINDOW_DAYS);
  return today >= opensOn;
}

/**
 * Get the date when comedian signups open for a given event date.
 */
export function getComedianSignupOpenDate(eventDateStr: string): Date {
  const opensOn = subtractDays(eventDateStr, COMEDIAN_SIGNUP_WINDOW_DAYS);
  const [y, m, d] = opensOn.split('-').map(Number);
  return new Date(y, m - 1, d);
}


// The public /list lineup stays hidden until this many minutes before showtime.
export const CHECK_IN_OPENS_MINUTES_BEFORE = 15;

/** When check-in opens for an event, given its YYYY-MM-DD date, HH:MM:SS start time and IANA timezone. */
export function getCheckInOpensAt(eventDateStr: string, time: string, timezone: string = EASTERN_TZ): Date {
  const start = fromZonedTime(`${eventDateStr}T${time}`, timezone);
  return new Date(start.getTime() - CHECK_IN_OPENS_MINUTES_BEFORE * 60_000);
}
