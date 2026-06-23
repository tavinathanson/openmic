import { config } from 'dotenv';
import { resolve } from 'path';
import { readdirSync, readFileSync } from 'fs';
import pg from 'pg';

// Load env for the target environment (DATABASE_URL etc.)
const env = process.env.NODE_ENV || 'development';
config({ path: resolve(process.cwd(), env === 'production' ? '.env.production' : '.env.local') });

const { Client } = pg;

function resolveSsl(connectionString: string): false | { rejectUnauthorized: boolean } {
  if (process.env.DATABASE_SSL === 'disable') return false;
  if (process.env.DATABASE_SSL === 'require') return { rejectUnauthorized: false };
  if (/@(localhost|127\.0\.0\.1)([:/]|$)/.test(connectionString)) return false;
  return { rejectUnauthorized: false };
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL environment variable is required');
    process.exit(1);
  }

  const client = new Client({ connectionString, ssl: resolveSsl(connectionString) });
  await client.connect();
  try {
    await client.query(
      `CREATE TABLE IF NOT EXISTS schema_migrations (
         name TEXT PRIMARY KEY,
         applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
       )`
    );

    const dir = resolve(process.cwd(), 'migrations');
    const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
    const { rows } = await client.query<{ name: string }>('SELECT name FROM schema_migrations');
    const applied = new Set(rows.map((r) => r.name));

    let count = 0;
    for (const file of files) {
      if (applied.has(file)) continue;
      const sql = readFileSync(resolve(dir, file), 'utf8');
      console.log(`Applying ${file}...`);
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
        count++;
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }
    }

    console.log(count ? `Applied ${count} migration(s).` : 'No pending migrations.');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
