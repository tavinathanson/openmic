import { NextResponse } from 'next/server';
import { getActiveOpenMicDate } from '@/lib/repos/dates';
import { getPersonByEmail } from '@/lib/repos/people';
import { getSignupForDate } from '@/lib/repos/signups';
import { cancelSignup, promoteNextWaitlisted } from '@/lib/repos/cancellations';
import {
  sendCancellationNotification,
  sendEmailErrorNotification,
  sendWaitlistPromotionEmail,
} from '@/lib/resend';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const email = searchParams.get('email');
  const note = searchParams.get('note');

  try {
    let activeDate;
    try {
      activeDate = await getActiveOpenMicDate();
    } catch {
      return NextResponse.json({ error: 'No active open mic date found' }, { status: 400 });
    }

    // Resolve which signup to cancel: directly by id (from the email link), or by
    // looking up the person's signup for the active date.
    let signupId: string;
    if (id) {
      signupId = id;
    } else if (email) {
      const person = await getPersonByEmail(email);
      const signup = person ? await getSignupForDate(person.id, activeDate.id) : null;
      if (!signup) {
        return NextResponse.json({ error: 'No signup found for this email' }, { status: 404 });
      }
      signupId = signup.id;
    } else {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Logs to cancellation_history and deletes, atomically.
    const cancelled = await cancelSignup(signupId);
    if (!cancelled) {
      return NextResponse.json({ error: 'No signup found' }, { status: 404 });
    }

    // Notify the organizer (best effort).
    if (cancelled.email) {
      try {
        await sendCancellationNotification(
          cancelled.email,
          cancelled.full_name || 'Unknown',
          cancelled.signup_type as 'comedian' | 'audience',
          note || undefined
        );
      } catch (emailError) {
        console.error('Failed to send cancellation notification:', emailError);
        await sendEmailErrorNotification(cancelled.email, 'cancellation', emailError, {
          fullName: cancelled.full_name || 'Unknown',
          type: cancelled.signup_type,
          date: activeDate.date,
        });
      }
    }

    // Auto-promote the next waitlisted comedian when a comedian cancels.
    if (cancelled.signup_type === 'comedian') {
      try {
        const promoted = await promoteNextWaitlisted(activeDate.id);
        if (promoted?.email) {
          const eventDate = new Date(activeDate.date + 'T00:00:00');
          await sendWaitlistPromotionEmail(
            promoted.email,
            promoted.id,
            eventDate,
            activeDate.time,
            activeDate.timezone
          );
          console.log(`Promoted ${promoted.full_name || promoted.email} off waitlist`);
        }
      } catch (promoteError) {
        console.error('Failed to auto-promote from waitlist:', promoteError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Cancellation error:', error);
    return NextResponse.json({ error: 'Failed to cancel signup' }, { status: 500 });
  }
}
