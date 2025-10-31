/**
 * Express Application Setup
 *
 * Configures Express middleware and routes
 */

import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import logger from './utils/logger';

// Import routes
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import accountRoutes from './routes/accounts';
import snapshotRoutes from './routes/snapshots';
import leaderboardRoutes from './routes/leaderboard';
import projectRoutes from './routes/projects';
import streakRoutes from './routes/streaks';
import integrationRoutes from './routes/integrations';

const app: Application = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  })
);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(
    morgan('combined', {
      stream: {
        write: (message: string) => logger.info(message.trim()),
      },
    })
  );
}

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Prism API is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API routes
const API_PREFIX = process.env.API_PREFIX || '/api';

app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/users`, userRoutes);
app.use(`${API_PREFIX}/accounts`, accountRoutes);
app.use(`${API_PREFIX}/snapshots`, snapshotRoutes);
app.use(`${API_PREFIX}/leaderboard`, leaderboardRoutes);
app.use(`${API_PREFIX}/projects`, projectRoutes);
app.use(`${API_PREFIX}/streaks`, streakRoutes);
app.use(`${API_PREFIX}/integrations`, integrationRoutes);

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    name: 'Prism API',
    version: '1.0.0',
    description: 'Developer productivity tracking platform',
    endpoints: {
      health: '/health',
      auth: `${API_PREFIX}/auth`,
      users: `${API_PREFIX}/users`,
      accounts: `${API_PREFIX}/accounts`,
      snapshots: `${API_PREFIX}/snapshots`,
      leaderboard: `${API_PREFIX}/leaderboard`,
      projects: `${API_PREFIX}/projects`,
      streaks: `${API_PREFIX}/streaks`,
      integrations: `${API_PREFIX}/integrations`,
    },
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.path,
  });
});

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error:', err);

  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

export default app;
