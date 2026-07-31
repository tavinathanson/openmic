import { NextResponse } from 'next/server';
import { parseISO } from 'date-fns';
import { getActiveOpenMicDate } from '@/lib/repos/dates';
import { getOrCreatePersonId } from '@/lib/repos/people';
import { countComedians, createSignup, getSignupForDate } from '@/lib/repos/signups';
import { isUniqueViolation } from '@/lib/db';
import { isComedianSignupWindowOpen, getComedianSignupOpenDate } from '@/lib/openMic';
import { sendConfirmationEmail, sendWaitlistEmail, sendEmailErrorNotification } from '@/lib/resend';

export async function POST(request: Request) {
  let email: string | undefined;
  let type: string | undefined;
  let full_name: string | undefined;
  try {
    const body = await request.json();
    email = body.email;
    type = body.type;
    full_name = body.full_name;
    const { number_of_people, first_mic_ever, will_support, early_access } = body;

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

    // Comedians can only sign up once the window opens, unless they're coming
    // from the early-access (/now) link — those signups are hidden from the
    // public count until the window opens for real, see countComedians().
    const windowOpen = isComedianSignupWindowOpen(activeDate.date);
    const isEarlyAccess = type === 'comedian' && !windowOpen && Boolean(early_access);
    if (type === 'comedian' && !windowOpen && !isEarlyAccess) {
      return NextResponse.json(
        { error: 'Comedian signups are not open yet for this date' },
        { status: 400 }
      );
    }

    const personId = await getOrCreatePersonId(email, full_name || null);

    const existing = await getSignupForDate(personId, activeDate.id);
    if (existing) {
      return NextResponse.json({ error: 'You are already signed up for this date' }, { status: 400 });
    }

    // If comedian slots are full, sign up onto the waitlist instead.
    let isWaitlist = false;
    if (type === 'comedian') {
      const count = await countComedians(activeDate.id);
      const maxSlots = parseInt(process.env.NEXT_PUBLIC_MAX_COMEDIAN_SLOTS || '20');
      if (count >= maxSlots) isWaitlist = true;
    }

    let signup;
    try {
      signup = await createSignup({
        personId,
        dateId: activeDate.id,
        numberOfPeople: number_of_people || 1,
        firstMicEver: first_mic_ever || false,
        signupType: type,
        willSupport: will_support || false,
        isWaitlist,
        isEarlyAccess,
      });
    } catch (err) {
      if (isUniqueViolation(err)) {
        return NextResponse.json({ error: 'You are already signed up for this date' }, { status: 400 });
      }
      throw err;
    }

    // Send confirmation/waitlist email — failures notify the organizer but don't fail the signup.
    try {
      const eventDate = parseISO(activeDate.date);
      if (isNaN(eventDate.getTime())) {
        throw new Error('Invalid date format from database');
      }
      if (isWaitlist) {
        await sendWaitlistEmail(email, signup.id, eventDate, activeDate.time, activeDate.timezone);
      } else {
        await sendConfirmationEmail(email, type, signup.id, eventDate, activeDate.time, activeDate.timezone);
      }
    } catch (emailError) {
      console.error('Failed to send signup email:', emailError);
      await sendEmailErrorNotification(email, isWaitlist ? 'waitlist' : 'confirmation', emailError, {
        fullName: full_name,
        type,
        date: activeDate.date,
      });
    }

    if (isWaitlist) {
      return NextResponse.json({
        success: true,
        is_waitlist: true,
        message: 'You have been added to the waitlist!',
      });
    }
    if (isEarlyAccess) {
      const opensDate = getComedianSignupOpenDate(activeDate.date).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      });
      return NextResponse.json({
        success: true,
        message: `You're confirmed! Since general comedian signups don't open until ${opensDate}, your spot won't show up in the public count until then.`,
      });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Signup error:', error);
    try {
      await sendEmailErrorNotification(email || 'unknown', 'signup_api_error', error, {
        fullName: full_name || 'unknown',
        type: type || 'unknown',
        timestamp: new Date().toISOString(),
      });
    } catch {
      // Don't let notification failure mask the original error
    }
    return NextResponse.json({ error: 'Failed to process signup' }, { status: 500 });
  }
}
