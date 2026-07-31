import { db } from '../db';
import type { CheckInStatus, SignUp, SignupType } from '../db-types';

export async function getSignupById(id: string): Promise<SignUp | null> {
  const row = await db
    .selectFrom('sign_ups')
    .selectAll()
    .where('id', '=', id)
    .executeTakeFirst();
  return row ?? null;
}

export async function getSignupForDate(personId: string, dateId: string): Promise<SignUp | null> {
  const row = await db
    .selectFrom('sign_ups')
    .selectAll()
    .where('person_id', '=', personId)
    .where('open_mic_date_id', '=', dateId)
    .executeTakeFirst();
  return row ?? null;
}

/**
 * Count confirmed (non-waitlist) comedians for a date. Mirrors the old RPC.
 * Pass includeEarlyAccess: false to get the publicly-displayed count, which
 * hides pre-open (/now) signups until the comedian window actually opens.
 */
export async function countComedians(
  dateId: string,
  opts: { includeEarlyAccess?: boolean } = {}
): Promise<number> {
  let query = db
    .selectFrom('sign_ups')
    .select((eb) => eb.fn.countAll<string>().as('count'))
    .where('open_mic_date_id', '=', dateId)
    .where('signup_type', '=', 'comedian')
    .where('is_waitlist', '=', false);
  if (opts.includeEarlyAccess === false) {
    query = query.where('is_early_access', '=', false);
  }
  const row = await query.executeTakeFirstOrThrow();
  return Number(row.count);
}

export interface CreateSignupInput {
  personId: string;
  dateId: string;
  numberOfPeople: number;
  firstMicEver: boolean;
  signupType: SignupType;
  willSupport: boolean;
  isWaitlist?: boolean;
  isEarlyAccess?: boolean;
}

export async function createSignup(input: CreateSignupInput): Promise<SignUp> {
  return await db
    .insertInto('sign_ups')
    .values({
      id: crypto.randomUUID(),
      person_id: input.personId,
      open_mic_date_id: input.dateId,
      number_of_people: input.numberOfPeople,
      first_mic_ever: input.firstMicEver,
      signup_type: input.signupType,
      will_support: input.willSupport,
      is_waitlist: input.isWaitlist ?? false,
      is_early_access: input.isEarlyAccess ?? false,
      created_at: new Date().toISOString(),
    })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export interface ComedianRow {
  id: string;
  person_id: string;
  email: string | null;
  full_name: string | null;
  check_in_status: CheckInStatus | null;
  lottery_order: number | null;
  created_at: string;
  first_mic_ever: boolean;
  plus_one: boolean;
  is_waitlist: boolean;
  is_early_access: boolean;
}

/** Comedians for a date joined to their person, ordered by signup time. */
export async function listComediansForDate(dateId: string): Promise<ComedianRow[]> {
  return await db
    .selectFrom('sign_ups')
    .innerJoin('people', 'people.id', 'sign_ups.person_id')
    .select([
      'sign_ups.id as id',
      'sign_ups.person_id as person_id',
      'people.email as email',
      'people.full_name as full_name',
      'sign_ups.check_in_status as check_in_status',
      'sign_ups.lottery_order as lottery_order',
      'sign_ups.created_at as created_at',
      'sign_ups.first_mic_ever as first_mic_ever',
      'sign_ups.plus_one as plus_one',
      'sign_ups.is_waitlist as is_waitlist',
      'sign_ups.is_early_access as is_early_access',
    ])
    .where('sign_ups.open_mic_date_id', '=', dateId)
    .where('sign_ups.signup_type', '=', 'comedian')
    .orderBy('sign_ups.created_at', 'asc')
    .execute();
}

export interface AudienceRow {
  id: string;
  person_id: string;
  email: string | null;
  full_name: string | null;
  number_of_people: number;
  created_at: string;
}

/** Audience signups for a date joined to their person, ordered by signup time. */
export async function listAudienceForDate(dateId: string): Promise<AudienceRow[]> {
  return await db
    .selectFrom('sign_ups')
    .innerJoin('people', 'people.id', 'sign_ups.person_id')
    .select([
      'sign_ups.id as id',
      'sign_ups.person_id as person_id',
      'people.email as email',
      'people.full_name as full_name',
      'sign_ups.number_of_people as number_of_people',
      'sign_ups.created_at as created_at',
    ])
    .where('sign_ups.open_mic_date_id', '=', dateId)
    .where('sign_ups.signup_type', '=', 'audience')
    .orderBy('sign_ups.created_at', 'asc')
    .execute();
}

/** Set or clear a comedian's check-in status. Pass 'uncheck' to clear. */
export async function setCheckIn(id: string, status: CheckInStatus | 'uncheck'): Promise<void> {
  const data =
    status === 'uncheck'
      ? { check_in_status: null, checked_in_at: null }
      : { check_in_status: status, checked_in_at: new Date().toISOString() };

  await db.updateTable('sign_ups').set(data).where('id', '=', id).execute();
}

export async function setPlusOne(id: string, plusOne: boolean): Promise<void> {
  await db.updateTable('sign_ups').set({ plus_one: plusOne }).where('id', '=', id).execute();
}
