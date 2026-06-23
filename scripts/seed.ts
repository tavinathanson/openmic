import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local (development)
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { db } from '../src/lib/db';
import { ensureUpcomingActiveDate } from '../src/lib/repos/dates';
import type { CheckInStatus, SignupType } from '../src/lib/db-types';

// Dev-only: wipes the data tables and inserts a handful of example people,
// an upcoming active date, and a realistic mix of signups.
async function seed() {
  if (process.env.NODE_ENV === 'production') {
    console.error('Refusing to seed: NODE_ENV=production');
    process.exit(1);
  }

  console.log('Clearing existing data...');
  await db.deleteFrom('cancellation_history').execute();
  await db.deleteFrom('sign_ups').execute();
  await db.deleteFrom('open_mic_dates').execute();
  await db.deleteFrom('people').execute();

  const { date } = await ensureUpcomingActiveDate(10);
  console.log(`Active date: ${date.date} at ${date.time}`);

  const now = Date.now();
  const iso = (minutesAgo: number) => new Date(now - minutesAgo * 60_000).toISOString();

  const people: Array<[string, string]> = [
    ['Alice Adams', 'alice@example.com'],
    ['Bob Brown', 'bob@example.com'],
    ['Carla Cruz', 'carla@example.com'],
    ['Dev Patel', 'dev@example.com'],
    ['Erin Echols', 'erin@example.com'],
    ['Frank Fox', 'frank@example.com'],
    ['Grace Gao', 'grace@example.com'],
    ['Hank Hill', 'hank@example.com'],
  ];

  const personIds: string[] = [];
  for (let i = 0; i < people.length; i++) {
    const id = crypto.randomUUID();
    personIds.push(id);
    await db
      .insertInto('people')
      .values({
        id,
        full_name: people[i][0],
        email: people[i][1],
        created_at: iso((people.length - i) * 60),
      })
      .execute();
  }

  type SeedSignup = {
    p: number;
    type: SignupType;
    checkin?: CheckInStatus;
    firstMic?: boolean;
    waitlist?: boolean;
    plusOne?: boolean;
  };

  const signups: SeedSignup[] = [
    { p: 0, type: 'comedian', checkin: 'early', firstMic: true },
    { p: 1, type: 'comedian', checkin: 'early' },
    { p: 2, type: 'comedian', checkin: 'on_time' },
    { p: 3, type: 'comedian', checkin: 'late' },
    { p: 4, type: 'comedian' }, // signed up, not checked in
    { p: 5, type: 'comedian', waitlist: true }, // on the waitlist
    { p: 6, type: 'audience' },
    { p: 7, type: 'audience', plusOne: true },
  ];

  for (let i = 0; i < signups.length; i++) {
    const s = signups[i];
    await db
      .insertInto('sign_ups')
      .values({
        id: crypto.randomUUID(),
        person_id: personIds[s.p],
        open_mic_date_id: date.id,
        number_of_people: 1,
        signup_type: s.type,
        first_mic_ever: !!s.firstMic,
        will_support: false,
        plus_one: !!s.plusOne,
        is_waitlist: !!s.waitlist,
        check_in_status: s.checkin ?? null,
        checked_in_at: s.checkin ? iso(s.checkin === 'late' ? 2 : 25 - i) : null,
        // Stagger signup times so early-bird ordering is meaningful.
        created_at: iso((signups.length - i) * 3),
      })
      .execute();
  }

  console.log(`Seeded ${people.length} people and ${signups.length} signups.`);
  await db.destroy();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
