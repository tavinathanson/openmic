import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';
import { getActiveOpenMicDate } from '@/lib/openMic';

export async function GET() {
  try {
    // Use service role client to bypass RLS
    const supabase = createServiceRoleClient();
    
    let activeDate;
    try {
      activeDate = await getActiveOpenMicDate(supabase);
    } catch {
      return NextResponse.json({ 
        comedians: [],
        activeDateId: null,
        error: 'No active open mic date found'
      });
    }
    
    // With service role, we can join tables directly!
    const { data: comedians, error } = await supabase
      .from('sign_ups')
      .select('*, people(email, full_name)')
      .eq('open_mic_date_id', activeDate.id)
      .eq('signup_type', 'comedian')
      .order('created_at', { ascending: true });
      
    if (error) throw error;

    const formattedComedians = comedians?.map(c => ({
      id: c.id,
      person_id: c.person_id,
      email: c.people?.email || '',
      full_name: c.people?.full_name || 'No name',
      check_in_status: c.check_in_status,
      lottery_order: c.lottery_order,
      created_at: c.created_at
    })) || [];

    return NextResponse.json({ 
      comedians: formattedComedians,
      activeDateId: activeDate.id
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch comedians' },
      { status: 500 }
    );
  }
}