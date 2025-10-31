/**
 * Project Routes
 *
 * Minimal CRUD for user projects and deploy requests
 */

import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import prisma from '../db';
import { authenticate } from '../auth/middleware';
import logger from '../utils/logger';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/projects
 * List all projects for the current user
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const projects = await prisma.project.findMany({
      where: { userId: req.user.userId },
      include: {
        _count: {
          select: { deployRequests: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: { projects } });
  } catch (error) {
    logger.error('Get projects error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * POST /api/projects
 * Create a new project
 */
router.post(
  '/',
  [
    body('name').notEmpty().trim(),
    body('description').optional().trim(),
    body('config').optional().isObject(),
  ],
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

      const { name, description, config } = req.body;

      const project = await prisma.project.create({
        data: {
          userId: req.user.userId,
          name,
          description,
          config: config || {},
        },
      });

      logger.info(`Project created: ${project.id} by ${req.user.email}`);
      res.status(201).json({ success: true, data: { project } });
    } catch (error) {
      logger.error('Create project error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
);

/**
 * GET /api/projects/:projectId
 * Get a single project
 */
router.get('/:projectId', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const project = await prisma.project.findFirst({
      where: {
        id: req.params.projectId,
        userId: req.user.userId,
      },
      include: {
        deployRequests: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!project) {
      res.status(404).json({ success: false, message: 'Project not found' });
      return;
    }

    res.json({ success: true, data: { project } });
  } catch (error) {
    logger.error('Get project error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * PUT /api/projects/:projectId
 * Update a project
 */
router.put('/:projectId', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const { name, description, status, config } = req.body;
    const updateData: any = {};

    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (status) updateData.status = status;
    if (config) updateData.config = config;

    const project = await prisma.project.updateMany({
      where: {
        id: req.params.projectId,
        userId: req.user.userId,
      },
      data: updateData,
    });

    if (project.count === 0) {
      res.status(404).json({ success: false, message: 'Project not found' });
      return;
    }

    res.json({ success: true, message: 'Project updated successfully' });
  } catch (error) {
    logger.error('Update project error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * POST /api/projects/:projectId/deploy
 * Create a deploy request for a project
 *
 * TODO: In production, this should trigger actual deployment workflow
 * TODO: Integrate with CI/CD pipeline (GitHub Actions, Jenkins, etc.)
 * TODO: Add webhook notifications for deployment status changes
 */
router.post(
  '/:projectId/deploy',
  [body('config').optional().isObject()],
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }

      // Verify project ownership
      const project = await prisma.project.findFirst({
        where: {
          id: req.params.projectId,
          userId: req.user.userId,
        },
      });

      if (!project) {
        res.status(404).json({ success: false, message: 'Project not found' });
        return;
      }

      const deployRequest = await prisma.deployRequest.create({
        data: {
          projectId: req.params.projectId,
          status: 'pending',
          config: req.body.config || {},
        },
      });

      logger.info(`Deploy request created: ${deployRequest.id} for project ${project.id}`);
      res.status(201).json({ success: true, data: { deployRequest } });
    } catch (error) {
      logger.error('Create deploy request error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
);

/**
 * GET /api/projects/templates
 * Get available project templates
 *
 * TODO: Add template categories and filtering
 * TODO: Add template preview/demo links
 */
router.get('/templates/list', async (_req: Request, res: Response): Promise<void> => {
  try {
    const templates = await prisma.template.findMany({
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: { templates } });
  } catch (error) {
    logger.error('Get templates error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

export default router;
