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

    // Find the comedian being moved and their current position
    const comedian = orderedComedians?.find(c => c.id === comedianId);
    const currentOrder = comedian?.lottery_order;

    // Remove the comedian from the array if they exist
    const others = orderedComedians?.filter(c => c.id !== comedianId) || [];

    // Insert at new position (newOrder - 1 because array is 0-indexed)
    others.splice(newOrder - 1, 0, { id: comedianId, lottery_order: newOrder });

    // Renumber everyone sequentially
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