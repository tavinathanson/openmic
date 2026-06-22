import { NextResponse } from 'next/server';
import { reorderLottery } from '@/lib/repos/lottery';

export async function POST(request: Request) {
  try {
    const { comedianId, newOrder, password, activeDateId } = await request.json();

    if (password !== 'tavi') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await reorderLottery(activeDateId, comedianId, newOrder);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to reorder' }, { status: 500 });
  }
}
