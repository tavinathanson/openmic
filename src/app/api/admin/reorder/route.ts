import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { comedianId, newOrder, password } = await request.json();

    if (password !== 'tavi') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceRoleClient();

    // If newOrder is null, remove comedian from order entirely
    if (newOrder === null) {
      // First clear the lottery_order for the removed comedian
      await supabase
        .from('sign_ups')
        .update({ lottery_order: null })
        .eq('id', comedianId);

      // Get ALL remaining ordered comedians and renumber them
      const { data: remaining } = await supabase
        .from('sign_ups')
        .select('id')
        .not('lottery_order', 'is', null)
        .order('lottery_order');

      // Renumber everyone sequentially
      const updates = (remaining || []).map((c, index) =>
        supabase
          .from('sign_ups')
          .update({ lottery_order: index + 1 })
          .eq('id', c.id)
      );

      await Promise.all(updates);
      return NextResponse.json({ success: true });
    }

    // For reordering: Get ALL ordered comedians (sorted by current order)
    const { data: orderedComedians } = await supabase
      .from('sign_ups')
      .select('id, lottery_order')
      .not('lottery_order', 'is', null)
      .order('lottery_order');

    // Build array of IDs in current order
    const orderedIds = (orderedComedians || []).map(c => c.id);

    // Remove the comedian we're moving
    const filteredIds = orderedIds.filter(id => id !== comedianId);

    // Insert at new position (newOrder - 1 because array is 0-indexed)
    filteredIds.splice(newOrder - 1, 0, comedianId);

    // Update EVERYONE with their new sequential position
    const updates = filteredIds.map((id, index) =>
      supabase
        .from('sign_ups')
        .update({ lottery_order: index + 1 })
        .eq('id', id)
    );

    await Promise.all(updates);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: 'Failed to reorder' },
      { status: 500 }
    );
  }
}