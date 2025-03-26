import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
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

    // First, check if the email exists in the people table
    const { data: personData, error: personError } = await supabase
      .from('people')
      .select('*')
      .eq('email', email)
      .single();

    if (personError && personError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      throw personError;
    }

    // If person exists, check if they're already signed up for this date
    if (personData) {
      const { data: signupData, error: signupError } = await supabase
        .from('sign_ups')
        .select('*')
        .eq('person_id', personData.id)
        .eq('open_mic_date_id', dateData.id)
        .single();

      if (signupError && signupError.code !== 'PGRST116') {
        throw signupError;
      }

      return NextResponse.json({
        exists: true,
        full_name: personData.full_name,
        number_of_people: signupData?.number_of_people || 1,
        already_signed_up: !!signupData
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