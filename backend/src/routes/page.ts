import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();
const router = Router();

// Create page
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { title, workspaceId, parentId } = req.body;
    const authorId = req.user!.userId;

    const page = await prisma.page.create({
      data: {
        title,
        content: '',
        workspaceId,
        authorId,
        parentId
      }
    });

    res.json(page);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create page' });
  }
});

// Get pages in workspace
router.get('/workspace/:workspaceId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const workspaceId = req.params.workspaceId;
    const pages = await prisma.page.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' }
    });
    res.json(pages);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch pages' });
  }
});

// Get page
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id;
    const page = await prisma.page.findUnique({ where: { id } });
    if (!page) return res.status(404).json({ error: 'Page not found' });
    res.json(page);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch page' });
  }
});

// Update page
router.put('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id;
    const { title, content } = req.body;

    const page = await prisma.page.update({
      where: { id },
      data: { title, content }
    });

    res.json(page);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update page' });
  }
});

export default router;
