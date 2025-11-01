import dotenv from 'dotenv';

dotenv.config({ override: true });

export const config = {
  // Server
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  apiVersion: process.env.API_VERSION || 'v1',

  // Database
  databaseUrl: process.env.DATABASE_URL!,

  // Redis
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET!,
    refreshSecret: process.env.JWT_REFRESH_SECRET!,
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  // OAuth
  github: {
    clientId: process.env.GITHUB_CLIENT_ID!,
    clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    callbackURL: process.env.GITHUB_CALLBACK_URL!,
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    callbackURL: process.env.GOOGLE_CALLBACK_URL!,
  },

  // Platform APIs
  platforms: {
    leetcode: {
      apiUrl: process.env.LEETCODE_API_URL || 'https://leetcode.com/graphql',
    },
    codeforces: {
      apiKey: process.env.CODEFORCES_API_KEY,
      apiSecret: process.env.CODEFORCES_API_SECRET,
      apiUrl: process.env.CODEFORCES_API_URL || 'https://codeforces.com/api',
    },
    openproject: {
      apiUrl: process.env.OPENPROJECT_API_URL,
      apiKey: process.env.OPENPROJECT_API_KEY,
    },
    slack: {
      botToken: process.env.SLACK_BOT_TOKEN,
      signingSecret: process.env.SLACK_SIGNING_SECRET,
      clientId: process.env.SLACK_CLIENT_ID,
      clientSecret: process.env.SLACK_CLIENT_SECRET,
    },
    microsoft: {
      clientId: process.env.MS_GRAPH_CLIENT_ID,
      clientSecret: process.env.MS_GRAPH_CLIENT_SECRET,
      tenantId: process.env.MS_GRAPH_TENANT_ID,
      redirectUri: process.env.MS_GRAPH_REDIRECT_URI,
    },
  },

  // Email
  email: {
    service: process.env.EMAIL_SERVICE || 'smtp',
    host: process.env.EMAIL_HOST!,
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
    secure: process.env.EMAIL_SECURE === 'true',
    user: process.env.EMAIL_USER!,
    password: process.env.EMAIL_PASSWORD!,
    from: process.env.EMAIL_FROM || 'noreply@prism.com',
  },

  // Queue
  queue: {
    redisUrl: process.env.QUEUE_REDIS_URL || process.env.REDIS_URL || 'redis://localhost:6379',
    concurrency: parseInt(process.env.QUEUE_CONCURRENCY || '5', 10),
    maxAttempts: parseInt(process.env.QUEUE_MAX_ATTEMPTS || '3', 10),
  },

  // Portfolio
  portfolio: {
    deploymentServiceUrl: process.env.DEPLOYMENT_SERVICE_URL,
    domainProviderApi: process.env.DOMAIN_PROVIDER_API,
    storagePath: process.env.PORTFOLIO_STORAGE_PATH || '/var/www/portfolios',
    baseUrl: process.env.PORTFOLIO_BASE_URL || 'https://portfolios.prism.com',
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },

  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:8080',
    credentials: process.env.CORS_CREDENTIALS === 'true',
  },

  // Security
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '10', 10),
    cookieSecret: process.env.COOKIE_SECRET!,
    sessionSecret: process.env.SESSION_SECRET!,
  },

  // Feature Flags
  features: {
    socketIO: process.env.ENABLE_SOCKET_IO === 'true',
    missions: process.env.ENABLE_MISSIONS === 'true',
    leaderboard: process.env.ENABLE_LEADERBOARD === 'true',
    portfolioGeneration: process.env.ENABLE_PORTFOLIO_GENERATION === 'true',
  },

  // Sync Intervals (in milliseconds)
  syncIntervals: {
    github: parseInt(process.env.SYNC_GITHUB_INTERVAL || '3600000', 10),
    leetcode: parseInt(process.env.SYNC_LEETCODE_INTERVAL || '3600000', 10),
    codeforces: parseInt(process.env.SYNC_CODEFORCES_INTERVAL || '3600000', 10),
    calendar: parseInt(process.env.SYNC_CALENDAR_INTERVAL || '1800000', 10),
    openproject: parseInt(process.env.SYNC_OPENPROJECT_INTERVAL || '3600000', 10),
    slack: parseInt(process.env.SYNC_SLACK_INTERVAL || '1800000', 10),
  },
};

// Validate required config
const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET'];

requiredEnvVars.forEach((envVar) => {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
});

export default config;
