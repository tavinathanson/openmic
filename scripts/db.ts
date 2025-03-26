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

type DbCommand = 'push' | 'pull' | 'reset' | 'status';

const commands: Record<DbCommand, string> = {
  push: `supabase db push --db-url ${databaseUrl}`,
  pull: `supabase db pull --db-url ${databaseUrl}`,
  reset: `supabase db reset --db-url ${databaseUrl}`,
  status: `supabase db status --db-url ${databaseUrl}`,
};

const command = process.argv[2] as DbCommand;

if (!command || !commands[command]) {
  console.error('Please provide a valid command: push, pull, reset, or status');
  process.exit(1);
}

try {
  console.log(`Running ${command} for ${env} environment...`);
  execSync(commands[command], { stdio: 'inherit' });
  console.log(`Successfully completed ${command}`);
} catch (error) {
  console.error(`Error running ${command}:`, error);
  process.exit(1);
} 