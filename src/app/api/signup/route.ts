import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { sendConfirmationEmail } from '@/lib/resend';

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { email, type, full_name, number_of_people } = await request.json();

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

    // Get the active open mic date
    const { data: dateData, error: dateError } = await supabase
      .from('open_mic_dates')
      .select('id')
      .eq('is_active', true)
      .order('date', { ascending: true })
      .limit(1)
      .single();

    if (dateError || !dateData) {
      return NextResponse.json(
        { error: 'No active open mic date found' },
        { status: 400 }
      );
    }

    // Start a transaction
    const { data: personData, error: personError } = await supabase
      .from('people')
      .select('*')
      .eq('email', email)
      .single();

    let personId: string;
    if (personError && personError.code === 'PGRST116') {
      // Person doesn't exist, create them
      const { data: newPerson, error: createError } = await supabase
        .from('people')
        .insert([{
          email,
          full_name: full_name || null
        }])
        .select()
        .single();

      if (createError) throw createError;
      personId = newPerson.id;
    } else if (personError) {
      throw personError;
    } else {
      personId = personData.id;
    }

    // Check if person is already signed up for this date
    const { data: existingSignup, error: signupError } = await supabase
      .from('sign_ups')
      .select('*')
      .eq('person_id', personId)
      .eq('open_mic_date_id', dateData.id)
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
      const { count } = await supabase
        .from('sign_ups')
        .select('*', { count: 'exact', head: true })
        .eq('open_mic_date_id', dateData.id);
      
      const maxSlots = parseInt(process.env.NEXT_PUBLIC_MAX_COMEDIAN_SLOTS || '20');
      if ((count || 0) >= maxSlots) {
        return NextResponse.json(
          { error: 'Sorry, all comedian slots are full for this date!' },
          { status: 400 }
        );
      }
    }

    // Create the signup
    const { data: signupData, error: createSignupError } = await supabase
      .from('sign_ups')
      .insert([{
        person_id: personId,
        open_mic_date_id: dateData.id,
        number_of_people: number_of_people || 1
      }])
      .select()
      .single();

    if (createSignupError) throw createSignupError;

    // Send confirmation email
    try {
      const { data: openMicDate, error: dateError } = await supabase
        .from('open_mic_dates')
        .select('date, time')
        .eq('id', dateData.id)
        .single();
      
      if (dateError || !openMicDate) {
        throw new Error('Failed to get open mic date');
      }

      const eventDate = new Date(openMicDate.date);
      if (isNaN(eventDate.getTime())) {
        throw new Error('Invalid date format from database');
      }

      // Format the time from the database
      const [hours, minutes] = openMicDate.time.split(':');
      const timeObj = new Date();
      timeObj.setHours(parseInt(hours), parseInt(minutes), 0);
      const formattedTime = timeObj.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      
      await sendConfirmationEmail(
        email, 
        type, 
        signupData.id,
        eventDate,
        formattedTime
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