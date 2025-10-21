import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { comedianId, newOrder, password } = await request.json();

    if (password !== 'tavi') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceRoleClient();

    // Get all ordered comedians
    const { data: orderedComedians, error: fetchError } = await supabase
      .from('sign_ups')
      .select('id, lottery_order')
      .not('lottery_order', 'is', null)
      .order('lottery_order');

    if (fetchError) throw fetchError;

    // If newOrder is null, remove comedian from order entirely
    if (newOrder === null) {
      // First clear the lottery_order for the removed comedian
      await supabase
        .from('sign_ups')
        .update({ lottery_order: null })
        .eq('id', comedianId);

      // Remove the comedian from the array
      const others = orderedComedians?.filter(c => c.id !== comedianId) || [];

      // Then renumber the remaining comedians sequentially
      const updates = others.map((c, index) =>
        supabase
          .from('sign_ups')
          .update({ lottery_order: index + 1 })
          .eq('id', c.id)
      );

      await Promise.all(updates);
      return NextResponse.json({ success: true });
    }

    // Remove the comedian from the current order if they exist
    const others = orderedComedians?.filter(c => c.id !== comedianId) || [];

    // Insert at new position (newOrder - 1 because array is 0-indexed)
    others.splice(newOrder - 1, 0, { id: comedianId, lottery_order: newOrder });

    // Renumber EVERYONE sequentially starting from 1
    const updates = others.map((c, index) =>
      supabase
        .from('sign_ups')
        .update({ lottery_order: index + 1 })
        .eq('id', c.id)
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