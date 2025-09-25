import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';
import { getActiveOpenMicDate } from '@/lib/openMic';

export async function GET() {
  try {
    const supabase = createServiceRoleClient();
    
    const activeDate = await getActiveOpenMicDate(supabase);
    
    // With service role, we can join directly
    const { data: comedians, error } = await supabase
      .from('sign_ups')
      .select('*, people(full_name)')
      .eq('open_mic_date_id', activeDate.id)
      .eq('signup_type', 'comedian');

    if (error) throw error;
    
    const formattedComedians = comedians?.map(c => ({
      id: c.id,
      full_name: c.people?.full_name || 'Comedian',
      check_in_status: c.check_in_status,
      lottery_order: c.lottery_order
    })) || [];

    return NextResponse.json({ comedians: formattedComedians });
  } catch (error) {
    console.error('Failed to fetch comedians:', error);
    return NextResponse.json(
      { error: 'Failed to fetch comedians' },
      { status: 500 }
    );
  }
}