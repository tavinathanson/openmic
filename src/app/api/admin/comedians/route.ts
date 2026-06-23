import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { getActiveOpenMicDate } from '@/lib/repos/dates';
import { listComediansForDate } from '@/lib/repos/signups';

export async function GET() {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let activeDate;
    try {
      activeDate = await getActiveOpenMicDate();
    } catch {
      return NextResponse.json({
        comedians: [],
        activeDateId: null,
        error: 'No active open mic date found',
      });
    }

    const rows = await listComediansForDate(activeDate.id);
    const comedians = rows.map((c) => ({
      id: c.id,
      person_id: c.person_id,
      email: c.email ?? '',
      full_name: c.full_name ?? 'No name',
      check_in_status: c.check_in_status,
      lottery_order: c.lottery_order,
      created_at: c.created_at,
      first_mic_ever: c.first_mic_ever,
      plus_one: c.plus_one,
      is_waitlist: c.is_waitlist,
    }));

    return NextResponse.json({ comedians, activeDateId: activeDate.id });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch comedians' }, { status: 500 });
  }
}
