import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase';
import { signRlsJwt } from '@/lib/jwt';
import { getActiveOpenMicDate, getPersonByEmail } from '@/lib/openMic';
import { sendCancellationNotification, sendEmailErrorNotification } from '@/lib/resend';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const email = searchParams.get('email');
  const note = searchParams.get('note');

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
    let personEmail: string | undefined;
    let personName: string | null | undefined;
    let signupType: 'comedian' | 'audience' | undefined;

    if (id) {
      // If ID is provided, use it directly
      signupId = id;

      // Get person data and signup type from database for notification
      // Use service role client to bypass RLS for admin notification purposes
      const serviceClient = createServiceRoleClient();
      const { data: signupData, error: signupFetchError } = await serviceClient
        .from('sign_ups')
        .select('person_id, signup_type')
        .eq('id', id)
        .single();

      if (signupFetchError) {
        console.error('Failed to fetch signup data for notification:', signupFetchError);
      }

      if (signupData) {
        signupType = signupData.signup_type;

        const { data: personData, error: personFetchError } = await serviceClient
          .from('people')
          .select('email, full_name')
          .eq('id', signupData.person_id)
          .single();

        if (personFetchError) {
          console.error('Failed to fetch person data for notification:', personFetchError);
        }

        if (personData) {
          personEmail = personData.email;
          personName = personData.full_name;
        }
      }
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

      personEmail = personData.email;
      personName = personData.full_name;

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
      signupType = signupData.signup_type;
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

    // Send cancellation notification to Tavi
    if (personEmail && signupType) {
      try {
        await sendCancellationNotification(
          personEmail,
          personName || 'Unknown',
          signupType,
          note || undefined
        );
      } catch (emailError) {
        console.error('Failed to send cancellation notification:', emailError);
        // Notify Tavi about the email failure
        await sendEmailErrorNotification(
          personEmail,
          'cancellation',
          emailError,
          {
            fullName: personName || 'Unknown',
            type: signupType,
            date: activeDate.date
          }
        );
        // Don't throw - we still want to return success since the cancellation worked
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Cancellation error:', error);
    return NextResponse.json(
      { error: 'Failed to cancel signup' },
      { status: 500 }
    );
  }
} 