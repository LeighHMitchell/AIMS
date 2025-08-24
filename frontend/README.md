# AIMS Frontend

A Next.js application for Aid Information Management System (AIMS) built with React, TypeScript, and Supabase.

## Features

- **Activity Management**: Create, edit, and track development activities
- **Transaction Management**: Handle financial transactions and reporting
- **Organization Management**: Manage partner organizations and relationships
- **Analytics Dashboard**: Visualize aid data and trends
- **IATI Compliance**: Import/export IATI-compliant data
- **Multi-user Support**: Role-based access control

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Database**: Supabase (PostgreSQL)
- **Styling**: Tailwind CSS, Radix UI
- **Charts**: Recharts, D3.js
- **Maps**: Leaflet, Google Maps
- **Authentication**: Supabase Auth

## Quick Start

1. **Clone and Install**:
   ```bash
   cd frontend
   npm install
   ```

2. **Environment Setup**:
   ```bash
   cp env.example .env.local
   # Edit .env.local with your Supabase credentials
   ```

3. **Development**:
   ```bash
   npm run dev
   ```

4. **Build**:
   ```bash
   npm run build
   npm start
   ```

## Environment Variables

Required:
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key

Optional:
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` - For map functionality

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript checks

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

**Vercel Deployment**: 
- Connected to GitHub for automatic deployments
- Environment variables configured in Vercel dashboard
- Build command: `npm run build`

## Project Structure

```
src/
├── app/                 # Next.js App Router pages
├── components/          # Reusable React components
├── hooks/              # Custom React hooks
├── lib/                # Utility libraries
├── data/               # Static data and configurations
├── types/              # TypeScript type definitions
└── utils/              # Helper functions
```

## Development

### Code Quality
- TypeScript for type safety
- ESLint for code linting
- Prettier for code formatting
- Pre-commit hooks for quality checks

### Testing
- Jest for unit testing
- React Testing Library for component testing
- Run tests: `npm test`

### Database
- Supabase migrations in `supabase/migrations/`
- Database types generated automatically
- Real-time subscriptions for live updates

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## Deployment Status
Last deployed: 2025-06-30 20:30:00 UTC # Trigger rebuild Wed Jul  2 00:08:20 +07 2025
