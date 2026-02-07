# Paceful

[![CI](https://github.com/your-org/paceful-app/actions/workflows/ci.yml/badge.svg)](https://github.com/your-org/paceful-app/actions/workflows/ci.yml)

AI-powered emotional recovery platform that helps people heal from breakups with personalized predictions, cohort-based insights, and a path to emotional readiness.

## Features

- **Emotional Readiness Score (ERS)** - Proprietary 0-100 score measuring recovery progress
- **Cohort-Based Predictions** - ML predictions for timelines, outcomes, and risks
- **B2B API** - Enterprise API for wellness platforms and HR systems
- **Mood & Journal Tracking** - Daily check-ins with sentiment analysis

## Getting Started

### Prerequisites

- Node.js 20+
- npm or yarn
- Supabase account

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/paceful-app.git
cd paceful-app

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Run development server
npm run dev
```

### Environment Variables

Create a `.env.local` file with:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm test` | Run Jest unit tests |
| `npm run test:coverage` | Run tests with coverage |
| `npm run test:e2e` | Run Playwright E2E tests |
| `npm run test:e2e:ui` | Run E2E tests with UI |

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (marketing)/        # Public landing pages
│   ├── admin/              # Admin dashboards
│   ├── api/                # API routes
│   │   └── b2b/            # B2B API endpoints
│   ├── investors/          # Investor pitch deck
│   └── ...
├── components/             # React components
├── lib/                    # Utilities and helpers
│   ├── demo-mode.ts        # Demo mode utilities
│   ├── ers-calculator.ts   # ERS score calculation
│   ├── pdf-export.ts       # PDF export functionality
│   ├── webhooks.ts         # Webhook system
│   └── ...
└── hooks/                  # Custom React hooks
```

## B2B API

The B2B API provides access to anonymized prediction data for enterprise partners.

### Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/b2b/predictions?endpoint=health` | GET | API health check |
| `/api/b2b/predictions?endpoint=aggregate` | GET | Aggregate statistics |
| `/api/b2b/predictions?endpoint=individual` | POST | Individual predictions |

### Authentication

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  https://app.paceful.com/api/b2b/predictions?endpoint=health
```

See `/api-docs` for full documentation.

## Testing

### Unit Tests (Jest)

```bash
npm test
npm run test:coverage
```

### E2E Tests (Playwright)

```bash
npm run test:e2e
npm run test:e2e:ui  # Interactive mode
```

## Deployment

The app is configured for deployment on Vercel:

1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy

## License

Copyright 2026 Paceful, Inc. All rights reserved.
