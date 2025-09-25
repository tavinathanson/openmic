import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { comedianId, newOrder, password } = await request.json();
    
    if (password !== 'tavi') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceRoleClient();
    
    // Simple approach: just update the order
    // If you want to swap with someone else, do it manually in Supabase
    const { error } = await supabase
      .from('sign_ups')
      .update({ lottery_order: newOrder })
      .eq('id', comedianId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to reorder' },
      { status: 500 }
    );
  }
}