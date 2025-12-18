'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { getActiveOpenMicDate } from '@/lib/openMic';

// Create a ref to share the isFull state
export const slotsFullRef = { current: false };

// Create a ref to allow external triggering of slot decrement
export const decrementSlotRef = { current: () => {} };

export default function SlotCounter() {
  const [remainingSlots, setRemainingSlots] = useState<number>(0);
  const [currentDate, setCurrentDate] = useState<string | null>(null);
  const [isFull, setIsFull] = useState(false);
  const maxSlots = parseInt(process.env.NEXT_PUBLIC_MAX_COMEDIAN_SLOTS || '20');
  const supabase = createClient();

  useEffect(() => {
    async function fetchSlots() {
      let dateData;
      try {
        dateData = await getActiveOpenMicDate(supabase);
      } catch {
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

      // Get the count of comedian signups for this date from the view
      const { data: comedianCount, error: countError } = await supabase
        .rpc('get_comedian_signup_count', { p_date_id: dateData.id });

      if (countError) {
        console.error('Error fetching comedian count:', countError);
        setRemainingSlots(maxSlots); // Assume max slots if count fails
        return;
      }

      const currentCount = comedianCount ?? 0;
      
      setRemainingSlots(maxSlots - currentCount);
      const newIsFull = currentCount >= maxSlots;
      setIsFull(newIsFull);
      slotsFullRef.current = newIsFull;
    }

    // Initial fetch
    fetchSlots();

    // Expose decrement function for immediate UI feedback after signup
    decrementSlotRef.current = () => {
      setRemainingSlots(prev => {
        const newValue = Math.max(0, prev - 1);
        if (newValue === 0) {
          setIsFull(true);
          slotsFullRef.current = true;
        }
        return newValue;
      });
    };

    // Subscribe to changes on the view or underlying table
    const subscription = supabase
      .channel('comedian_signup_count_changes') // Use a unique channel name
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sign_ups' }, () => {
        // Re-fetch when sign_ups changes, as the view depends on it
        fetchSlots();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, maxSlots]);

  if (!currentDate) return null;

  return (
    <div className="text-center space-y-6">
      <div className="space-y-2">
        <h2 className="text-3xl font-heading font-bold text-foreground">
          {isFull ? `All ${maxSlots} Comedian Slots Full` : `${remainingSlots} Comedian Slots Left`}
        </h2>
        <p className="text-sm text-muted">
          {isFull ? `Add your name to the waitlist! People cancel all the time.` : `${remainingSlots} of ${maxSlots} slots available`}
        </p>
      </div>
      <div className="w-full bg-muted-light/5 rounded-full h-2 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${
            isFull ? 'bg-red-500' : 'bg-primary'
          }`}
          style={{ width: `${(remainingSlots / maxSlots) * 100}%` }}
        ></div>
      </div>
    </div>
  );
} 