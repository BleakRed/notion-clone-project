import express from 'express';
import prisma from '../prisma';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { Response } from 'express';

const router = express.Router();

// Get boards for a workspace
router.get('/workspace/:workspaceId', authenticateToken, async (req: AuthRequest, res: Response) => {
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
router.post('/workspace/:workspaceId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const { title } = req.body;
    const board = await prisma.kanbanBoard.create({
      data: {
        title,
        workspaceId,
        columns: {
          create: [
            { title: 'To Do', order: 0, color: '#ef4444' }, // Red
            { title: 'In Progress', order: 1, color: '#f59e0b' }, // Yellow
            { title: 'Done', order: 2, color: '#10b981' }, // Green
          ]
        }
      },
      include: {
        columns: {
          include: {
            cards: true
          }
        }
      }
    });
    res.json(board);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create board' });
  }
});

// Get a board with columns and cards
router.get('/board/:boardId', authenticateToken, async (req: AuthRequest, res: Response) => {
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
                },
                assignees: {
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

// Toggle a card assignment for a user
router.put('/cards/:cardId/assign', authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
        const { cardId } = req.params;
        const { userId } = req.body;
        
        // Find current assignees
        const currentCard = await prisma.kanbanCard.findUnique({
            where: { id: cardId },
            include: { assignees: true }
        });

        if (!currentCard) return res.status(404).json({ error: 'Card not found' });

        const isAssigned = currentCard.assignees.some(u => u.id === userId);

        const card = await prisma.kanbanCard.update({
            where: { id: cardId },
            data: {
                assignees: isAssigned 
                    ? { disconnect: { id: userId } }
                    : { connect: { id: userId } }
            },
            include: {
                assignees: {
                    select: { id: true, username: true, email: true, avatarUrl: true }
                }
            }
        });
        res.json(card);
    } catch (error) {
        res.status(500).json({ error: 'Failed to assign card' });
    }
});

// Create a card
router.post('/columns/:columnId/cards', authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
        const { columnId } = req.params;
        const { content, description } = req.body;
        const authorId = req.user!.userId;
        
        // Get max order
        const lastCard = await prisma.kanbanCard.findFirst({
            where: { columnId },
            orderBy: { order: 'desc' }
        });
        const order = lastCard ? lastCard.order + 1 : 0;

        const card = await prisma.kanbanCard.create({
            data: {
                content,
                description,
                columnId,
                authorId,
                order
            },
            include: {
                author: {
                    select: { id: true, username: true, email: true, avatarUrl: true }
                },
                assignees: {
                    select: { id: true, username: true, email: true, avatarUrl: true }
                }
            }
        });
        res.json(card);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create card' });
    }
});

// Update a card (content, description, column, or order)
router.put('/cards/:cardId', authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
        const { cardId } = req.params;
        const { content, description, columnId, order } = req.body;
        
        const card = await prisma.kanbanCard.update({
            where: { id: cardId },
            data: {
                content,
                description,
                columnId,
                order
            }
        });
        res.json(card);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update card' });
    }
});

// Update column (title or color)
router.put('/columns/:columnId', authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
        const { columnId } = req.params;
        const { title, color } = req.body;
        const userId = req.user!.userId;

        const column = await prisma.kanbanColumn.findUnique({
            where: { id: columnId },
            include: { board: { include: { workspace: true } } }
        });

        if (!column) return res.status(404).json({ error: 'Column not found' });
        if (column.board.workspace.ownerId !== userId) {
            return res.status(403).json({ error: 'Only the workspace owner can edit columns' });
        }
        
        const updatedColumn = await prisma.kanbanColumn.update({
            where: { id: columnId },
            data: { title, color }
        });
        res.json(updatedColumn);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update column' });
    }
});

// Delete a card
router.delete('/cards/:cardId', authenticateToken, async (req: AuthRequest, res: Response) => {
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
router.post('/board/:boardId/columns', authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
        const { boardId } = req.params;
        const { title, color } = req.body;
        
        const lastColumn = await prisma.kanbanColumn.findFirst({
            where: { boardId },
            orderBy: { order: 'desc' }
        });
        const order = lastColumn ? lastColumn.order + 1 : 0;

        const column = await prisma.kanbanColumn.create({
            data: { 
                title, 
                boardId, 
                order, 
                color: color || '#3b82f6' 
            }
        });
        res.json(column);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create column' });
    }
});

export default router;
