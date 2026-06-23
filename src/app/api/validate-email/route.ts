import { NextResponse } from 'next/server';
import { getActiveOpenMicDate } from '@/lib/repos/dates';
import { getPersonByEmail } from '@/lib/repos/people';
import { getSignupForDate } from '@/lib/repos/signups';

export async function POST(request: Request) {
  try {
    const { email, type } = await request.json();

    if (!email || !type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (type !== 'comedian' && type !== 'audience') {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    let activeDate;
    try {
      activeDate = await getActiveOpenMicDate();
    } catch {
      return NextResponse.json({ error: 'No active open mic date found' }, { status: 400 });
    }

    const person = await getPersonByEmail(email);

    if (person) {
      const signup = await getSignupForDate(person.id, activeDate.id);
      return NextResponse.json({
        exists: true,
        full_name: person.full_name,
        number_of_people: signup?.number_of_people || 1,
        already_signed_up: !!signup,
        is_waitlist: signup?.is_waitlist || false,
      });
    }

    return NextResponse.json({
      exists: false,
      full_name: null,
      number_of_people: null,
      already_signed_up: false,
    });
  } catch (error) {
    console.error('Email validation error:', error);
    return NextResponse.json({ error: 'Failed to validate email' }, { status: 500 });
  }
}
