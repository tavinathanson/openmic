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
    const { data: allComedians, error } = await supabase
      .from('sign_ups')
      .select('*')
      .eq('open_mic_date_id', activeDateId)
      .eq('signup_type', 'comedian')
      .is('lottery_order', null)
      .not('check_in_status', 'is', null)  // Must be checked in
      .neq('check_in_status', 'not_coming')
      .order('created_at', { ascending: true });

    if (error) throw error;

    if (!allComedians || allComedians.length === 0) {
      return NextResponse.json({ selectedIds: [] });
    }

    // Split into on-time/early (lottery eligible) and late (ordered by lateness)
    const lotteryEligible = allComedians.filter(c => c.check_in_status !== 'late');
    const lateComedians = allComedians
      .filter(c => c.check_in_status === 'late')
      .sort((a, b) => new Date(a.checked_in_at).getTime() - new Date(b.checked_in_at).getTime());

    // Determine the early birds: the first 5 comedians to sign up overall, based on
    // original signup order. Computed against the full signup list (not just the
    // not-yet-drawn pool) so the bonus stays stable across multiple lottery draws.
    const { data: earlyBirdData } = await supabase
      .from('sign_ups')
      .select('id')
      .eq('open_mic_date_id', activeDateId)
      .eq('signup_type', 'comedian')
      .order('created_at', { ascending: true })
      .limit(5);

    const earlyBirdIds = new Set((earlyBirdData || []).map(c => c.id));

    // Get the highest existing lottery order
    const { data: maxOrderData } = await supabase
      .from('sign_ups')
      .select('lottery_order')
      .eq('open_mic_date_id', activeDateId)
      .not('lottery_order', 'is', null)
      .order('lottery_order', { ascending: false })
      .limit(1);

    const nextOrder = maxOrderData && maxOrderData[0] ? maxOrderData[0].lottery_order + 1 : 1;

    // Calculate tickets for each lottery-eligible comedian (1, 3, or 5 tickets)
    const comediansWithTickets = lotteryEligible.map(c => {
      let tickets = 1; // Base ticket for being checked in

      // Early bird bonus (first 5 sign-ups based on original signup order)
      if (earlyBirdIds.has(c.id)) tickets += 2;

      // Early check-in bonus
      if (c.check_in_status === 'early') tickets += 2;

      return { ...c, tickets };
    });

    // Create lottery pool for on-time/early people only
    const lotteryPool: string[] = [];
    comediansWithTickets.forEach(c => {
      for (let i = 0; i < c.tickets; i++) {
        lotteryPool.push(c.id);
      }
    });

    // Select up to 4 comedians total
    const lotteryWinners: string[] = [];
    const selectedIds = new Set<string>();
    const numToSelect = Math.min(4, allComedians.length);

    // Draw from the weighted lottery pool (on-time/early people)
    while (lotteryWinners.length < numToSelect && lotteryPool.length > 0) {
      const randomIndex = Math.floor(Math.random() * lotteryPool.length);
      const selectedId = lotteryPool[randomIndex];

      if (!selectedIds.has(selectedId)) {
        lotteryWinners.push(selectedId);
        selectedIds.add(selectedId);
        // Remove all instances of this ID from the pool
        for (let i = lotteryPool.length - 1; i >= 0; i--) {
          if (lotteryPool[i] === selectedId) {
            lotteryPool.splice(i, 1);
          }
        }
      }
    }

    // The draw decides WHO wins; signup order decides their position in the list, so
    // earlier signups rank higher rather than appearing in random draw order.
    lotteryWinners.sort((a, b) => {
      const ca = lotteryEligible.find(c => c.id === a)!;
      const cb = lotteryEligible.find(c => c.id === b)!;
      return new Date(ca.created_at).getTime() - new Date(cb.created_at).getTime();
    });

    const selected: string[] = [...lotteryWinners];

    // Then, fill remaining slots with late people (in order of lateness)
    for (const lateComedian of lateComedians) {
      if (selected.length >= numToSelect) break;
      selected.push(lateComedian.id);
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