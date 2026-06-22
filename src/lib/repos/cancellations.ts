import { db } from '../db';

export interface CancelledSignup {
  signup_type: string;
  email: string;
  full_name: string | null;
}

/**
 * Log the signup to cancellation_history and delete it, atomically.
 * Replaces the old Postgres BEFORE DELETE trigger. Returns null if not found.
 */
export async function cancelSignup(signupId: string): Promise<CancelledSignup | null> {
  return await db.transaction().execute(async (trx) => {
    const signup = await trx
      .selectFrom('sign_ups')
      .selectAll()
      .where('id', '=', signupId)
      .executeTakeFirst();
    if (!signup) return null;

    const person = await trx
      .selectFrom('people')
      .select(['email', 'full_name'])
      .where('id', '=', signup.person_id)
      .executeTakeFirst();

    const date = await trx
      .selectFrom('open_mic_dates')
      .select('date')
      .where('id', '=', signup.open_mic_date_id)
      .executeTakeFirst();

    await trx
      .insertInto('cancellation_history')
      .values({
        id: crypto.randomUUID(),
        signup_id: signup.id,
        person_id: signup.person_id,
        email: person?.email ?? 'unknown',
        full_name: person?.full_name ?? null,
        open_mic_date_id: signup.open_mic_date_id,
        event_date: date?.date ?? null,
        signup_type: signup.signup_type,
        cancelled_at: new Date().toISOString(),
      })
      .execute();

    await trx.deleteFrom('sign_ups').where('id', '=', signupId).execute();

    return {
      signup_type: signup.signup_type,
      email: person?.email ?? '',
      full_name: person?.full_name ?? null,
    };
  });
}

export interface PromotedComedian {
  id: string;
  email: string | null;
  full_name: string | null;
}

/** Promote the oldest waitlisted comedian for a date off the waitlist. */
export async function promoteNextWaitlisted(dateId: string): Promise<PromotedComedian | null> {
  const next = await db
    .selectFrom('sign_ups')
    .select(['id', 'person_id'])
    .where('open_mic_date_id', '=', dateId)
    .where('signup_type', '=', 'comedian')
    .where('is_waitlist', '=', true)
    .orderBy('created_at', 'asc')
    .limit(1)
    .executeTakeFirst();
  if (!next) return null;

  await db.updateTable('sign_ups').set({ is_waitlist: false }).where('id', '=', next.id).execute();

  const person = await db
    .selectFrom('people')
    .select(['email', 'full_name'])
    .where('id', '=', next.person_id)
    .executeTakeFirst();

  return { id: next.id, email: person?.email ?? null, full_name: person?.full_name ?? null };
}
