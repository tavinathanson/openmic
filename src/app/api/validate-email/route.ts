import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/lib/supabase';
import { getActiveOpenMicDate, getPersonByEmail } from '@/lib/openMic';
import { signRlsJwt } from '@/lib/jwt';

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { email, type } = await request.json();

    if (!email || !type) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (type !== 'comedian' && type !== 'audience') {
      return NextResponse.json(
        { error: 'Invalid type' },
        { status: 400 }
      );
    }


    // Ensure person exists, creating if necessary using JWT-protected select
    const emailToken = signRlsJwt({ email });
    const supabaseEmail = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${emailToken}` } } }
    );

    // Get the active open mic date (throws if none)
    let activeDate;
    try {
      activeDate = await getActiveOpenMicDate(supabase);
    } catch {
      return NextResponse.json(
        { error: 'No active open mic date found' },
        { status: 400 }
      );
    }

    // First, check if the email exists in the people table
    const personData = await getPersonByEmail(supabaseEmail, email);

    // If person exists, check if they're already signed up for this date
    if (personData) {
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

      if (signupError && signupError.code !== 'PGRST116') {
        throw signupError;
      }

      return NextResponse.json({
        exists: true,
        full_name: personData.full_name,
        number_of_people: signupData?.number_of_people || 1,
        already_signed_up: !!signupData,
        is_waitlist: signupData?.is_waitlist || false
      });
    }

    // If email doesn't exist at all
    return NextResponse.json({
      exists: false,
      full_name: null,
      number_of_people: null,
      already_signed_up: false
    });
  } catch (error) {
    console.error('Email validation error:', error);
    return NextResponse.json(
      { error: 'Failed to validate email' },
      { status: 500 }
    );
  }
} 