/**
 * Integration Routes
 *
 * Handles external service integrations and webhook receivers
 */

import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import prisma from '../db';
import { authenticate } from '../auth/middleware';
import logger from '../utils/logger';

const router = Router();

/**
 * POST /api/integrations/:type/connect
 * Connect an external integration
 *
 * Supported types: github, gitlab, notion, slack, discord
 *
 * TODO: Implement OAuth flows for each integration type
 * TODO: Securely store API keys/tokens using encryption
 * TODO: Add integration health checks and auto-refresh for expired tokens
 * TODO: Add webhook setup for real-time updates
 */
router.post(
  '/:type/connect',
  authenticate,
  [body('config').isObject()],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, errors: errors.array() });
        return;
      }

      if (!req.user) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }

      const { type } = req.params;
      const { config } = req.body;

      // Validate integration type
      const validTypes = ['github', 'gitlab', 'notion', 'slack', 'discord', 'jira'];
      if (!validTypes.includes(type)) {
        res.status(400).json({
          success: false,
          message: `Invalid integration type. Supported: ${validTypes.join(', ')}`,
        });
        return;
      }

      // Check if integration already exists
      const existing = await prisma.integration.findUnique({
        where: {
          userId_type: {
            userId: req.user.userId,
            type,
          },
        },
      });

      let integration;
      if (existing) {
        // Update existing
        integration = await prisma.integration.update({
          where: { id: existing.id },
          data: {
            config,
            isActive: true,
          },
        });
        logger.info(`Integration updated: ${type} for ${req.user.email}`);
      } else {
        // Create new
        integration = await prisma.integration.create({
          data: {
            userId: req.user.userId,
            type,
            config,
            isActive: true,
          },
        });
        logger.info(`Integration created: ${type} for ${req.user.email}`);
      }

      res.status(existing ? 200 : 201).json({
        success: true,
        message: `${type} integration ${existing ? 'updated' : 'connected'} successfully`,
        data: { integration },
      });
    } catch (error) {
      logger.error('Connect integration error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
);

/**
 * GET /api/integrations
 * Get all integrations for the current user
 */
router.get('/', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const integrations = await prisma.integration.findMany({
      where: { userId: req.user.userId },
      select: {
        id: true,
        type: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        // Don't expose sensitive config data
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: { integrations } });
  } catch (error) {
    logger.error('Get integrations error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * DELETE /api/integrations/:integrationId
 * Disconnect an integration
 */
router.delete(
  '/:integrationId',
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }

      const { integrationId } = req.params;

      const integration = await prisma.integration.findFirst({
        where: {
          id: integrationId,
          userId: req.user.userId,
        },
      });

      if (!integration) {
        res.status(404).json({ success: false, message: 'Integration not found' });
        return;
      }

      await prisma.integration.delete({ where: { id: integrationId } });

      logger.info(`Integration disconnected: ${integration.type} for ${req.user.email}`);
      res.json({ success: true, message: 'Integration disconnected successfully' });
    } catch (error) {
      logger.error('Disconnect integration error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
);

/**
 * POST /api/integrations/tasks/webhook
 * Generic webhook receiver for task/activity updates
 *
 * This is a simple receiver that can be extended to handle:
 * - GitHub webhook events (push, PR, issue updates)
 * - GitLab webhook events
 * - Jira task updates
 * - Custom platform webhooks
 *
 * TODO: Add webhook signature verification for security
 * TODO: Implement platform-specific payload parsing
 * TODO: Add webhook event processing queue (e.g., BullMQ)
 * TODO: Create task records from webhook data
 */
router.post('/tasks/webhook', async (req: Request, res: Response): Promise<void> => {
  try {
    const payload = req.body;
    const source = req.headers['x-webhook-source'] || 'unknown';

    // Log webhook receipt
    logger.info(`Webhook received from ${source}`, {
      headers: req.headers,
      payloadKeys: Object.keys(payload),
    });

    // TODO: Parse webhook payload based on source
    // TODO: Validate webhook signature
    // TODO: Create or update tasks/activities based on webhook data

    // Placeholder response
    res.json({
      success: true,
      message: 'Webhook received',
      data: {
        source,
        receivedAt: new Date(),
      },
    });
  } catch (error) {
    logger.error('Webhook processing error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * GET /api/integrations/github/repos
 * Example: Fetch GitHub repositories for connected account
 *
 * TODO: Implement actual GitHub API integration
 * TODO: Use stored OAuth token from integration config
 * TODO: Add pagination support
 * TODO: Cache results in Redis
 */
router.get(
  '/github/repos',
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }

      // Check if GitHub integration exists
      const integration = await prisma.integration.findUnique({
        where: {
          userId_type: {
            userId: req.user.userId,
            type: 'github',
          },
        },
      });

      if (!integration || !integration.isActive) {
        res.status(404).json({
          success: false,
          message: 'GitHub integration not found or inactive',
        });
        return;
      }

      // TODO: Use GitHub API with stored token
      // const token = integration.config.access_token;
      // const repos = await fetchGitHubRepos(token);

      // Placeholder response
      res.json({
        success: true,
        message: 'GitHub integration active (API call not implemented)',
        data: {
          repos: [],
          note: 'TODO: Implement GitHub API integration',
        },
      });
    } catch (error) {
      logger.error('Get GitHub repos error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
);

export default router;
