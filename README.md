# Open Mic Signup

A modern web application for managing comedy open mic signups. Built with Next.js, Postgres (via Kysely), and Resend.

Mostly written by AI tools, including this README! Except this line. A human wrote this line. If the rest of the README sounds a little formal, it's because a computer wrote it. I know, it's weird.

## Features

- Real-time comedian slot counter
- Sign up as either a comedian or audience member
- Email confirmation and reminder system with timezone-aware date formatting
- Easy signup cancellation via email link
- Responsive design
- Live slot counter via lightweight polling
- Date-specific open mic events and signups
- Active date management system
- Encourage users to support the venue with a purchase
- Admin check-in system with early/on-time/late tracking
- Weighted lottery system for fair performer selection

## Lottery System

The app includes a weighted lottery system for selecting performers:

**Ticket Weights (1, 3, or 5 tickets):**
- Base: 1 ticket for being checked in
- Early bird bonus: +2 tickets for first 5 signups
- Early check-in bonus: +2 tickets for checking in early

**Late Handling:**
- Late arrivals are always drawn after on-time/early people
- Late people are ordered by lateness (least late first)

**Testing:**
```bash
npm run test:lottery
```

## Quick Start

1. Clone the repo and install dependencies:
```bash
git clone https://github.com/yourusername/openmic.git
cd openmic
npm install
```

2. Set up your environment variables in `.env.local`:
```bash
# Database — any Postgres. Use the host's pooled connection string in production.
# For a local Postgres without TLS, set DATABASE_SSL=disable.
DATABASE_URL=postgres://user:password@host:5432/dbname

# Admin auth
ADMIN_PASSWORD=choose-a-strong-password
ADMIN_SESSION_SECRET=long-random-string-used-to-sign-the-admin-cookie

# Email Configuration
RESEND_API_KEY=your_resend_api_key

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3003
NEXT_PUBLIC_MAX_COMEDIAN_SLOTS=20

# Google Sheets Sync (optional)
GOOGLE_SERVICE_ACCOUNT_KEY='{ "your": "service account json" }'
GOOGLE_SHEET_ID=your_google_sheet_id
```

3. Run the development server:
```bash
npm run dev
```

## Database Setup

Works with any Postgres (Neon is a good free choice for Vercel). To start fresh:

1. Create a Postgres database and copy its connection string into `DATABASE_URL`.
2. Apply the schema:
```bash
npm run db:migrate            # development (reads .env.local)
npm run db:migrate:prod       # production (reads .env.production)
```

### Migrating from an existing Supabase database

Both ends are stock Postgres, so the data copies over directly (Supabase's auth/storage/RLS are skipped):
```bash
SUPABASE_DB_URL=<supabase-direct-connection-string> \
NEON_DB_URL=<new-postgres-connection-string> \
npm run db:migrate:from-supabase
```

## Security Implementation

The database is never exposed to the browser — only the server holds `DATABASE_URL`,
and all access goes through server-side API routes. Authorization lives in those routes:

- **Public endpoints** (signup, validate-email, slot count, active date): intentionally public.
- **Cancellation**: authorized by possession of the unguessable signup UUID in the email link.
- **Admin**: a single password (`ADMIN_PASSWORD`) is exchanged at `/api/admin/login` for a signed,
  httpOnly session cookie (`ADMIN_SESSION_SECRET`); every admin route requires that cookie.

## Email Case Sensitivity

The application handles email case sensitivity gracefully to ensure a consistent user experience. When users enter emails like `Test@example.com` vs `test@example.com`, the system treats them as the same person. This is achieved through a dual approach: emails are normalized to lowercase on the frontend before API calls (preventing future mixed-case data), while the backend compares `lower(email)` to handle existing mixed-case data. This solution avoids the need for database migrations while ensuring both old and new users experience consistent behavior.

## Timezone Handling

The application properly handles timezone differences for date formatting in emails. Email confirmations display "tonight", "tomorrow", or specific dates based on the event's timezone rather than the server's timezone, ensuring users see accurate relative dates regardless of where the server is hosted.

## Google Sheets Integration

The application can track new comedian emails by creating date-specific Google Sheets after each open mic. This allows you to review new comedians and manually add them to your main email list.

### Setting Up Google Sheets Sync

1. **Create a Google Cloud service account:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one
   - Enable the Google Sheets API:
     - Go to "APIs & Services" → "Library"
     - Search for "Google Sheets API" and click on it
     - Click "Enable"
   - Create a service account:
     - Go to "APIs & Services" → "Credentials"
     - Click "Create Credentials" → "Service account"
     - Give it a name (e.g., "openmic-sheets-sync")
     - Click "Create and Continue"
     - Skip the optional permissions step (click "Continue")
     - Skip the optional user access step (click "Done")
   - Create a key for the service account:
     - Click on your new service account
     - Go to the "Keys" tab
     - Click "Add Key" → "Create new key"
     - Choose "JSON" format
     - Download the JSON file (keep this secure!)

2. **Create and configure your Google Sheet:**
   - Create a new Google Sheet
   - Add "Email" as a column header in row 1 (the script will look for this column)
   - Get the Sheet ID from the URL: `https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit`
   - Share the sheet with your service account:
     - Click "Share" button
     - Paste the service account email (found in the JSON file as `client_email`)
     - Give it "Editor" permission
     - Click "Send"

3. **Set environment variables:**
   - Add to your `.env.local`:
     ```
     GOOGLE_SERVICE_ACCOUNT_KEY='{ paste contents of downloaded JSON file here }'
     GOOGLE_SHEET_ID=your_sheet_id_here
     ```
   - **Important:** The JSON must be on a single line. You can use a tool like `jq -c . < key.json` to compact it.
   
   - For GitHub Actions, add these as repository secrets:
     - Go to Settings → Secrets and variables → Actions
     - Add `GOOGLE_SERVICE_ACCOUNT_KEY` (paste the entire JSON content)
     - Add `GOOGLE_SHEET_ID`

4. **Manual sync:**
   ```bash
   npm run sync:comedians
   ```

5. **Automatic daily check:**
   - The GitHub Actions workflow runs daily at 1pm UTC (8am EST / 9am EDT)
   - It checks if there was an open mic yesterday (based on Eastern Time)
   - If yes, it creates a new sheet with any new comedian emails
   - You can also trigger it manually from the GitHub Actions tab

The sync process:
- Runs automatically the day after each open mic (or can be triggered manually)
- Checks your main Google Sheet for existing emails
- Finds any new comedian emails from last night's open mic
- Creates a new Google Sheet named "New Comedians - [date]" with only the new emails
- You can then manually review and add these to your main sheet as needed

## Deployment

The app is optimized for Vercel deployment. Just push to GitHub and import your repo in Vercel. Make sure to add all your environment variables in the Vercel project settings.

## Available Commands

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run test` - Run tests
- `npm run db:migrate` - Apply schema migrations to the development database
- `npm run db:migrate:prod` - Apply schema migrations to the production database
- `npm run db:migrate:from-supabase` - Copy data from an existing Supabase database
- `npm run sync:comedians` - Manually check for new comedians and create review sheet
- `npm run test:lottery` - Test lottery algorithm against live data

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
