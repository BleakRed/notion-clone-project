import express from 'express';
import prisma from '../prisma';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Get boards for a workspace
router.get('/workspace/:workspaceId', authenticateToken, async (req: any, res) => {
  try {
    const { workspaceId } = req.params;
    const boards = await prisma.kanbanBoard.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(boards);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch boards' });
  }
});

// Create a board
router.post('/workspace/:workspaceId', authenticateToken, async (req: any, res) => {
  try {
    const { workspaceId } = req.params;
    const { title } = req.body;
    const board = await prisma.kanbanBoard.create({
      data: {
        title,
        workspaceId,
        columns: {
          create: [
            { title: 'To Do', order: 0 },
            { title: 'In Progress', order: 1 },
            { title: 'Done', order: 2 },
          ]
        }
      }
    });
    res.json(board);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create board' });
  }
});

// Get a board with columns and cards
router.get('/board/:boardId', authenticateToken, async (req: any, res) => {
  try {
    const { boardId } = req.params;
    const board = await prisma.kanbanBoard.findUnique({
      where: { id: boardId },
      include: {
        columns: {
          orderBy: { order: 'asc' },
          include: {
            cards: {
              orderBy: { order: 'asc' },
              include: {
                author: {
                  select: { id: true, username: true, email: true, avatarUrl: true }
                }
              }
            }
          }
        }
      }
    });
    res.json(board);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch board details' });
  }
});

// Create a card
router.post('/columns/:columnId/cards', authenticateToken, async (req: any, res) => {
    try {
        const { columnId } = req.params;
        const { content } = req.body;
        const authorId = req.user.id;
        
        // Get max order
        const lastCard = await prisma.kanbanCard.findFirst({
            where: { columnId },
            orderBy: { order: 'desc' }
        });
        const order = lastCard ? lastCard.order + 1 : 0;

        const card = await prisma.kanbanCard.create({
            data: {
                content,
                columnId,
                authorId,
                order
            },
            include: {
                author: {
                    select: { id: true, username: true, email: true, avatarUrl: true }
                }
            }
        });
        res.json(card);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create card' });
    }
});

// Update a card (content, column, or order)
router.put('/cards/:cardId', authenticateToken, async (req: any, res) => {
    try {
        const { cardId } = req.params;
        const { content, columnId, order } = req.body;
        
        const card = await prisma.kanbanCard.update({
            where: { id: cardId },
            data: {
                content,
                columnId,
                order
            }
        });
        res.json(card);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update card' });
    }
});

// Delete a card
router.delete('/cards/:cardId', authenticateToken, async (req: any, res) => {
    try {
        const { cardId } = req.params;
        await prisma.kanbanCard.delete({
            where: { id: cardId }
        });
        res.json({ message: 'Card deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete card' });
    }
});

// Create a column
router.post('/board/:boardId/columns', authenticateToken, async (req: any, res) => {
    try {
        const { boardId } = req.params;
        const { title } = req.body;
        
        const lastColumn = await prisma.kanbanColumn.findFirst({
            where: { boardId },
            orderBy: { order: 'desc' }
        });
        const order = lastColumn ? lastColumn.order + 1 : 0;

        const column = await prisma.kanbanColumn.create({
            data: { title, boardId, order }
        });
        res.json(column);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create column' });
    }
});

export default router;
