import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { publishLottery } from '@/lib/repos/lottery';

export async function POST(request: Request) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { activeDateId, comedianIds } = await request.json();

    if (!Array.isArray(comedianIds) || comedianIds.length === 0) {
      return NextResponse.json({ error: 'No comedians to publish' }, { status: 400 });
    }

    await publishLottery(activeDateId, comedianIds);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to publish lottery' }, { status: 500 });
  }
}
