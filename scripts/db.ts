import { execSync } from 'child_process';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables based on NODE_ENV
const env = process.env.NODE_ENV || 'development';
config({ 
  path: resolve(__dirname, '..', env === 'development' ? '.env.local' : '.env.production') 
});

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

type DbCommand = 'push' | 'pull' | 'reset' | 'status' | 'import';

const commands: Record<DbCommand, string> = {
  push: `supabase db push --db-url ${databaseUrl}`,
  pull: `supabase db pull --db-url ${databaseUrl}`,
  reset: `supabase db reset --db-url ${databaseUrl}`,
  status: `supabase db status --db-url ${databaseUrl}`,
  import: `psql ${databaseUrl} -f scripts/import/import_people.sql`,
};

const command = process.argv[2] as DbCommand;

if (!command || !commands[command]) {
  console.error('Please provide a valid command: push, pull, reset, status, or import');
  process.exit(1);
}

try {
  console.log(`Running ${command} for ${env} environment...`);
  
  if (command === 'import') {
    const csvFile = process.argv[3];
    if (!csvFile) {
      console.error('Please provide a CSV file path for import');
      process.exit(1);
    }
    const importCommand = `CSV_FILE="${csvFile}" ${commands.import}`;
    execSync(importCommand, { stdio: 'inherit' });
  } else {
    execSync(commands[command], { stdio: 'inherit' });
  }
  
  console.log(`Successfully completed ${command}`);
} catch (error) {
  console.error(`Error running ${command}:`, error);
  process.exit(1);
} 