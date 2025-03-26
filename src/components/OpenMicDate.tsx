'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

export default function OpenMicDate() {
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
        // Create a date object and adjust for timezone
        const dateObj = new Date(data.date + 'T00:00:00');
        const formattedDate = dateObj.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          timeZone: 'UTC' // Use UTC to prevent timezone shifts
        });
        setDate(formattedDate);
      }
    }

    fetchDate();
  }, []);

  if (!date) return null;

  return (
    <div className="text-center space-y-4">
      <h2 className="text-2xl font-heading font-semibold text-foreground">
        Next Open Mic: 
      </h2>
      <p className="text-xl text-muted font-medium">{date} at 7:30pm</p>
      <div className="flex items-center justify-center space-x-2 text-sm text-muted-light">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>Please arrive by 7:15pm</span>
      </div>
    </div>
  );
} 