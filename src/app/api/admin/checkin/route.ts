import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { signUpId, status, password } = await request.json();
    
    if (password !== 'tavi') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceRoleClient();
    
    // First check if this comedian has already been selected in lottery
    const { data: signUp } = await supabase
      .from('sign_ups')
      .select('lottery_order')
      .eq('id', signUpId)
      .single();
      
    if (signUp?.lottery_order !== null) {
      return NextResponse.json(
        { error: 'Cannot modify comedian who has been selected in lottery' },
        { status: 400 }
      );
    }
    
    // For unchecking, set status to null
    const updateData = status === 'uncheck' 
      ? { check_in_status: null, checked_in_at: null }
      : { check_in_status: status, checked_in_at: new Date().toISOString() };
    
    const { error } = await supabase
      .from('sign_ups')
      .update(updateData)
      .eq('id', signUpId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Check-in error:', error);
    return NextResponse.json(
      { error: 'Failed to check in' },
      { status: 500 }
    );
  }
}