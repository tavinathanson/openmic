import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

export function getDateText(date: Date, timezone: string = 'America/New_York'): string {
  console.log('getDateText called with:', {
    date: date.toISOString(),
    timezone,
    serverTime: new Date().toISOString()
  });
  
  // Get just the date part (YYYY-MM-DD) from the input
  const dateString = date.toISOString().split('T')[0];
  
  // Convert current time to the event's timezone
  const nowInTimezone = toZonedTime(new Date(), timezone);
  
  // Create a date representing the event date in the event's timezone
  // We want June 26 in EDT, not June 26 in UTC
  const [year, month, day] = dateString.split('-').map(Number);
  const eventDateInEventTimezone = new Date(year, month - 1, day); // Local date construction
  
  // Also get the current date in the event's timezone
  const nowDateInEventTimezone = new Date(
    nowInTimezone.getFullYear(), 
    nowInTimezone.getMonth(), 
    nowInTimezone.getDate()
  );
  
  const isEventToday = eventDateInEventTimezone.getTime() === nowDateInEventTimezone.getTime();
  const isEventTomorrow = eventDateInEventTimezone.getTime() === nowDateInEventTimezone.getTime() + (24 * 60 * 60 * 1000);
  
  console.log('Date comparison:', {
    dateString,
    nowInTimezone: nowInTimezone.toISOString(),
    eventDateInEventTimezone: eventDateInEventTimezone.toISOString(),
    nowDateInEventTimezone: nowDateInEventTimezone.toISOString(),
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
    return `on ${format(eventDateInEventTimezone, 'MMMM d')}`;
  }
}