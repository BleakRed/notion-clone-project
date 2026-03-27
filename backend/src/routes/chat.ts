import express from 'express';
import prisma from '../prisma';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { Response } from 'express';

const router = express.Router();

// Get chat rooms for a workspace
router.get('/workspace/:workspaceId/rooms', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId } = req.params;
    let rooms = await prisma.chatRoom.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'asc' },
    });

    // Create default room if none exists
    if (rooms.length === 0) {
        const defaultRoom = await prisma.chatRoom.create({
            data: { name: 'General', workspaceId }
        });
        rooms = [defaultRoom];
    }

    res.json(rooms);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch chat rooms' });
  }
});

// Create a chat room
router.post('/workspace/:workspaceId/rooms', authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
        const { workspaceId } = req.params;
        const { name } = req.body;
        const room = await prisma.chatRoom.create({
            data: { name, workspaceId }
        });
        res.json(room);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create chat room' });
    }
});

// Get messages for a chat room
router.get('/room/:roomId/messages', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { roomId } = req.params;
    const messages = await prisma.chatMessage.findMany({
      where: { chatRoomId: roomId },
      include: {
        author: {
          select: { id: true, username: true, email: true, avatarUrl: true }
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
router.post('/room/:roomId', authenticateToken, async (req: any, res: Response) => {
  try {
    const { roomId } = req.params;
    const { content } = req.body;
    const authorId = req.user!.userId;

    if (!content || content.trim().length === 0) return res.status(400).json({ error: 'Message content required' });
    if (content.length > 1000) return res.status(400).json({ error: 'Message too long' });

    const message = await prisma.chatMessage.create({
      data: {
        content,
        chatRoomId: roomId,
        authorId,
      },
      include: {
        author: {
          select: { id: true, username: true, email: true, avatarUrl: true }
        }
      }
    });

    // Notify via socket
    req.io.to(`chat-room-${roomId}`).emit('message-received', message);

    res.json(message);
  } catch (error) {
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Edit a message
router.put('/message/:messageId', authenticateToken, async (req: any, res: Response) => {
    try {
        const { messageId } = req.params;
        const { content } = req.body;
        const userId = req.user!.userId;

        const message = await prisma.chatMessage.findUnique({
            where: { id: messageId }
        });

        if (!message) return res.status(404).json({ error: 'Message not found' });
        if (message.authorId !== userId) return res.status(403).json({ error: 'Unauthorized' });
        
        const updatedMessage = await prisma.chatMessage.update({
            where: { id: messageId },
            data: { content },
            include: {
                author: { select: { id: true, username: true, email: true, avatarUrl: true } }
            }
        });

        req.io.to(`chat-room-${message.chatRoomId}`).emit('message-edited', updatedMessage);

        res.json(updatedMessage);
    } catch (error) {
        res.status(500).json({ error: 'Failed to edit message' });
    }
});

// Delete a message
router.delete('/message/:messageId', authenticateToken, async (req: any, res: Response) => {
    try {
        const { messageId } = req.params;
        const userId = req.user!.userId;

        const message = await prisma.chatMessage.findUnique({
            where: { id: messageId }
        });

        if (!message) return res.status(404).json({ error: 'Message not found' });
        if (message.authorId !== userId) return res.status(403).json({ error: 'Unauthorized' });

        await prisma.chatMessage.delete({ where: { id: messageId } });

        req.io.to(`chat-room-${message.chatRoomId}`).emit('message-deleted', messageId);

        res.json({ message: 'Deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Failed' });
    }
});

export default router;
