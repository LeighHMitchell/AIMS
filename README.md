# AIMS - Aid Information Management System

A collaborative project management system for tracking development aid activities with multi-contributor support.

## Features

- 📊 Activity tracking and management
- 👥 Multi-contributor collaboration
- 🏛️ Government partner validation workflow
- 💰 Financial transaction tracking
- 📍 Geographic mapping of activities
- 📈 Analytics and reporting
- 🔒 Role-based access control

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes
- **Data Storage**: JSON files (development) - needs database for production
- **Maps**: Google Maps API

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Google Maps API key

### Installation

1. Clone the repository:
```bash
git clone https://github.com/LeighHMitchell/AIMS.git
cd AIMS
```

2. Install dependencies:
```bash
cd frontend
npm install
```

3. Create a `.env.local` file:
```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Deployment

See [frontend/DEPLOYMENT_GUIDE.md](frontend/DEPLOYMENT_GUIDE.md) for detailed deployment instructions.

### Quick Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/LeighHMitchell/AIMS)

## Project Structure

```
AIMS/
├── frontend/          # Next.js application
│   ├── src/
│   │   ├── app/      # App router pages
│   │   ├── components/
│   │   ├── lib/      # Utilities
│   │   └── types/    # TypeScript types
│   └── data/         # JSON data files
├── projects/         # Django backend (legacy)
└── templates/        # Django templates (legacy)
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Contact

Leigh Mitchell - [@LeighHMitchell](https://github.com/LeighHMitchell)

Project Link: [https://github.com/LeighHMitchell/AIMS](https://github.com/LeighHMitchell/AIMS) 