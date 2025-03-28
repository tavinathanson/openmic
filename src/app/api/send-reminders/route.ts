import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { sendReminderEmail } from '@/lib/resend';
import { PostgrestError } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

interface Person {
  email: string;
  full_name: string | null;
}

interface Signup {
  id: string;
  number_of_people: number;
  people: Person;
}

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();

    // Get the active open mic date
    const { data: dateData, error: dateError } = await supabase
      .from('open_mic_dates')
      .select('*')
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

    // Get all signups for this date
    const { data: signups, error: signupsError } = await supabase
      .from('sign_ups')
      .select(`
        id,
        number_of_people,
        people (
          email,
          full_name
        )
      `)
      .eq('open_mic_date_id', dateData.id) as { data: Signup[] | null, error: PostgrestError | null };

    if (signupsError) {
      throw signupsError;
    }

    if (!signups) {
      return NextResponse.json({ 
        success: true,
        message: 'No signups found for this date'
      });
    }

    // Send reminder emails
    const emailPromises = signups.map(async (signup) => {
      try {
        // Determine if this is a comedian or audience signup based on whether they have a full_name
        const type = signup.people.full_name ? 'comedian' : 'audience';
        
        // Format the date for the email
        const eventDate = new Date(dateData.date);
        
        // Format the time from the database
        const [hours, minutes] = dateData.time.split(':');
        const timeObj = new Date();
        timeObj.setHours(parseInt(hours), parseInt(minutes), 0);
        const formattedTime = timeObj.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });

        await sendReminderEmail(
          signup.people.email,
          type,
          signup.id,
          eventDate,
          formattedTime
        );
      } catch (error) {
        console.error(`Failed to send reminder to ${signup.people.email}:`, error);
      }
    });

    await Promise.all(emailPromises);

    return NextResponse.json({ 
      success: true,
      message: `Sent reminders to ${signups.length} people`
    });
  } catch (error) {
    console.error('Failed to send reminders:', error);
    return NextResponse.json(
      { error: 'Failed to send reminders' },
      { status: 500 }
    );
  }
} 