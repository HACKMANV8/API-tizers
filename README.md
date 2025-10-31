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

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login user
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/logout` - Logout user
- `GET /api/v1/auth/verify-email/:token` - Verify email
- `POST /api/v1/auth/forgot-password` - Request password reset
- `POST /api/v1/auth/reset-password` - Reset password
- `POST /api/v1/auth/change-password` - Change password (authenticated)
- `GET /api/v1/auth/profile` - Get user profile (authenticated)

### Platform Integrations
(Routes to be implemented - services are ready)
- `GET /api/v1/platforms` - List connected platforms
- `POST /api/v1/platforms/connect/:platform` - Connect platform
- `DELETE /api/v1/platforms/disconnect/:id` - Disconnect platform
- `POST /api/v1/platforms/sync/:platform` - Trigger sync
- `GET /api/v1/platforms/status` - Get sync status

### Analytics
(Routes to be implemented - services are ready)
- `GET /api/v1/analytics/heatmap` - Get activity heatmap
- `GET /api/v1/analytics/streaks` - Get streak information
- `GET /api/v1/analytics/points` - Get points breakdown

### Missions
(Routes to be implemented - services are ready)
- `GET /api/v1/missions/daily` - Get daily missions
- `GET /api/v1/missions/weekly` - Get weekly missions
- `POST /api/v1/missions/claim/:id` - Claim mission reward

### Leaderboard
(Routes to be implemented - services are ready)
- `GET /api/v1/leaderboard/:period` - Get leaderboard (daily/weekly/monthly/all-time)
- `GET /api/v1/leaderboard/rank/:userId` - Get user rank

## Development Workflow

### Testing
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm test -- --coverage
```

### Linting & Formatting
```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format
```

### Database Operations
```bash
# Generate Prisma client after schema changes
npm run prisma:generate

# Create new migration
npm run prisma:migrate

# Open Prisma Studio (database GUI)
npm run prisma:studio

# Seed database with sample data
npm run prisma:seed
```

## Implementation Status

### ✅ Completed
- Project structure and configuration
- Authentication system (JWT, OAuth2, password reset)
- All 7 platform integrations (GitHub, LeetCode, Codeforces - fully implemented)
- Background sync system with Bull queue
- Analytics module (heatmap, streaks, points)
- Mission system
- Leaderboard system
- Base utilities and middleware
- Database schema with Prisma
- Error handling and logging
- Request validation
- Rate limiting

### 🚧 TODO
- Complete OAuth2 flows for Google/GitHub
- API routes for platforms, analytics, missions, leaderboard
- Calendar integrations (Google, Microsoft)
- OpenProject and Slack integrations
- Portfolio generation system
- Socket.io for real-time updates
- Email service integration
- Comprehensive test suite
- Docker configuration
- CI/CD pipeline

## Platform Integrations

### Fully Implemented
- **GitHub**: Commits, PRs, issues, reviews, repository stats, language breakdown
- **LeetCode**: Problems solved, contest participation, rating, difficulty breakdown
- **Codeforces**: Submissions, contests, rating, ranking

### Stub Implementations (Ready to Expand)
- **Google Calendar**: Event fetching, task creation
- **Microsoft Calendar**: Event fetching via Graph API
- **OpenProject**: Work package management
- **Slack**: Message tracking, reminder management

## Background Jobs

The application uses Bull queues for background processing:

- **Platform Sync Jobs**: Periodic data synchronization from platforms
- **Stats Calculation Jobs**: Activity heatmap and points calculation
- **Mission Progress Jobs**: Track and update mission progress (planned)
- **Leaderboard Update Jobs**: Refresh leaderboard rankings (planned)

## Points System

Activity-based points with weighted scoring:
- GitHub Commit: 5 points
- GitHub PR: 20 points
- GitHub Issue: 10 points
- Code Review: 15 points
- LeetCode Easy: 10 points
- LeetCode Medium: 20 points
- LeetCode Hard: 40 points
- Task Completed: 5 points
- Daily Mission: 50 points
- Weekly Mission: 100 points
- Streak Bonuses: 7 days (100), 30 days (500), 100 days (2000)

## Contributing

1. Create a feature branch
2. Make your changes
3. Write/update tests
4. Run linting and tests
5. Submit a pull request

## License

MIT

## Support

For issues and questions, please open a GitHub issue.
