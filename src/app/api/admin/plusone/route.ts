import { NextResponse } from 'next/server';
import { setPlusOne } from '@/lib/repos/signups';

export async function POST(request: Request) {
  try {
    const { signUpId, plusOne, password } = await request.json();

    if (password !== 'tavi') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await setPlusOne(signUpId, plusOne);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to update plus one status' }, { status: 500 });
  }
}
