# SocialPay Setup Guide

## Prerequisites

1. **Node.js** - Install Node.js 18+ from https://nodejs.org/
2. **Supabase Account** - Create a free account at https://supabase.com/

## Step 1: Install Dependencies

```bash
cd "/Users/dylan/Documents/Social pay"
npm install
```

## Step 2: Set Up Supabase

### Create a New Project

1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Fill in the project details:
   - Organization: Select or create one
   - Name: `socialpay`
   - Database Password: Generate a secure password (save this!)
   - Region: Choose the closest region
4. Click "Create new project" and wait for it to be ready

### Run the Database Migration

1. In your Supabase dashboard, go to **SQL Editor**
2. Click "New query"
3. Copy the entire contents of `supabase/migrations/001_initial_schema.sql`
4. Paste it into the SQL editor
5. Click "Run" to execute the migration

### Configure Authentication

1. Go to **Authentication** > **Providers**
2. Ensure **Email** provider is enabled
3. (Optional) Disable email confirmation for development:
   - Go to **Authentication** > **Settings**
   - Under "Email Auth", turn off "Enable email confirmations"

### Get API Keys

1. Go to **Settings** > **API**
2. Copy the following values:
   - **Project URL** (under "Project URL")
   - **anon public** key (under "Project API keys")

## Step 3: Configure Environment Variables

1. Copy the example environment file:
   ```bash
   cp .env.local.example .env.local
   ```

2. Edit `.env.local` and add your Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```

## Step 4: Run the Development Server

```bash
npm run dev
```

The app will be available at http://localhost:3000

## Step 5: Test the Application

1. **Sign Up as a Creator**
   - Go to http://localhost:3000/auth/signup
   - Select "Creator" tab
   - Enter your details and create an account

2. **Sign Up as a Brand** (in a different browser/incognito)
   - Go to http://localhost:3000/auth/signup?type=brand
   - Select "Brand" tab
   - Enter company details and create an account

3. **Create a Campaign** (as Brand)
   - Go to Dashboard > Create Campaign
   - Fill in campaign details
   - Save the campaign

4. **Browse & Apply** (as Creator)
   - Go to Campaigns
   - Find the campaign
   - Apply to participate

## Building for Production

```bash
npm run build
```

This will generate a static export in the `out/` directory.

## Deploying to Vercel

1. Push your code to GitHub
2. Go to https://vercel.com/new
3. Import your GitHub repository
4. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Deploy!

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── auth/              # Authentication pages
│   ├── campaigns/         # Campaign management
│   ├── dashboard/         # Creator & Brand dashboards
│   ├── earnings/          # Earnings page (creators)
│   └── profile/           # Profile settings
├── components/
│   ├── auth/              # Auth-related components
│   ├── layout/            # Layout components
│   └── ui/                # UI components (shadcn/ui)
├── contexts/              # React contexts
├── lib/                   # Utilities and Supabase client
└── types/                 # TypeScript types

supabase/
└── migrations/            # SQL migrations
```

## Next Steps

After the initial setup, you may want to:

1. **Add Social Media API Integration** - Connect TikTok, YouTube, and Instagram APIs to automatically track post metrics
2. **Implement Payment Processing** - Integrate Stripe for automated payouts
3. **Add Real-time Updates** - Use Supabase realtime subscriptions for live metrics
4. **Build Mobile App** - Use Capacitor to convert to iOS/Android apps

## Troubleshooting

### "Missing Supabase environment variables"
- Make sure `.env.local` exists and contains the correct values
- Restart the development server after changing environment variables

### Authentication not working
- Check that email provider is enabled in Supabase
- Verify your Supabase URL and anon key are correct
- Check browser console for specific errors

### Database errors
- Make sure the SQL migration ran successfully
- Check that all tables were created in the Supabase Table Editor

### Build errors
- Run `npm install` to ensure all dependencies are installed
- Check for TypeScript errors with `npm run lint`

## Support

For issues with this project, check the code or create a new issue.

For Supabase-specific issues, see https://supabase.com/docs
