# Open Mic Signup

A modern web application for managing comedy open mic signups. Built with Next.js, Supabase, and Resend.

Mostly written by AI tools, including this README! Except this line. A human wrote this line. If the rest of the README sounds a little formal, it's because a computer wrote it. I know, it's weird.

## Features

- Real-time comedian slot counter
- Sign up as either a comedian or audience member
- Email confirmation and reminder system
- Easy signup cancellation via email link
- Responsive design with dark mode support
- Real-time updates using Supabase subscriptions
- Date-specific open mic events and signups
- Active date management system

## Prerequisites

- Node.js 18+ and npm/yarn/pnpm
- Supabase account and project
- Resend account for email functionality
- Supabase CLI installed via Homebrew: `brew install supabase/tap/supabase`

## Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
DATABASE_URL=postgresql://postgres:your_password@db.your_project_ref.supabase.co:5432/postgres

# Email Configuration
RESEND_API_KEY=your_resend_api_key

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3003 # Change in production
NEXT_PUBLIC_MAX_COMEDIAN_SLOTS=20 # Optional, defaults to 20
```

You can find your database connection string in your Supabase project settings:
1. Go to Project Settings > Database
2. Find the "Connection string" section
3. Copy the "URI" connection string
4. Add it to your `.env.local` as `DATABASE_URL`

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/openmic.git
cd openmic
```

2. Install dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
```

3. Set up your environment variables as described above.

4. Run the development server:
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

## Database Management

### Initial Setup

1. Create two Supabase projects:
   - One for development
   - One for production

2. Get your database connection strings:
   - Go to your Supabase project dashboard
   - Navigate to Project Settings > Database
   - Find the "Connection string" section
   - Copy the "URI" connection string
   - Add it to your `.env.local` as `DATABASE_URL`

3. Initialize the database:
```bash
# For development
npm run db:push

# For production
npm run db:push:prod
```

### Importing Data

You can import people data from a CSV file using the import command. The CSV file should have the following columns:
- `Name`: The person's full name or stage name
- `Email`: The person's email address (must be unique)

To import data:
```bash
# For development
npm run db:import -- path/to/your/file.csv

# For production
npm run db:import:prod -- path/to/your/file.csv
```

The import will:
- Create new records for emails that don't exist
- Skip any records where the email already exists (no updates)
- Show a summary of the import results including:
  - Number of successfully imported new records
  - Number of skipped records (duplicate emails)

Example output:
```
status   | count | message
---------+-------+------------------------
inserted |   50  | Successfully imported new record
skipped  |    3  | Skipped - email already exists
```

Note: The import process is designed to be safe and non-destructive. It will never update existing records, only insert new ones. If you need to update existing records, you should do so manually through the database interface.

### Database Schema

The application uses three main tables:

1. `open_mic_dates` - Manages available open mic dates
   - `id`: UUID (primary key)
   - `date`: DATE (when the open mic is)
   - `is_active`: BOOLEAN (whether this date is currently active)
   - `created_at`: TIMESTAMPTZ

2. `people` - Stores information about all users
   - `id`: UUID (primary key)
   - `email`: TEXT (unique)
   - `full_name`: TEXT (optional)
   - `created_at`: TIMESTAMPTZ

3. `sign_ups` - Tracks who signed up for which date
   - `id`: UUID (primary key)
   - `person_id`: UUID (references people.id)
   - `open_mic_date_id`: UUID (references open_mic_dates.id)
   - `number_of_people`: INTEGER (defaults to 1)
   - `created_at`: TIMESTAMPTZ

### Managing Open Mic Dates

The application supports multiple open mic dates. To manage dates:

1. Access your Supabase database
2. Navigate to the `open_mic_dates` table
3. Insert a new date:
```sql
INSERT INTO open_mic_dates (date, is_active) VALUES ('2024-03-30', true);
```

To deactivate a date:
```sql
UPDATE open_mic_dates SET is_active = false WHERE id = 'your_date_id';
```

The system will:
- Show the next active date on the main page
- Only allow signups for the active date
- Track slot availability per date
- Show remaining slots specific to the current date
- Validate email signups against the current date

### Managing Migrations

The project uses Supabase migrations to manage database changes. Migrations are stored in the `supabase/migrations` directory.

#### Development Workflow

1. Make changes to your database schema in the `supabase/migrations` directory
2. Test changes locally:
```bash
# Push changes to development database
npm run db:push

# If needed, reset development database
npm run db:reset
```

#### Production Deployment

1. After testing in development, deploy to production:
```bash
# Push changes to production database
npm run db:push:prod
```

2. If needed, you can pull the current production schema:
```bash
npm run db:pull:prod
```

### Available Database Commands

- `npm run db:push` - Push migrations to development database
- `npm run db:push:prod` - Push migrations to production database
- `npm run db:pull` - Pull current schema from development database
- `npm run db:pull:prod` - Pull current schema from production database
- `npm run db:reset` - Reset development database
- `npm run db:reset:prod` - Reset production database
- `npm run db:status` - Check migration status in development
- `npm run db:status:prod` - Check migration status in production

### Best Practices

1. Always develop and test migrations in the development environment first
2. Use `db:pull` to get the latest schema from production before making changes
3. Use `db:push:prod` only when you're sure the changes are ready for production
4. Keep your `.env` files secure and never commit them to version control
5. Consider using a staging environment between development and production for larger projects

## Deployment

The application is optimized for deployment on Vercel. Here's a detailed guide:

1. Push your code to GitHub if you haven't already:
```bash
git add .
git commit -m "Initial commit"
git push origin main
```

2. Deploy to Vercel:
   - Go to [Vercel](https://vercel.com) and sign in with your GitHub account
   - Click "Add New Project"
   - Import your repository
   - Select the repository from the list
   - Vercel will automatically detect that it's a Next.js project
   - Click "Deploy"

3. Configure Environment Variables:
   - In your Vercel project settings, go to the "Environment Variables" tab
   - Add all the variables from your `.env.local` file:
     ```
     NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
     DATABASE_URL=your_database_url
     RESEND_API_KEY=your_resend_api_key
     NEXT_PUBLIC_APP_URL=https://your-vercel-domain.vercel.app
     NEXT_PUBLIC_MAX_COMEDIAN_SLOTS=20
     ```
   - Make sure to update `NEXT_PUBLIC_APP_URL` to your Vercel deployment URL

4. Database Setup:
   - Ensure your Supabase database is properly configured
   - Run the database migrations on your production database:
     ```bash
     npm run db:push:prod
     ```

5. Finalize Deployment:
   - Click "Deploy" in Vercel
   - Wait for the build to complete
   - Your application will be live at `https://your-project-name.vercel.app`

For subsequent deployments:
- Simply push to your main branch
- Vercel will automatically detect the changes and deploy
- Make sure to update any environment variables if needed

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
