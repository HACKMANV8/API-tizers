# Prism - Developer Productivity Platform

A minimal, production-ready boilerplate for tracking developer productivity across multiple coding platforms (LeetCode, Codeforces, GitHub, etc.), featuring leaderboards, project management, and integrations.

## Features

- **Multi-platform Integration**: Link accounts from LeetCode, Codeforces, CodeChef, AtCoder, and GitHub
- **Smart Leaderboard**: Normalized scoring system with platform-specific weights and real-time ranking
- **Activity Tracking**: Streak tracking, task management, and productivity metrics
- **Project Management**: Create projects, deploy requests, and use reusable templates
- **External Integrations**: Connect GitHub, Slack, Notion, and other services
- **Background Workers**: Automatic leaderboard computation and platform syncing
- **RESTful API**: Complete Express/TypeScript backend with JWT authentication
- **Caching**: Redis-based caching for high-performance leaderboard queries
- **Type-safe**: Full TypeScript with Prisma ORM

## Tech Stack

- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js + TypeScript + Express
- **Database**: PostgreSQL with Prisma ORM
- **Cache**: Redis
- **Auth**: JWT with bcrypt password hashing
- **Testing**: Jest
- **Container**: Docker + Docker Compose

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for local development)

### 1. Clone and Start

```bash
# Start all services (PostgreSQL, Redis, Backend, Frontend)
docker compose up --build
```

**Access the application:**
- **Frontend**: http://localhost:3001
- **Backend API**: http://localhost:3000/api

### 2. Initialize Database

```bash
# In a new terminal, access the backend container
docker exec -it prism-backend sh

# Run Prisma migrations
npx prisma migrate dev

# Seed the database with sample data
npm run seed
```

### 3. Use the Application

Open your browser to **http://localhost:3001** and log in with one of the test accounts:

- **alice@prism.dev** / password123 (User with high LeetCode score)
- **bob@prism.dev** / password123 (User with Codeforces account)
- **charlie@prism.dev** / password123 (Admin user)

**Features to explore:**
- Dashboard: View your profile and link platform accounts
- Leaderboard: See rankings across all users
- Navigation: Fully responsive UI with React Router

## API Documentation

### Base URL

```
http://localhost:3000/api
```

### Authentication

#### Register

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "username": "myusername",
    "password": "securepassword123"
  }'
```

#### Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@prism.dev",
    "password": "password123"
  }'
```

Response includes a JWT token. Use it in subsequent requests:

```bash
export TOKEN="your-jwt-token-here"
```

### User Profile

#### Get Current User

```bash
curl http://localhost:3000/api/users/me \
  -H "Authorization: Bearer $TOKEN"
```

#### Update Profile

```bash
curl -X PUT http://localhost:3000/api/users/me \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "newusername"
  }'
```

### Platform Accounts

#### Link Account

```bash
curl -X POST http://localhost:3000/api/accounts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "LEETCODE",
    "accountId": "my-leetcode-username",
    "config": {}
  }'
```

Supported platforms: `LEETCODE`, `CODEFORCES`, `CODECHEF`, `ATCODER`, `GITHUB`

#### Get Linked Accounts

```bash
curl http://localhost:3000/api/accounts \
  -H "Authorization: Bearer $TOKEN"
```

### Platform Snapshots

#### Create Snapshot

```bash
curl -X POST http://localhost:3000/api/snapshots \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userAccountId": "account-uuid-here",
    "metrics": {
      "problemsSolved": 450,
      "rating": 2100,
      "contests": 25
    }
  }'
```

#### Get User Snapshots

```bash
curl "http://localhost:3000/api/snapshots/user-id-here?platform=LEETCODE&limit=10"
```

### Leaderboard

#### Get Leaderboard

```bash
# Global leaderboard
curl "http://localhost:3000/api/leaderboard?limit=50&offset=0"

# Platform-specific leaderboard
curl "http://localhost:3000/api/leaderboard?platform=LEETCODE&limit=20"
```

#### Compute Leaderboard (Admin)

```bash
curl -X POST http://localhost:3000/api/leaderboard/compute \
  -H "X-Admin-Key: admin-secret-key-change-this"
```

### Projects

#### Create Project

```bash
curl -X POST http://localhost:3000/api/projects \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Awesome Project",
    "description": "A cool web app",
    "config": {"framework": "nextjs"}
  }'
```

#### List Projects

```bash
curl http://localhost:3000/api/projects \
  -H "Authorization: Bearer $TOKEN"
```

#### Create Deploy Request

```bash
curl -X POST http://localhost:3000/api/projects/project-id-here/deploy \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "config": {"branch": "main", "environment": "production"}
  }'
```

### Streaks

#### Record Activity

```bash
curl -X POST http://localhost:3000/api/streaks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "activityType": "coding",
    "metadata": {"duration": 120}
  }'
```

#### Get User Streaks

```bash
curl "http://localhost:3000/api/streaks/user-id-here?startDate=2024-01-01&endDate=2024-12-31"
```

### Integrations

#### Connect Integration

```bash
curl -X POST http://localhost:3000/api/integrations/github/connect \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "config": {
      "accessToken": "github-token-here",
      "username": "myusername"
    }
  }'
```

Supported types: `github`, `gitlab`, `notion`, `slack`, `discord`, `jira`

## Development

### Local Development (without Docker)

#### Backend

```bash
cd backend

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env to point to local PostgreSQL and Redis
# DATABASE_URL=postgresql://user:password@localhost:5432/prism_db
# REDIS_URL=redis://localhost:6379

# Run migrations
npx prisma migrate dev

# Seed database
npm run seed

# Start development server
npm run dev
```

Backend will run on http://localhost:3000

#### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Start development server
npm run dev
```

Frontend will run on http://localhost:3001 with hot module replacement.

### Running Tests

```bash
cd backend
npm test

# With coverage
npm run test:coverage
```

### Prisma Studio (Database GUI)

```bash
cd backend
npx prisma studio
```

Opens at `http://localhost:5555`

## Environment Variables

All configuration is done via environment variables. See [backend/.env.example](backend/.env.example) for the complete list.

Key variables:

- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `JWT_SECRET` - Secret key for JWT signing
- `JWT_EXPIRES_IN` - Token expiration (e.g., "7d")
- `WORKER_ENABLED` - Enable/disable background worker
- `WORKER_INTERVAL_MS` - Worker execution interval (default: 300000 = 5 min)
- `ADMIN_API_KEY` - API key for admin endpoints

## Project Structure

```
prism/
├── docker-compose.yml           # Docker services configuration
├── backend/
│   ├── Dockerfile               # Multi-stage Docker build
│   ├── package.json             # Dependencies and scripts
│   ├── tsconfig.json            # TypeScript configuration
│   ├── jest.config.js           # Jest testing configuration
│   ├── .env.example             # Environment variables template
│   ├── prisma/
│   │   ├── schema.prisma        # Database models
│   │   └── seed.ts              # Database seeding script
│   ├── src/
│   │   ├── server.ts            # Server entry point
│   │   ├── app.ts               # Express app configuration
│   │   ├── db.ts                # Prisma client
│   │   ├── redis.ts             # Redis client
│   │   ├── auth/
│   │   │   ├── utils.ts         # JWT & bcrypt utilities
│   │   │   └── middleware.ts    # Auth middleware
│   │   ├── routes/              # API route handlers
│   │   │   ├── auth.ts
│   │   │   ├── users.ts
│   │   │   ├── accounts.ts
│   │   │   ├── snapshots.ts
│   │   │   ├── leaderboard.ts
│   │   │   ├── projects.ts
│   │   │   ├── streaks.ts
│   │   │   └── integrations.ts
│   │   ├── jobs/
│   │   │   └── worker.ts        # Background worker
│   │   └── utils/
│   │       ├── logger.ts        # Winston logger
│   │       └── scoring.ts       # Normalization & ranking
│   └── tests/                   # Jest tests
│       ├── auth.test.ts
│       ├── scoring.test.ts
│       └── leaderboard.test.ts
├── frontend/
│   ├── Dockerfile               # Multi-stage Docker build
│   ├── package.json             # Dependencies and scripts
│   ├── tsconfig.json            # TypeScript configuration
│   ├── vite.config.ts           # Vite build configuration
│   ├── tailwind.config.js       # Tailwind CSS configuration
│   ├── nginx.conf               # Nginx server configuration
│   ├── index.html               # HTML entry point
│   ├── .env.example             # Environment variables template
│   └── src/
│       ├── main.tsx             # React entry point
│       ├── App.tsx              # Main app component with routing
│       ├── api/
│       │   └── client.ts        # Axios API client
│       ├── contexts/
│       │   └── AuthContext.tsx  # Authentication state management
│       ├── components/
│       │   ├── Navbar.tsx       # Navigation bar
│       │   └── ProtectedRoute.tsx # Route protection
│       ├── pages/
│       │   ├── Login.tsx        # Login page
│       │   ├── Register.tsx     # Registration page
│       │   ├── Dashboard.tsx    # User dashboard
│       │   └── Leaderboard.tsx  # Leaderboard view
│       └── styles/
│           └── index.css        # Tailwind styles
└── README.md                    # This file
```

## Extension Guide

### Adding GitHub OAuth

1. **Register OAuth App** in GitHub Developer Settings
2. **Store credentials** in `.env`:
   ```
   GITHUB_CLIENT_ID=your-client-id
   GITHUB_CLIENT_SECRET=your-client-secret
   ```

3. **Create OAuth route** in `src/routes/auth.ts`:
   ```typescript
   router.get('/github', (req, res) => {
     const authUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}`;
     res.redirect(authUrl);
   });

   router.get('/github/callback', async (req, res) => {
     const { code } = req.query;
     // Exchange code for access token
     // Store token in Integration table
   });
   ```

4. **Update Integration model** to store OAuth tokens securely (consider encrypting sensitive fields)

### Implementing Real Platform Scrapers

#### LeetCode

Replace placeholder in `src/jobs/worker.ts`:

```typescript
export async function fetchLeetCodeSnapshot(userAccountId: string): Promise<void> {
  const account = await prisma.userAccount.findUnique({
    where: { id: userAccountId }
  });

  // Use LeetCode GraphQL API
  const response = await fetch('https://leetcode.com/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `
        query getUserProfile($username: String!) {
          matchedUser(username: $username) {
            profile { ranking }
            submitStats {
              acSubmissionNum { difficulty count }
            }
          }
        }
      `,
      variables: { username: account.accountId }
    })
  });

  const data = await response.json();

  await prisma.platformSnapshot.create({
    data: {
      userAccountId,
      metrics: data.data.matchedUser,
      metricScore: normalizeMetric(data.data.matchedUser.profile.ranking, 0, 500000),
      recordedAt: new Date()
    }
  });
}
```

**Rate Limiting**: Use libraries like `p-limit` or `bottleneck`:

```typescript
import pLimit from 'p-limit';
const limit = pLimit(1); // 1 request per second

for (const account of accounts) {
  await limit(() => fetchLeetCodeSnapshot(account.id));
}
```

#### Codeforces

Use the [Codeforces API](https://codeforces.com/apiHelp):

```typescript
async function fetchCodeforcesSnapshot(userAccountId: string): Promise<void> {
  const account = await prisma.userAccount.findUnique({ where: { id: userAccountId } });

  const response = await fetch(
    `https://codeforces.com/api/user.info?handles=${account.accountId}`
  );
  const data = await response.json();

  if (data.status === 'OK') {
    const user = data.result[0];
    await prisma.platformSnapshot.create({
      data: {
        userAccountId,
        metrics: { rating: user.rating, maxRating: user.maxRating, rank: user.rank },
        metricScore: normalizeMetric(user.rating, 0, 4000),
        recordedAt: new Date()
      }
    });
  }
}
```

### Migrating to BullMQ for Job Queue

1. **Install BullMQ**:
   ```bash
   npm install bullmq
   ```

2. **Create queue** in `src/jobs/queue.ts`:
   ```typescript
   import { Queue, Worker } from 'bullmq';

   const leaderboardQueue = new Queue('leaderboard', {
     connection: { host: 'redis', port: 6379 }
   });

   const worker = new Worker('leaderboard', async (job) => {
     await computeLeaderboardCache();
   }, { connection: { host: 'redis', port: 6379 } });
   ```

3. **Replace interval-based worker** in `src/server.ts`:
   ```typescript
   // Instead of startWorker()
   import { leaderboardQueue } from './jobs/queue';

   // Schedule recurring job
   await leaderboardQueue.add('compute', {}, {
     repeat: { pattern: '*/5 * * * *' } // Every 5 minutes
   });
   ```

## Troubleshooting

### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker ps | grep prism-db

# View database logs
docker logs prism-db

# Connect to database manually
docker exec -it prism-db psql -U prism_user -d prism_db
```

### Redis Connection Issues

```bash
# Check Redis status
docker exec -it prism-redis redis-cli ping
# Should return: PONG

# View Redis logs
docker logs prism-redis
```

### Backend Not Starting

```bash
# View backend logs
docker logs prism-backend

# Rebuild backend
docker compose up --build backend
```

## License

MIT

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm test`
5. Submit a pull request

## Support

For issues or questions, please open a GitHub issue or contact the maintainers.