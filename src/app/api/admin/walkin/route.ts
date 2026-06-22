import { NextResponse } from 'next/server';
import { getOrCreatePersonId } from '@/lib/repos/people';
import { createSignup } from '@/lib/repos/signups';

export async function POST(request: Request) {
  try {
    const { name, email, activeDateId, password } = await request.json();

    if (password !== 'tavi') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
