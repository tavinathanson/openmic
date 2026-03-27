import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isComedianSignupWindowOpen, getComedianSignupOpenDate, todayEastern } from './openMic';

describe('todayEastern', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('returns Eastern date when UTC is still previous day', () => {
    // 11 PM ET on March 26 = 3 AM UTC on March 27
    vi.setSystemTime(new Date('2026-03-27T03:00:00Z'));
    expect(todayEastern()).toBe('2026-03-26');
  });

  it('returns Eastern date after midnight ET', () => {
    // 12:01 AM ET on March 27 = 4:01 AM UTC (EDT)
    vi.setSystemTime(new Date('2026-03-27T04:01:00Z'));
    expect(todayEastern()).toBe('2026-03-27');
  });

  it('handles EST (winter)', () => {
    // midnight ET on Jan 15 = 5:00 AM UTC (EST, UTC-5)
    vi.setSystemTime(new Date('2026-01-15T05:00:00Z'));
    expect(todayEastern()).toBe('2026-01-15');
  });

  it('handles EDT (summer)', () => {
    // midnight ET on July 15 = 4:00 AM UTC (EDT, UTC-4)
    vi.setSystemTime(new Date('2026-07-15T04:00:00Z'));
    expect(todayEastern()).toBe('2026-07-15');
  });
});

describe('isComedianSignupWindowOpen', () => {
  it('opens at midnight ET on the correct day', () => {
    // Event: April 10. Window opens April 10 - 14 = March 27.
    const event = '2026-04-10';

    // 11:59 PM ET on March 26 → not open yet
    const beforeMidnight = new Date('2026-03-27T03:59:00Z'); // 11:59 PM EDT Mar 26
    expect(isComedianSignupWindowOpen(event, beforeMidnight)).toBe(false);

    // 12:00 AM ET on March 27 → open
    const atMidnight = new Date('2026-03-27T04:00:00Z'); // midnight EDT Mar 27
    expect(isComedianSignupWindowOpen(event, atMidnight)).toBe(true);
  });

  it('is open on the event day itself', () => {
    const event = '2026-04-10';
    const eventDay = new Date('2026-04-10T12:00:00Z');
    expect(isComedianSignupWindowOpen(event, eventDay)).toBe(true);
  });

  it('is open the day after the event', () => {
    // We don't close signups after the event date in this function
    const event = '2026-04-10';
    const dayAfter = new Date('2026-04-11T12:00:00Z');
    expect(isComedianSignupWindowOpen(event, dayAfter)).toBe(true);
  });

  it('handles DST spring-forward boundary', () => {
    // 2026 spring forward: March 8. Event: March 20.
    // Window opens: March 20 - 14 = March 6 (still EST).
    const event = '2026-03-20';

    // 11:59 PM EST on March 5 = 4:59 AM UTC March 6
    const before = new Date('2026-03-06T04:59:00Z');
    expect(isComedianSignupWindowOpen(event, before)).toBe(false);

    // 12:01 AM EST on March 6 = 5:01 AM UTC March 6
    const after = new Date('2026-03-06T05:01:00Z');
    expect(isComedianSignupWindowOpen(event, after)).toBe(true);
  });
});

describe('getComedianSignupOpenDate', () => {
  it('returns 14 days before the event', () => {
    const result = getComedianSignupOpenDate('2026-04-10');
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(2); // March (0-indexed)
    expect(result.getDate()).toBe(27);
  });

  it('handles month boundary', () => {
    // Event: March 5 → opens Feb 19
    const result = getComedianSignupOpenDate('2026-03-05');
    expect(result.getMonth()).toBe(1); // February
    expect(result.getDate()).toBe(19);
  });

  it('handles year boundary', () => {
    // Event: Jan 10 → opens Dec 27 of previous year
    const result = getComedianSignupOpenDate('2026-01-10');
    expect(result.getFullYear()).toBe(2025);
    expect(result.getMonth()).toBe(11); // December
    expect(result.getDate()).toBe(27);
  });
});
