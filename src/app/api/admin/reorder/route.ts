import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { reorderLottery } from '@/lib/repos/lottery';

export async function POST(request: Request) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { comedianId, newOrder, activeDateId } = await request.json();

    await reorderLottery(activeDateId, comedianId, newOrder);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to reorder' }, { status: 500 });
  }
}
