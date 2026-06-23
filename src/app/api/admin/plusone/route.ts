import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { setPlusOne } from '@/lib/repos/signups';

export async function POST(request: Request) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { signUpId, plusOne } = await request.json();

    await setPlusOne(signUpId, plusOne);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to update plus one status' }, { status: 500 });
  }
}
