import { Router, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import prisma from '../prisma';

const router = Router();

// Create a new drawing
router.post('/workspace/:workspaceId', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { workspaceId } = req.params;
  const { title, data } = req.body;
  const userId = req.user?.userId;

  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const drawing = await prisma.drawing.create({
      data: {
        title: title || 'Untitled Drawing',
        data,
        workspaceId,
        authorId: userId
      }
    });
    res.json(drawing);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create drawing' });
  }
});

// Update a drawing
router.put('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { title, data } = req.body;

  try {
    const drawing = await prisma.drawing.update({
      where: { id },
      data: {
        title,
        data,
        updatedAt: new Date()
      }
    });
    res.json(drawing);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update drawing' });
  }
});

// Get all drawings in a workspace
router.get('/workspace/:workspaceId', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { workspaceId } = req.params;

  try {
    const drawings = await prisma.drawing.findMany({
      where: { workspaceId },
      include: { author: { select: { id: true, username: true, email: true, avatarUrl: true } } },
      orderBy: { updatedAt: 'desc' }
    });
    res.json(drawings);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch drawings' });
  }
});

// Get a single drawing
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const drawing = await prisma.drawing.findUnique({
      where: { id },
      include: { author: { select: { id: true, username: true, email: true, avatarUrl: true } } }
    });
    if (!drawing) return res.status(404).json({ error: 'Drawing not found' });
    res.json(drawing);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch drawing' });
  }
});

// Delete a drawing
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    await prisma.drawing.delete({ where: { id } });
    res.json({ message: 'Drawing deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete drawing' });
  }
});

export default router;
