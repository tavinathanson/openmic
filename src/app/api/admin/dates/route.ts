import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { getOpenMicDateById, listOpenMicDates } from '@/lib/repos/dates';
import { listAudienceForDate, listComediansForDate } from '@/lib/repos/signups';

/**
 * GET /api/admin/dates            -> list every open mic date, most recent first
 * GET /api/admin/dates?dateId=xxx -> read-only lineup (comedians + audience) for that date
 */
export async function GET(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const dateId = new URL(request.url).searchParams.get('dateId');

  if (!dateId) {
    const dates = await listOpenMicDates();
    return NextResponse.json({
      dates: dates.map((d) => ({ id: d.id, date: d.date, time: d.time, is_active: d.is_active })),
    });
  }

  const date = await getOpenMicDateById(dateId);
  if (!date) {
    return NextResponse.json({ error: 'Date not found' }, { status: 404 });
  }

  const comedianRows = await listComediansForDate(date.id);
  const comedians = comedianRows
    .map((c) => ({
      id: c.id,
      full_name: c.full_name ?? 'No name',
      check_in_status: c.check_in_status,
      lottery_order: c.lottery_order,
      first_mic_ever: c.first_mic_ever,
      plus_one: c.plus_one,
      is_waitlist: c.is_waitlist,
    }))
    .sort((a, b) => {
      if (a.lottery_order != null && b.lottery_order != null) return a.lottery_order - b.lottery_order;
      if (a.lottery_order != null) return -1;
      if (b.lottery_order != null) return 1;
      return 0;
    });

  const audienceRows = await listAudienceForDate(date.id);
  const audience = audienceRows.map((a) => ({
    id: a.id,
    full_name: a.full_name ?? 'No name',
    number_of_people: a.number_of_people,
  }));

  return NextResponse.json({
    date: { id: date.id, date: date.date, time: date.time, is_active: date.is_active },
    comedians,
    audience,
  });
}
