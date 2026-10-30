import { NextResponse } from 'next/server';
import { getActiveOpenMicDate } from '@/lib/repos/dates';
import { listComediansForDate } from '@/lib/repos/signups';
import { getCheckInOpensAt, isComedianSignupWindowOpen } from '@/lib/openMic';

export async function GET() {
  try {
    const activeDate = await getActiveOpenMicDate();
    const checkInOpensAt = getCheckInOpensAt(activeDate.date, activeDate.time, activeDate.timezone);
    const checkInOpen = new Date() >= checkInOpensAt;
    // Names stay off the public list until check-in opens; filtering here keeps them out of the JSON too.
    if (!checkInOpen) {
      return NextResponse.json({ comedians: [], checkInOpen, checkInOpensAt: checkInOpensAt.toISOString() });
    }

    const windowOpen = isComedianSignupWindowOpen(activeDate.date);
    let rows = await listComediansForDate(activeDate.id);
    // Pre-open (/now) signups stay off this public list, same as the slot count,
    // until the comedian window actually opens.
    if (!windowOpen) {
      rows = rows.filter((c) => !c.is_early_access);
    }

    const comedians = rows.map((c) => ({
      id: c.id,
      full_name: c.full_name ?? 'Comedian',
      check_in_status: c.check_in_status,
      lottery_order: c.lottery_order,
    }));

    return NextResponse.json({ comedians, checkInOpen, checkInOpensAt: checkInOpensAt.toISOString() });
  } catch (error) {
    console.error('Failed to fetch comedians:', error);
    return NextResponse.json({ error: 'Failed to fetch comedians' }, { status: 500 });
  }
}
