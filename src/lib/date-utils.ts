import { parseISO, format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

export function getDateText(date: Date, timezone: string = 'America/New_York'): string {
  console.log('getDateText called with:', {
    date: date.toISOString(),
    timezone,
    serverTime: new Date().toISOString()
  });
  
  const eventDate = parseISO(date.toISOString());
  
  // Convert to the event's timezone for comparison
  const eventDateInTimezone = toZonedTime(eventDate, timezone);
  const nowInTimezone = toZonedTime(new Date(), timezone);
  
  // Check if the event is today or tomorrow in the event's timezone
  const eventDateOnly = new Date(eventDateInTimezone.getFullYear(), eventDateInTimezone.getMonth(), eventDateInTimezone.getDate());
  const nowDateOnly = new Date(nowInTimezone.getFullYear(), nowInTimezone.getMonth(), nowInTimezone.getDate());
  
  const isEventToday = eventDateOnly.getTime() === nowDateOnly.getTime();
  const isEventTomorrow = eventDateOnly.getTime() === nowDateOnly.getTime() + (24 * 60 * 60 * 1000);
  
  console.log('Date comparison:', {
    eventDateInTimezone: eventDateInTimezone.toISOString(),
    nowInTimezone: nowInTimezone.toISOString(),
    eventDateOnly: eventDateOnly.toISOString(),
    nowDateOnly: nowDateOnly.toISOString(),
    isEventToday,
    isEventTomorrow
  });
  
  if (isEventToday) {
    console.log('Returning: tonight');
    return 'tonight';
  } else if (isEventTomorrow) {
    console.log('Returning: tomorrow');
    return 'tomorrow';
  } else {
    console.log('Returning: on date');
    return `on ${format(eventDateInTimezone, 'MMMM d')}`;
  }
}