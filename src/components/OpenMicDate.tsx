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
    <div className="text-center mb-6">
      <h2 className="text-2xl font-semibold text-gray-800">
        Next Open Mic Night
      </h2>
      <p className="text-xl text-gray-600 mt-2">{date}</p>
    </div>
  );
} 