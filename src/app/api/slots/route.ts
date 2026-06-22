import { NextResponse } from 'next/server';
import { getActiveOpenMicDate } from '@/lib/repos/dates';
import { countComedians } from '@/lib/repos/signups';

// Public: confirmed (non-waitlist) comedian count + the active date, for the slot counter.
export async function GET() {
  try {
    const activeDate = await getActiveOpenMicDate();
    const count = await countComedians(activeDate.id);
    return NextResponse.json({ activeDate, count });
  } catch {
    return NextResponse.json({ activeDate: null, count: 0 });
  }
}
