import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { getSignupById, setCheckIn } from '@/lib/repos/signups';

export async function POST(request: Request) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { signUpId, status } = await request.json();

    // Can't change check-in once a comedian has been selected in the lottery.
    const signUp = await getSignupById(signUpId);
    if (signUp?.lottery_order != null) {
      return NextResponse.json(
        { error: 'Cannot modify comedian who has been selected in lottery' },
        { status: 400 }
      );
    }

    await setCheckIn(signUpId, status);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to check in' }, { status: 500 });
  }
}
