import { NextResponse } from 'next/server';
import { getActiveOpenMicDate } from '@/lib/repos/dates';

// Public: the current active open mic date (date/time/timezone) for the homepage.
export async function GET() {
  try {
    const activeDate = await getActiveOpenMicDate();
    return NextResponse.json({ activeDate });
  } catch {
    return NextResponse.json({ activeDate: null });
  }
}
