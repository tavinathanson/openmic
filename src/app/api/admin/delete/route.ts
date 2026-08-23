import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { getOpenMicDateById } from '@/lib/repos/dates';
import { deleteSignup } from '@/lib/repos/signups';
import { promoteNextWaitlisted } from '@/lib/repos/cancellations';
import { renumberLottery } from '@/lib/repos/lottery';
import { sendWaitlistPromotionEmail } from '@/lib/resend';

/**
 * Permanently remove a signup — no cancellation_history entry, no notification to
 * the person. For test/duplicate signups the organizer wants gone entirely, which
 * "not coming" doesn't do (that keeps the row, and the slot count with it).
 */
export async function POST(request: Request) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { signUpId } = await request.json();
    if (!signUpId) {
      return NextResponse.json({ error: 'Missing signUpId' }, { status: 400 });
    }

    const deleted = await deleteSignup(signUpId);
    if (!deleted) {
      return NextResponse.json({ error: 'No signup found' }, { status: 404 });
    }

    // Close the hole they left in the published order.
    if (deleted.lottery_order != null) {
      await renumberLottery(deleted.open_mic_date_id);
    }

    // Deleting a confirmed comedian frees a spot, same as a cancellation does.
    if (deleted.signup_type === 'comedian' && !deleted.is_waitlist) {
      try {
        const promoted = await promoteNextWaitlisted(deleted.open_mic_date_id);
        const date = promoted ? await getOpenMicDateById(deleted.open_mic_date_id) : null;
        if (promoted?.email && date) {
          await sendWaitlistPromotionEmail(
            promoted.email,
            promoted.id,
            new Date(date.date + 'T00:00:00'),
            date.time,
            date.timezone
          );
          console.log(`Promoted ${promoted.full_name || promoted.email} off waitlist`);
        }
      } catch (promoteError) {
        console.error('Failed to auto-promote from waitlist:', promoteError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete signup error:', error);
    return NextResponse.json({ error: 'Failed to delete signup' }, { status: 500 });
  }
}
