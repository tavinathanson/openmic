import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { activeDateId, comedianIds, password } = await request.json();

    if (password !== 'tavi') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!Array.isArray(comedianIds) || comedianIds.length === 0) {
      return NextResponse.json({ error: 'No comedians to publish' }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    // Append this batch after any already-published picks
    const { data: maxOrderData } = await supabase
      .from('sign_ups')
      .select('lottery_order')
      .eq('open_mic_date_id', activeDateId)
      .not('lottery_order', 'is', null)
      .order('lottery_order', { ascending: false })
      .limit(1);

    const nextOrder = maxOrderData && maxOrderData[0] ? maxOrderData[0].lottery_order + 1 : 1;

    // Write the admin-chosen order exactly as given
    const updates = comedianIds.map((id: string, index: number) =>
      supabase
        .from('sign_ups')
        .update({ lottery_order: nextOrder + index })
        .eq('id', id)
    );

    await Promise.all(updates);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: 'Failed to publish lottery' },
      { status: 500 }
    );
  }
}
