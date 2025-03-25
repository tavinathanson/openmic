# Open Mic Signup

A modern web application for managing comedy open mic signups. Built with Next.js, Supabase, and Resend.

## Features

- Real-time comedian slot counter
- Sign up as either a comedian or audience member
- Email confirmation and reminder system
- Easy signup cancellation via email link
- Responsive design with dark mode support
- Real-time updates using Supabase subscriptions

## Prerequisites

- Node.js 18+ and npm/yarn/pnpm
- Supabase account and project
- Resend account for email functionality

## Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
RESEND_API_KEY=your_resend_api_key
NEXT_PUBLIC_APP_URL=http://localhost:3000 # Change in production
NEXT_PUBLIC_MAX_COMEDIAN_SLOTS=20 # Optional, defaults to 20
```

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

## Database Setup

The application uses Supabase with two main tables:

- `comedians`: Stores comedian signups
- `audience`: Stores audience member signups

Each table should have the following columns:
- `id` (uuid, primary key)
- `email` (text)
- `created_at` (timestamp with timezone)

### Setting up Supabase Database

1. Create a new project in Supabase
2. Go to the SQL Editor in your Supabase dashboard
3. Run the following SQL commands to create the required tables and structure:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create comedians table
CREATE TABLE comedians (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create audience table
CREATE TABLE audience (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX comedians_email_idx ON comedians(email);
CREATE INDEX audience_email_idx ON audience(email);

-- Set up Row Level Security (RLS)
ALTER TABLE comedians ENABLE ROW LEVEL SECURITY;
ALTER TABLE audience ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all operations (you can restrict these based on your needs)
CREATE POLICY "Allow all operations on comedians" ON comedians
    FOR ALL USING (true);

CREATE POLICY "Allow all operations on audience" ON audience
    FOR ALL USING (true);
```

4. After running these commands, you can get your project URL and anon key from:
   - Project Settings > API > Project URL
   - Project Settings > API > Project API keys > anon/public

## Deployment

The application is optimized for deployment on Vercel:

1. Push your code to GitHub
2. Import your repository on Vercel
3. Add your environment variables in the Vercel project settings
4. Deploy!

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
