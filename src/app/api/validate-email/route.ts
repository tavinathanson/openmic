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

    // First, check if the email exists in the database at all
    const { data: existingData, error: existingError } = await supabase
      .from(type === 'comedian' ? 'comedians' : 'audience')
      .select('*')
      .eq('email', email)
      .single();

    if (existingError && existingError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      throw existingError;
    }

    // If email exists, check if it's already signed up for this date
    if (existingData) {
      const { data: currentDateData, error: currentDateError } = await supabase
        .from(type === 'comedian' ? 'comedians' : 'audience')
        .select('*')
        .eq('email', email)
        .eq('date_id', dateData.id)
        .single();

      if (currentDateError && currentDateError.code !== 'PGRST116') {
        throw currentDateError;
      }

      return NextResponse.json({
        exists: true,
        full_name: existingData.full_name,
        number_of_people: existingData.number_of_people,
        already_signed_up: !!currentDateData
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