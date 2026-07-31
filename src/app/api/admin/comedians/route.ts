import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { getActiveOpenMicDate } from '@/lib/repos/dates';
import { listAudienceForDate, listComediansForDate } from '@/lib/repos/signups';

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
        audience: [],
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
      is_early_access: c.is_early_access,
    }));

    const audienceRows = await listAudienceForDate(activeDate.id);
    const audience = audienceRows.map((a) => ({
      id: a.id,
      email: a.email ?? '',
      full_name: a.full_name ?? 'No name',
      number_of_people: a.number_of_people,
      created_at: a.created_at,
    }));

    return NextResponse.json({ comedians, audience, activeDateId: activeDate.id });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch comedians' }, { status: 500 });
  }
}
