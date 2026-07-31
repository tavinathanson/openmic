import { NextResponse } from 'next/server';
import { getActiveOpenMicDate } from '@/lib/repos/dates';
import { countComedians } from '@/lib/repos/signups';
import { isComedianSignupWindowOpen } from '@/lib/openMic';

// Public: confirmed (non-waitlist) comedian count + the active date, for the slot counter.
// Pre-open (/now) signups are hidden from this count until the window opens for real.
export async function GET() {
  try {
    const activeDate = await getActiveOpenMicDate();
    const windowOpen = isComedianSignupWindowOpen(activeDate.date);
    const count = await countComedians(activeDate.id, { includeEarlyAccess: windowOpen });
    return NextResponse.json({ activeDate, count });
  } catch {
    return NextResponse.json({ activeDate: null, count: 0 });
  }
}
