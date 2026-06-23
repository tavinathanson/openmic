import { sql } from 'kysely';
import { db } from '../db';
import type { Person } from '../db-types';

/** Look up a person by email, case-insensitively. Returns null if not found. */
export async function getPersonByEmail(email: string): Promise<Person | null> {
  const row = await db
    .selectFrom('people')
    .selectAll()
    .where(sql<boolean>`lower(email) = lower(${email})`)
    .executeTakeFirst();

  return row ?? null;
}

export async function createPerson(email: string, fullName: string | null): Promise<Person> {
  return await db
    .insertInto('people')
    .values({
      id: crypto.randomUUID(),
      email,
      full_name: fullName,
      created_at: new Date().toISOString(),
    })
    .returningAll()
    .executeTakeFirstOrThrow();
}

/**
 * Return an existing person's id (matched case-insensitively by email) or create one.
 */
export async function getOrCreatePersonId(email: string, fullName: string | null): Promise<string> {
  const existing = await getPersonByEmail(email);
  if (existing) return existing.id;
  const created = await createPerson(email, fullName);
  return created.id;
}
