# Open Mic Signup

A modern web application for managing comedy open mic signups. Built with Next.js, Supabase, and Resend.

Mostly written by AI tools, including this README! Except this line. A human wrote this line. If the rest of the README sounds a little formal, it's because a computer wrote it. I know, it's weird.

## Features

- Real-time comedian slot counter
- Sign up as either a comedian or audience member
- Email confirmation and reminder system
- Easy signup cancellation via email link
- Responsive design
- Real-time updates using Supabase subscriptions
- Date-specific open mic events and signups
- Active date management system
- Encourage users to support the venue with a purchase

## Quick Start

1. Clone the repo and install dependencies:
```bash
git clone https://github.com/yourusername/openmic.git
cd openmic
npm install
```

2. Set up your environment variables in `.env.local`:
```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
DATABASE_URL=postgresql://postgres:your_password@db.your_project_ref.supabase.co:5432/postgres

# Email Configuration
RESEND_API_KEY=your_resend_api_key

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3003
NEXT_PUBLIC_MAX_COMEDIAN_SLOTS=20
```

3. Run the development server:
```bash
npm run dev
```

## Database Setup

1. Create a Supabase project and get your connection string from Project Settings > Database
2. Initialize the database:
```bash
npm run db:push
```

3. To import people data from a CSV file:
```bash
npm run db:import -- path/to/your/file.csv
```

The CSV should have `Name` and `Email` columns. The import will create new records for new emails and skip existing ones.

## Security Implementation

The application uses Supabase Row Level Security (RLS) with JWT authentication:

- **Open Mic Dates**: Public read access
- **People**: Public signup, protected access for personal data
- **Signups**: Public signup, protected access for personal signups

JWT tokens (5-minute lifespan) secure database operations like email validation, signup management, and cancellations.

## Deployment

The app is optimized for Vercel deployment. Just push to GitHub and import your repo in Vercel. Make sure to add all your environment variables in the Vercel project settings.

## Available Commands

- `npm run dev` - Start development server
- `npm run db:push` - Push migrations to development database
- `npm run db:push:prod` - Push migrations to production database
- `npm run db:import` - Import people data from CSV
- `npm run db:import:prod` - Import people data to production
- `npm run db:reset` - Reset development database
- `npm run db:reset:prod` - Reset production database

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
