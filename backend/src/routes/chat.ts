import express from 'express';
import prisma from '../prisma';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { Response } from 'express';

const router = express.Router();

// Get chat history for a workspace
router.get('/workspace/:workspaceId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const messages = await prisma.chatMessage.findMany({
      where: { workspaceId },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            email: true,
            avatarUrl: true,
          }
        }
      },
      orderBy: { createdAt: 'asc' },
    });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch chat messages' });
  }
});

// Post a new message
router.post('/workspace/:workspaceId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const { content } = req.body;
    const authorId = req.user!.userId;

    const message = await prisma.chatMessage.create({
      data: {
        content,
        workspaceId,
        authorId,
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            email: true,
            avatarUrl: true,
          }
        }
      }
    });
    res.json(message);
  } catch (error) {
    res.status(500).json({ error: 'Failed to send message' });
  }
});

export default router;
