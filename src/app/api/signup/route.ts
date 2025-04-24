import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { signRlsJwt } from '@/lib/jwt';
import { sendConfirmationEmail, sendWaitlistEmail } from '@/lib/resend';
import { parseISO } from 'date-fns';
import { getActiveOpenMicDate } from '@/lib/openMic';

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { email, type, full_name, number_of_people, first_mic_ever } = await request.json();

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

    // Get active date (or return 400)
    let activeDate;
    try {
      activeDate = await getActiveOpenMicDate(supabase);
    } catch {
      return NextResponse.json(
        { error: 'No active open mic date found' },
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
    const { data: existingPerson, error: personError } = await supabaseEmail
      .from('people')
      .select('id')
      .eq('email', email)
      .single();
    if (personError && personError.code !== 'PGRST116') {
      throw personError;
    }
    let personId: string;
    if (!existingPerson) {
      // Still need to use supabaseEmail to create the person, which is still relevant because we mint JWT tokens based on 
      // the email even if one doesn't exist yet in the database. And our policy is to use JWT tokens.
      const { data: newPerson, error: createError } = await supabaseEmail
        .from('people')
        .insert([{ email, full_name: full_name || null }])
        .select()
        .single();
      if (createError) throw createError;
      personId = newPerson.id;
    } else {
      personId = existingPerson.id;
    }

    // Check if person is already signed up for this date using JWT-protected select
    const signupToken = signRlsJwt({
      person_id: personId,
      open_mic_date_id: activeDate.id,
    });
    const supabaseSignup = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${signupToken}` } } }
    );
    const { data: existingSignup, error: signupError } = await supabaseSignup
      .from('sign_ups')
      .select('*')
      .eq('person_id', personId)
      .eq('open_mic_date_id', activeDate.id)
      .single();
    if (signupError && signupError.code !== 'PGRST116') {
      throw signupError;
    }
    if (existingSignup) {
      return NextResponse.json(
        { error: 'You are already signed up for this date' },
        { status: 400 }
      );
    }

    // Check if comedian slots are full for this date
    if (type === 'comedian') {
      const { data: comedianCount, error: countError } = await supabaseSignup
        .rpc('get_comedian_signup_count', { p_date_id: activeDate.id });
      if (countError) throw countError;
      const maxSlots = parseInt(
        process.env.NEXT_PUBLIC_MAX_COMEDIAN_SLOTS || '20'
      );
      if ((comedianCount ?? 0) >= maxSlots) {
        // Create waitlist signup instead
        const { data: signupData, error: createSignupError } = await supabaseSignup
          .from('sign_ups')
          .insert([{
            person_id: personId,
            open_mic_date_id: activeDate.id,
            number_of_people: number_of_people || 1,
            first_mic_ever: first_mic_ever || false,
            signup_type: type,
            is_waitlist: true
          }])
          .select()
          .single();

        if (createSignupError) throw createSignupError;

        // Send waitlist confirmation email
        try {
          const { data: openMicDate, error: dateError } = await supabase
            .from('open_mic_dates')
            .select('date, time, timezone')
            .eq('id', activeDate.id)
            .single();
          
          if (dateError || !openMicDate) {
            throw new Error('Failed to get open mic date');
          }

          const eventDate = parseISO(openMicDate.date);
          if (isNaN(eventDate.getTime())) {
            throw new Error('Invalid date format from database');
          }

          const [hours, minutes] = openMicDate.time.split(':');
          const timeObj = new Date();
          timeObj.setHours(parseInt(hours), parseInt(minutes), 0);
          
          await sendWaitlistEmail(
            email, 
            signupData.id,
            eventDate,
            openMicDate.time,
            openMicDate.timezone
          );
        } catch (emailError) {
          console.error('Failed to send waitlist email:', emailError);
        }

        return NextResponse.json({ 
          success: true,
          is_waitlist: true,
          message: 'You have been added to the waitlist!'
        });
      }
    }

    // Create the signup
    const { data: signupData, error: createSignupError } = await supabaseSignup
      .from('sign_ups')
      .insert([{
        person_id: personId,
        open_mic_date_id: activeDate.id,
        number_of_people: number_of_people || 1,
        first_mic_ever: first_mic_ever || false,
        signup_type: type
      }])
      .select()
      .single();

    if (createSignupError) throw createSignupError;

    // Send confirmation email
    try {
      const { data: openMicDate, error: dateError } = await supabase
        .from('open_mic_dates')
        .select('date, time, timezone')
        .eq('id', activeDate.id)
        .single();
      
      if (dateError || !openMicDate) {
        throw new Error('Failed to get open mic date');
      }

      // Parse the date from the database
      const eventDate = parseISO(openMicDate.date);
      if (isNaN(eventDate.getTime())) {
        throw new Error('Invalid date format from database');
      }

      // Format the time from the database
      const [hours, minutes] = openMicDate.time.split(':');
      const timeObj = new Date();
      timeObj.setHours(parseInt(hours), parseInt(minutes), 0);
      
      await sendConfirmationEmail(
        email, 
        type, 
        signupData.id,
        eventDate,
        openMicDate.time,
        openMicDate.timezone
      );
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError);
      // Log the error but don't throw - we still want to return success since the signup worked
      // The user can still attend even if they don't get the email
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Failed to process signup' },
      { status: 500 }
    );
  }
} 