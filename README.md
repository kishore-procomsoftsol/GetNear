# GetNear V1

A hyperlocal discovery platform that connects customers with nearby businesses — restaurants, cafes, hospitals, pharmacies, gyms, and local services — through location-aware search and rich listing pages.

## Architecture

GetNear is a Turborepo monorepo with the following structure:

```
getnear/
├── apps/
│   ├── web/          # Customer + Business Next.js 14 app (Vercel)
│   └── admin/        # Admin panel Next.js 14 app (Vercel)
├── packages/
│   ├── types/        # Shared TypeScript interfaces
│   ├── validation/   # Shared Zod validation schemas
│   └── config/       # Shared constants (categories, limits, etc.)
└── supabase/
    ├── migrations/   # SQL migration files
    └── functions/    # Supabase Edge Functions
```

**Stack:**
- **Frontend:** Next.js 14 App Router, Tailwind CSS, shadcn/ui, Zustand, Framer Motion
- **Backend:** Node.js + Express REST API (Railway)
- **Database:** Supabase (PostgreSQL + PostGIS + RLS)
- **Auth:** Supabase Auth (OTP via Twilio, Google OAuth)
- **Storage:** Supabase Storage (CDN via Cloudflare)
- **Maps:** Google Maps API
- **Realtime:** Supabase Realtime (WebSocket)

## Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- [Supabase CLI](https://supabase.com/docs/guides/cli) (for local development)
- A Supabase project
- Twilio account with Verify service
- Google Cloud project with Maps & OAuth credentials

## Getting Started

### 1. Clone and install dependencies

```bash
git clone https://github.com/your-org/getnear.git
cd getnear
npm install
```

### 2. Configure environment variables

Copy the example env file and fill in your credentials:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your actual values. See `.env.example` for all required variables.

### 3. Set up Supabase locally

```bash
# Start local Supabase instance
supabase start

# Run migrations
supabase db reset
```

### 4. Start development servers

```bash
# Start all apps in parallel
npm run dev

# Or start individual apps
cd apps/web && npm run dev      # http://localhost:3000
cd apps/admin && npm run dev    # http://localhost:3001
```

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start all apps in development mode |
| `npm run build` | Build all apps and packages |
| `npm run lint` | Lint all packages |
| `npm run test` | Run all tests |
| `npm run type-check` | TypeScript type checking across all packages |
| `npm run clean` | Remove all build artifacts and node_modules |

## Environment Variables

See `.env.example` for the full list of required environment variables:

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anonymous (public) key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) |
| `TWILIO_ACCOUNT_SID` | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | Twilio auth token |
| `TWILIO_VERIFY_SID` | Twilio Verify service SID |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Maps API key (public) |
| `SENTRY_DSN` | Sentry DSN for error monitoring |
| `RESEND_API_KEY` | Resend API key for transactional email |

## User Roles

- **Customer** — discovers and saves nearby places, writes reviews, books appointments
- **Business Owner** — lists and manages their business, tracks leads and analytics
- **Admin** — moderates listings, manages users, oversees platform health

## GetNear Plus

GetNear Plus is the paid subscription tier. Free-tier limits:
- Max 10 saved places
- Max 2 collections
- Max 10 km search radius
- Max 7 days analytics history

## Contributing

1. Create a feature branch from `main`
2. Make your changes
3. Run `npm run lint && npm run type-check && npm run test`
4. Open a pull request

## License

Private — All rights reserved.
