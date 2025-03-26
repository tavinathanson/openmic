'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

export default function EventInfo() {
  const [date, setDate] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function fetchDate() {
      const { data, error } = await supabase
        .from('open_mic_dates')
        .select('date')
        .eq('is_active', true)
        .order('date', { ascending: true })
        .limit(1)
        .single();

      if (error) {
        console.error('Error fetching date:', error);
        return;
      }

      if (data) {
        const dateObj = new Date(data.date + 'T00:00:00');
        const formattedDate = dateObj.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          timeZone: 'UTC'
        });
        setDate(formattedDate);
      }
    }

    fetchDate();
  }, []);

  if (!date) return null;

  const dateObj = new Date(date);
  const month = dateObj.toLocaleString('default', { month: 'short' });
  const day = dateObj.getDate();

  return (
    <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
      <div className="flex flex-col md:flex-row items-center gap-8">
        {/* Calendar Display */}
        <div className="flex-shrink-0 w-32 h-32 bg-primary/5 rounded-lg border border-primary/10 flex flex-col items-center justify-center">
          <div className="text-primary font-semibold text-lg">{month}</div>
          <div className="text-4xl font-bold text-foreground">{day}</div>
          <div className="text-sm text-muted">7:30 PM</div>
        </div>

        {/* Event Details */}
        <div className="flex-grow text-center md:text-left space-y-4">
          <div>
            <h2 className="text-2xl font-heading font-semibold text-foreground mb-2">
              Next Open Mic Night
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
              <span>Arrive by 7:15 PM</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-primary bg-blue-50 px-3 py-1.5 rounded-full">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span>Sign up to perform or watch!</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 