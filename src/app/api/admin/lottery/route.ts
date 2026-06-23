import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { runLottery } from '@/lib/repos/lottery';

export async function POST(request: Request) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { activeDateId, dryRun } = await request.json();

    const selectedIds = await runLottery(activeDateId, { dryRun: !!dryRun });
    return NextResponse.json({ selectedIds });
  } catch {
    return NextResponse.json({ error: 'Failed to run lottery' }, { status: 500 });
  }
}
