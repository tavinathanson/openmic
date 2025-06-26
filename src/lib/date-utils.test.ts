import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getDateText } from './date-utils';

describe('getDateText', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return "tonight" for today in EST timezone when server is in PST', () => {
    // Mock server time as 3 PM PST (11 PM EST)
    const mockServerTime = new Date('2024-12-25T15:00:00-08:00'); // 3 PM PST
    vi.setSystemTime(mockServerTime);
    
    // Event is at 8 PM EST on the same calendar date (Dec 25)
    const eventDate = new Date('2024-12-25T20:00:00-05:00'); // 8 PM EST
    
    const result = getDateText(eventDate, 'America/New_York');
    expect(result).toBe('tonight');
  });

  it('should return "tomorrow" for tomorrow in EST timezone when server is in PST', () => {
    // Mock server time as 10 PM PST Dec 23 (1 AM EST Dec 24)
    const mockServerTime = new Date('2024-12-23T22:00:00-08:00'); // 10 PM PST Dec 23
    vi.setSystemTime(mockServerTime);
    
    // Event is at 8 PM EST on Dec 25 (tomorrow in EST timezone)
    const eventDate = new Date('2024-12-25T20:00:00-05:00'); // 8 PM EST Dec 25
    
    const result = getDateText(eventDate, 'America/New_York');
    expect(result).toBe('tomorrow');
  });

  it('should return formatted date for events more than one day away', () => {
    // Mock current time as Dec 20
    const mockCurrentTime = new Date('2024-12-20T15:00:00-05:00');
    vi.setSystemTime(mockCurrentTime);
    
    // Event is on Dec 25
    const eventDate = new Date('2024-12-25T20:00:00-05:00');
    
    const result = getDateText(eventDate, 'America/New_York');
    expect(result).toBe('on December 25');
  });

  it('should handle timezone differences correctly for PST events', () => {
    // Mock server time as 2 AM EST (11 PM PST previous day)
    const mockServerTime = new Date('2024-12-25T02:00:00-05:00'); // 2 AM EST Dec 25
    vi.setSystemTime(mockServerTime);
    
    // Event is at 8 PM PST on Dec 24 (same calendar day in PST)
    const eventDate = new Date('2024-12-24T20:00:00-08:00'); // 8 PM PST Dec 24
    
    const result = getDateText(eventDate, 'America/Los_Angeles');
    expect(result).toBe('tonight');
  });

  // This test demonstrates the current bug with date-fns isToday/isTomorrow
  it('demonstrates the timezone bug with original implementation', async () => {
    // Mock server time as 2 AM EST Dec 25
    const mockServerTime = new Date('2024-12-25T02:00:00-05:00');
    vi.setSystemTime(mockServerTime);
    
    // Event is at 8 PM PST on Dec 24 (which is "today" in PST but "yesterday" in EST)
    const eventDate = new Date('2024-12-24T20:00:00-08:00');
    
    // The old logic would incorrectly return a formatted date instead of "tonight"
    // because isToday() uses server timezone (EST) not event timezone (PST)
    const { isToday, isTomorrow, format, parseISO } = await import('date-fns');
    const parsedDate = parseISO(eventDate.toISOString());
    
    const oldLogicResult = isToday(parsedDate)
      ? 'tonight' 
      : isTomorrow(parsedDate)
      ? 'tomorrow'
      : `on ${format(parsedDate, 'MMMM d')}`;
    
    // This should be "tonight" but will likely be something else due to timezone bug
    expect(oldLogicResult).not.toBe('tonight'); // Demonstrating the bug
    
    // Our new implementation should correctly return "tonight"
    const newResult = getDateText(eventDate, 'America/Los_Angeles');
    expect(newResult).toBe('tonight');
  });
});