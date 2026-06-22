import { NextResponse } from 'next/server';
import { runLottery } from '@/lib/repos/lottery';

export async function POST(request: Request) {
  try {
    const { activeDateId, password, dryRun } = await request.json();

    if (password !== 'tavi') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const selectedIds = await runLottery(activeDateId, { dryRun: !!dryRun });
    return NextResponse.json({ selectedIds });
  } catch {
    return NextResponse.json({ error: 'Failed to run lottery' }, { status: 500 });
  }
}
