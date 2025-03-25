'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function SlotCounter() {
  const [remainingSlots, setRemainingSlots] = useState<number>(0);
  const maxSlots = parseInt(process.env.NEXT_PUBLIC_MAX_COMEDIAN_SLOTS || '20');

  useEffect(() => {
    // Initial fetch
    fetchSlots();

    // Subscribe to changes
    const subscription = supabase
      .channel('comedians')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comedians' }, () => {
        fetchSlots();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function fetchSlots() {
    const { count } = await supabase
      .from('comedians')
      .select('*', { count: 'exact', head: true });
    
    setRemainingSlots(maxSlots - (count || 0));
  }

  return (
    <div className="text-center p-4 bg-gray-100 rounded-lg">
      <h2 className="text-2xl font-bold text-gray-800">
        {remainingSlots} Comedian Slots Left
      </h2>
      <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
        <div
          className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
          style={{ width: `${(remainingSlots / maxSlots) * 100}%` }}
        ></div>
      </div>
    </div>
  );
} 