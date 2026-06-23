import { NextResponse } from 'next/server';
import { getActiveOpenMicDate } from '@/lib/repos/dates';
import { listComediansForDate } from '@/lib/repos/signups';

export async function GET() {
  try {
    const activeDate = await getActiveOpenMicDate();
    const rows = await listComediansForDate(activeDate.id);

    const comedians = rows.map((c) => ({
      id: c.id,
      full_name: c.full_name ?? 'Comedian',
      check_in_status: c.check_in_status,
      lottery_order: c.lottery_order,
    }));

    return NextResponse.json({ comedians });
  } catch (error) {
    console.error('Failed to fetch comedians:', error);
    return NextResponse.json({ error: 'Failed to fetch comedians' }, { status: 500 });
  }
}
