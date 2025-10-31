# API-tizers
# Prism Backend - Developer Analytics Dashboard

A comprehensive backend boilerplate for Prism, a unified developer analytics dashboard that aggregates data from multiple platforms (GitHub, LeetCode, Codeforces, Google Calendar, Microsoft Calendar, OpenProject, Slack) into a single interactive interface.

## Features

### Core Functionality
- **Multi-Platform Integration**: Connect and sync data from 7+ platforms
- **Activity Tracking**: Real-time activity heatmap with contribution tracking
- **Streak System**: Calculate and maintain daily activity streaks
- **Points & Gamification**: Weighted scoring system with rewards
- **Mission System**: Daily and weekly challenges with point rewards
- **Leaderboard**: Period-based rankings (daily, weekly, monthly, all-time)
- **Portfolio Generation**: Customizable developer portfolio templates
- **Background Sync**: Queue-based data synchronization with Bull/Redis

### Authentication & Security
- JWT-based authentication with refresh tokens
- Password hashing with bcrypt
- Email verification and password reset
- Rate limiting on sensitive endpoints
- OAuth2 support for GitHub and Google
- CORS and Helmet security middleware

## Tech Stack

- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Caching**: Redis (ioredis)
- **Queue**: Bull for background job processing
- **Authentication**: JWT + Passport.js
- **Validation**: express-validator
- **Logging**: Winston with daily log rotation
- **Testing**: Jest + Supertest
- **Code Quality**: ESLint + Prettier

## Project Structure

```
src/
├── auth/                    # Authentication services
│   ├── jwt.service.ts      # JWT token generation/verification
│   └── password.service.ts # Password hashing/validation
├── config/                  # Configuration files
│   ├── database.ts         # Prisma client setup
│   ├── redis.ts            # Redis connection
│   └── index.ts            # Environment configuration
├── controllers/             # Route controllers
│   └── auth.controller.ts
├── integrations/            # Platform integrations
│   ├── github.integration.ts
│   ├── leetcode.integration.ts
│   ├── codeforces.integration.ts
│   ├── google-calendar.integration.ts
│   ├── microsoft-calendar.integration.ts
│   ├── openproject.integration.ts
│   ├── slack.integration.ts
│   └── integration.manager.ts
├── middleware/              # Express middleware
│   ├── auth.middleware.ts  # JWT authentication
│   ├── error.middleware.ts # Error handling
│   ├── rate-limit.middleware.ts
│   └── validation.middleware.ts
├── models/                  # Database models (Prisma)
├── routes/                  # API routes
│   └── auth.routes.ts
├── services/                # Business logic
│   ├── analytics/          # Analytics services
│   │   ├── heatmap.service.ts
│   │   ├── streaks.service.ts
│   │   └── points.service.ts
│   ├── missions/           # Mission system
│   │   └── mission.service.ts
│   ├── leaderboard/        # Leaderboard rankings
│   │   └── leaderboard.service.ts
│   ├── auth.service.ts
│   └── sync.service.ts
├── sync/                    # Background sync system
│   ├── queue.manager.ts    # Bull queue manager
│   └── queue.processor.ts  # Job processors
├── utils/                   # Utilities
│   ├── base-controller.ts
│   ├── base-service.ts
│   ├── base-integration.ts
│   ├── errors.ts           # Custom error classes
│   ├── logger.ts           # Winston logger
│   └── response.ts         # Response formatter
├── validators/              # Request validators
│   └── auth.validator.ts
├── app.ts                   # Express app setup
└── server.ts               # Server entry point
```

## Database Schema

The application uses Prisma ORM with PostgreSQL. Key models include:

- **users**: User accounts and profile data
- **platform_connections**: Connected platform accounts (GitHub, LeetCode, etc.)
- **github_stats**: Daily GitHub activity statistics
- **cp_stats**: Competitive programming statistics (LeetCode, Codeforces)
- **tasks**: Task management from various platforms
- **activity_heatmap**: Daily activity aggregation
- **missions**: Available daily/weekly missions
- **user_missions**: User mission progress and completion
- **leaderboard**: Cached leaderboard rankings
- **portfolio_templates**: Portfolio template configurations
- **user_portfolios**: User-generated portfolios
- **sync_jobs**: Background synchronization job tracking

## Setup Instructions

### Prerequisites
- Node.js >= 18.0.0
- PostgreSQL >= 14
- Redis >= 6.0

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd API-tizers
```

2. **Install dependencies**
```bash
npm install
```

3. **Setup environment variables**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Setup database**
```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Seed database
npm run prisma:seed
```

5. **Start development server**
```bash
npm run dev
```

The server will start on `http://localhost:5000`

### Running in Production

```bash
# Build TypeScript
npm run build

# Start production server
npm start
```

## Environment Variables

See [.env.example](.env.example) for all available configuration options. Key variables:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/prism

# Redis
REDIS_URL=redis://localhost:6379

# JWT Secrets
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret

# OAuth (Optional)
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```



MIT

## Support

For issues and questions, please open a GitHub issue.
