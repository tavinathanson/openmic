'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { getActiveOpenMicDate } from '@/lib/openMic';

export default function EventInfo() {
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function fetchDate() {
      try {
        const data = await getActiveOpenMicDate(supabase);

        const dateObj = new Date(data.date + 'T00:00:00');
        const formattedDate = dateObj.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          timeZone: 'UTC'
        });
        setDate(formattedDate);
        
        // Parse the time from the database
        const [hours, minutes] = data.time.split(':');
        const timeObj = new Date();
        timeObj.setHours(parseInt(hours), parseInt(minutes), 0);
        const formattedTime = timeObj.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
        setTime(formattedTime);
      } catch (error) {
        console.error('Error fetching date:', error);
      }
    }

    fetchDate();
  }, [supabase]);

  if (!date || !time) return null;

  const dateObj = new Date(date);
  const month = dateObj.toLocaleString('default', { month: 'short' });
  const day = dateObj.getDate();

  const generateGoogleCalendarUrl = () => {
    const startDate = new Date(dateObj);
    const [hours, minutes] = time.split(':');
    const isPM = time.includes('PM');
    const hour = parseInt(hours) + (isPM ? 12 : 0);
    startDate.setHours(hour, parseInt(minutes), 0);
    
    const endDate = new Date(startDate);
    endDate.setMinutes(endDate.getMinutes() + 90);

    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: 'Crave Laughs Open Mic Night',
      details: 'Come perform or watch some comedy! More details at <a href="https://openmic.tavicomedy.com">openmic.tavicomedy.com</a>',
      location: 'Crave Nature\'s Eatery',
      dates: `${startDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z/${endDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
    });

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  };

  // Calculate arrival time (15 minutes before start time)
  const [hours, minutes] = time.split(':');
  const isPM = time.includes('PM');
  const hour = parseInt(hours) + (isPM ? 12 : 0);
  const arrivalTime = new Date();
  arrivalTime.setHours(hour, parseInt(minutes) - 15, 0);
  const formattedArrivalTime = arrivalTime.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  return (
    <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
      <div className="flex flex-col md:flex-row items-center gap-8">
        {/* Calendar Display */}
        <div className="flex-shrink-0 w-32 h-32 bg-primary/5 rounded-lg border border-primary/10 flex flex-col items-center justify-center">
          <div className="text-primary font-semibold text-lg">{month}</div>
          <div className="text-4xl font-bold text-foreground">{day}</div>
          <div className="text-sm text-muted">{time}</div>
        </div>

        {/* Event Details */}
        <div className="flex-grow text-center md:text-left space-y-4">
          <div>
            <h2 className="text-2xl font-heading font-semibold text-foreground mb-2">
              Next Open Mic at <a href="https://maps.app.goo.gl/pM9FxDS2vsw3QuGbA" target="_blank" className="text-primary hover:underline">Crave Nature&apos;s Eatery</a>
            </h2>
            <p className="text-lg text-muted">
              {date}
            </p>
          </div>
          
          <div className="flex flex-wrap gap-4 justify-center md:justify-start">
            <div className="flex items-center gap-2 text-sm text-primary bg-blue-50 px-3 py-1.5 rounded-full">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Arrive by {formattedArrivalTime}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-primary bg-blue-50 px-3 py-1.5 rounded-full">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Show starts at {time}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-primary bg-blue-50 px-3 py-1.5 rounded-full">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span>Perform or watch!</span>
            </div>
            <a
              href={generateGoogleCalendarUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-white bg-primary hover:bg-primary/90 px-4 py-1.5 rounded-full transition-colors"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM5 8V6h14v2H5zm2 4h10v2H7v-2zm0 4h7v2H7v-2z"/>
              </svg>
              <span>Add to Google Calendar</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
} 