import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { sendConfirmationEmail } from '@/lib/resend';

export async function POST(request: Request) {
  try {
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

    // Check if user is already signed up for this date
    const { data: existingSignup, error: existingError } = await supabase
      .from(type === 'comedian' ? 'comedians' : 'audience')
      .select('*')
      .eq('email', email)
      .eq('date_id', dateData.id)
      .single();

    if (existingError && existingError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      throw existingError;
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
        .from('comedians')
        .select('*', { count: 'exact', head: true })
        .eq('date_id', dateData.id);
      
      const maxSlots = parseInt(process.env.NEXT_PUBLIC_MAX_COMEDIAN_SLOTS || '20');
      if ((count || 0) >= maxSlots) {
        return NextResponse.json(
          { error: 'Sorry, all comedian slots are full for this date!' },
          { status: 400 }
        );
      }
    }

    // Insert the signup with the date_id
    const { data, error } = await supabase
      .from(type === 'comedian' ? 'comedians' : 'audience')
      .insert([{
        email,
        date_id: dateData.id,
        ...(type === 'comedian' ? { full_name } : {}),
        ...(type === 'audience' ? { number_of_people: number_of_people || 1 } : {})
      }])
      .select()
      .single();

    if (error) throw error;

    // Send confirmation email
    try {
      await sendConfirmationEmail(email, type, data.id);
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError);
      // Don't throw here, we still want to return success since the signup worked
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