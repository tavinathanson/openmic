import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { getOrCreatePersonId } from '@/lib/repos/people';
import { createSignup } from '@/lib/repos/signups';

export async function POST(request: Request) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { name, email, activeDateId } = await request.json();

    const personId = await getOrCreatePersonId(email, name);

    await createSignup({
      personId,
      dateId: activeDateId,
      signupType: 'comedian',
      numberOfPeople: 1,
      firstMicEver: false,
      willSupport: false,
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to add walk-in' }, { status: 500 });
  }
}
