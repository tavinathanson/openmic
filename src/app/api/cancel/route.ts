import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/lib/supabase';
import { signRlsJwt } from '@/lib/jwt';
import { getActiveOpenMicDate, getPersonByEmail } from '@/lib/openMic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const type = searchParams.get('type');
  const email = searchParams.get('email');

  try {
    const supabase = await createServerSupabaseClient();

    // Get the active open mic date
    let activeDate;
    try {
      activeDate = await getActiveOpenMicDate(supabase);
    } catch {
      return NextResponse.json(
        { error: 'No active open mic date found' },
        { status: 400 }
      );
    }

    let signupId: string;

    if (id && type) {
      // If ID and type are provided, use them directly
      if (type !== 'comedian' && type !== 'audience') {
        return NextResponse.json(
          { error: 'Invalid type parameter' },
          { status: 400 }
        );
      }
      signupId = id;
    } else if (email) {
      // If email is provided, look up the signup
      const emailToken = signRlsJwt({ email });
      const supabaseEmail = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { global: { headers: { Authorization: `Bearer ${emailToken}` } } }
      );

      const personData = await getPersonByEmail(supabaseEmail, email);
      if (!personData) {
        return NextResponse.json(
          { error: 'No signup found for this email' },
          { status: 404 }
        );
      }

      // Get the signup for this person and date
      const signupToken = signRlsJwt({
        person_id: personData.id,
        open_mic_date_id: activeDate.id,
      });
      const supabaseSignup = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { global: { headers: { Authorization: `Bearer ${signupToken}` } } }
      );

      const { data: signupData, error: signupError } = await supabaseSignup
        .from('sign_ups')
        .select('*')
        .eq('person_id', personData.id)
        .eq('open_mic_date_id', activeDate.id)
        .single();

      if (signupError || !signupData) {
        return NextResponse.json(
          { error: 'No signup found for this email' },
          { status: 404 }
        );
      }

      signupId = signupData.id;
    } else {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Mint a JWT containing the signup_id so RLS can authorize this delete
    const deleteToken = signRlsJwt({ id: signupId });
    const supabaseDelete = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${deleteToken}` } } }
    );

    // First verify the row exists
    const { error: selectError } = await supabaseDelete
      .from('sign_ups')
      .select('*')
      .eq('id', signupId)
      .single();
    
    if (selectError) throw selectError;
    
    // Perform the delete through the JWT-authenticated client
    const { error } = await supabaseDelete
      .from('sign_ups')
      .delete()
      .eq('id', signupId);

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