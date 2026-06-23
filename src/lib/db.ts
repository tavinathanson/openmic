import { Kysely, PostgresDialect } from 'kysely';
import pg from 'pg';
import type { Database } from './db-types';

const { Pool, types } = pg;

// Return DATE as 'YYYY-MM-DD' and TIMESTAMP(TZ) as ISO strings, matching the JSON
// shape the app relied on under Supabase (and our string-typed db-types).
types.setTypeParser(1082, (v: string) => v); // date
types.setTypeParser(1114, (v: string) => new Date(v + 'Z').toISOString()); // timestamp
types.setTypeParser(1184, (v: string) => new Date(v).toISOString()); // timestamptz

/** TLS on for remote hosts (Neon etc.); off for localhost. Override with DATABASE_SSL. */
export function resolveSsl(connectionString: string): false | { rejectUnauthorized: boolean } {
  if (process.env.DATABASE_SSL === 'disable') return false;
  if (process.env.DATABASE_SSL === 'require') return { rejectUnauthorized: false };
  if (/@(localhost|127\.0\.0\.1)([:/]|$)/.test(connectionString)) return false;
  return { rejectUnauthorized: false };
}

function createDb(): Kysely<Database> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is required');
  }
  const pool = new Pool({
    connectionString,
    ssl: resolveSsl(connectionString),
    max: Number(process.env.DATABASE_POOL_MAX ?? 5),
  });
  return new Kysely<Database>({ dialect: new PostgresDialect({ pool }) });
}

// Lazily build the Kysely instance on first query and reuse it across hot reloads /
// serverless invocations. Lazy init keeps `next build` from needing DATABASE_URL.
const globalForDb = globalThis as unknown as { __openmicDb?: Kysely<Database> };

function getDb(): Kysely<Database> {
  if (!globalForDb.__openmicDb) globalForDb.__openmicDb = createDb();
  return globalForDb.__openmicDb;
}

export const db = new Proxy({} as Kysely<Database>, {
  get(_target, prop, receiver) {
    const real = getDb();
    const value = Reflect.get(real as object, prop, receiver);
    return typeof value === 'function' ? value.bind(real) : value;
  },
});

/** True for a Postgres unique-constraint violation (e.g. duplicate signup). */
export function isUniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === '23505';
}
