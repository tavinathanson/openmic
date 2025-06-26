import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getDateText } from './date-utils';
import { parseISO } from 'date-fns';

describe('getDateText', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "tomorrow" for next day events', () => {
    // Mock current time as June 25, 9:48 PM EDT
    const mockCurrentTime = new Date('2025-06-25T21:48:00-04:00');
    vi.setSystemTime(mockCurrentTime);
    
    // Event is June 26, 7:30 PM EDT (tomorrow)
    const eventDate = new Date('2025-06-26T19:30:00-04:00');
    
    const result = getDateText(eventDate, 'America/New_York');
    expect(result).toBe('tomorrow');
  });

  it('returns "tonight" for same day events', () => {
    // Mock server time as 12:30 AM EDT on June 26
    const mockServerTime = new Date('2025-06-26T04:30:00Z'); // 4:30 AM UTC = 12:30 AM EDT
    vi.setSystemTime(mockServerTime);
    
    const eventDate = parseISO("2025-06-26"); // June 26 event
    const result = getDateText(eventDate, 'America/New_York');
    
    // Since it's 12:30 AM EDT on June 26, and event is June 26, it should be "tonight"
    expect(result).toBe('tonight');
  });

  it('returns formatted date for events more than one day away', () => {
    // Mock current time as June 20
    const mockCurrentTime = new Date('2025-06-20T15:00:00-04:00');
    vi.setSystemTime(mockCurrentTime);
    
    // Event is on June 26
    const eventDate = parseISO('2025-06-26');
    
    const result = getDateText(eventDate, 'America/New_York');
    expect(result).toBe('on June 26');
  });

  it('fixes parseISO midnight UTC bug for EDT events', () => {
    // Simulate the exact production scenario that was failing
    const mockServerTime = new Date('2025-06-26T02:00:00Z'); // UTC server at 2 AM
    vi.setSystemTime(mockServerTime);
    
    // This is what comes from the database: parseISO("2025-06-26")
    const eventDate = parseISO("2025-06-26"); // Creates midnight UTC
    
    // Before fix: This would return "tonight" because midnight UTC = 8 PM EDT previous day
    // After fix: Should return "tomorrow" because June 26 in EDT is tomorrow from June 25 night
    const result = getDateText(eventDate, 'America/New_York');
    expect(result).toBe('tomorrow');
  });
});