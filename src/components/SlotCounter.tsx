'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function SlotCounter() {
  const [remainingSlots, setRemainingSlots] = useState<number>(0);
  const [currentDate, setCurrentDate] = useState<string | null>(null);
  const maxSlots = parseInt(process.env.NEXT_PUBLIC_MAX_COMEDIAN_SLOTS || '20');

  useEffect(() => {
    // Initial fetch
    fetchSlots();

    // Subscribe to changes
    const subscription = supabase
      .channel('sign_ups')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sign_ups' }, () => {
        fetchSlots();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function fetchSlots() {
    // Get the active open mic date
    const { data: dateData, error: dateError } = await supabase
      .from('open_mic_dates')
      .select('*')
      .eq('is_active', true)
      .order('date', { ascending: true })
      .limit(1)
      .single();

    if (dateError || !dateData) {
      setRemainingSlots(0);
      setCurrentDate(null);
      return;
    }

    // Format the date with UTC timezone
    const dateObj = new Date(dateData.date + 'T00:00:00');
    const formattedDate = dateObj.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC' // Use UTC to prevent timezone shifts
    });
    setCurrentDate(formattedDate);

    // Get the count of signups for this date
    const { count } = await supabase
      .from('sign_ups')
      .select('*', { count: 'exact', head: true })
      .eq('open_mic_date_id', dateData.id);
    
    setRemainingSlots(maxSlots - (count || 0));
  }

  if (!currentDate) return null;

  return (
    <div className="text-center mb-6">
      <h2 className="text-2xl font-semibold text-gray-800">
        Remaining Comedian Slots
      </h2>
      <p className="text-xl text-gray-600 mt-2">
        {remainingSlots} of {maxSlots} slots available
      </p>
    </div>
  );
} 