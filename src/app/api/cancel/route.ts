import { NextResponse } from 'next/server';
// import { createServerSupabaseClient } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { signRlsJwt } from '@/lib/jwt';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const type = searchParams.get('type');

  if (!id || !type) {
    return NextResponse.json(
      { error: 'Missing required parameters' },
      { status: 400 }
    );
  }

  if (type !== 'comedian' && type !== 'audience') {
    return NextResponse.json(
      { error: 'Invalid type parameter' },
      { status: 400 }
    );
  }

  try {
    // Mint a JWT containing the signup_id so RLS can authorize this delete
    const deleteToken = signRlsJwt({ id: id });
    const supabaseDelete = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${deleteToken}` } } }
    );

    // First verify the row exists
    const { error: selectError } = await supabaseDelete
      .from('sign_ups')
      .select('*')
      .eq('id', id)
      .single();
    
    if (selectError) throw selectError;
    
    // Perform the delete through the JWT-authenticated client
    const { error } = await supabaseDelete
      .from('sign_ups')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Cancellation error:', error);
    return NextResponse.json(
      { error: 'Failed to cancel signup' },
      { status: 500 }
    );
  }
} 