import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { activeDateId, password } = await request.json();
    
    if (password !== 'tavi') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceRoleClient();
    
    // Get all comedians who haven't been selected yet and are checked in
    const { data: comedians, error } = await supabase
      .from('sign_ups')
      .select('*')
      .eq('open_mic_date_id', activeDateId)
      .eq('signup_type', 'comedian')
      .is('lottery_order', null)
      .not('check_in_status', 'is', null)  // Must be checked in
      .neq('check_in_status', 'not_coming')
      .order('created_at', { ascending: true });

    if (error) throw error;
    
    if (!comedians || comedians.length === 0) {
      return NextResponse.json({ selectedIds: [] });
    }

    // Get the highest existing lottery order
    const { data: maxOrderData } = await supabase
      .from('sign_ups')
      .select('lottery_order')
      .eq('open_mic_date_id', activeDateId)
      .not('lottery_order', 'is', null)
      .order('lottery_order', { ascending: false })
      .limit(1);

    const nextOrder = maxOrderData && maxOrderData[0] ? maxOrderData[0].lottery_order + 1 : 1;

    // Calculate tickets for each comedian
    const comediansWithTickets = comedians.map(c => {
      let tickets = 1; // Base ticket for being checked in
      
      // Early bird bonus (first 5 sign-ups)
      const earlyBirdIndex = comedians.findIndex(com => com.id === c.id);
      if (earlyBirdIndex < 5) tickets++;
      
      // Early check-in bonus
      if (c.check_in_status === 'early') tickets++;
      
      return { ...c, tickets };
    });

    // Create lottery pool
    const lotteryPool: string[] = [];
    comediansWithTickets.forEach(c => {
      for (let i = 0; i < c.tickets; i++) {
        lotteryPool.push(c.id);
      }
    });

    // Randomly select up to 4 comedians
    const selected: string[] = [];
    const selectedIds = new Set<string>();
    const numToSelect = Math.min(4, comedians.length);
    
    while (selected.length < numToSelect && lotteryPool.length > 0) {
      const randomIndex = Math.floor(Math.random() * lotteryPool.length);
      const selectedId = lotteryPool[randomIndex];
      
      if (!selectedIds.has(selectedId)) {
        selected.push(selectedId);
        selectedIds.add(selectedId);
        // Remove all instances of this ID from the pool
        for (let i = lotteryPool.length - 1; i >= 0; i--) {
          if (lotteryPool[i] === selectedId) {
            lotteryPool.splice(i, 1);
          }
        }
      }
    }

    // Update lottery orders
    const updates = selected.map((id, index) => 
      supabase
        .from('sign_ups')
        .update({ lottery_order: nextOrder + index })
        .eq('id', id)
    );

    await Promise.all(updates);

    return NextResponse.json({ selectedIds: selected });
  } catch {
    return NextResponse.json(
      { error: 'Failed to run lottery' },
      { status: 500 }
    );
  }
}