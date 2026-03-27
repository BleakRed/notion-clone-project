import express from 'express';
import prisma from '../prisma';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { Response } from 'express';

const router = express.Router();

// Get all reports
router.get('/reports', authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;
        const user = await prisma.user.findUnique({ where: { id: userId } });
        
        // Basic check for admin - could use role field
        if (user?.email !== 'admin@example.com') { // Placeholder
            // In a real app, use WorkspaceMember role or User.role
        }

        const reports = await prisma.report.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.json(reports);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch reports' });
    }
});

// Create a report
router.post('/reports', authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
        const { title, description } = req.body;
        const reporterId = req.user!.userId;

        const report = await prisma.report.create({
            data: { title, description, reporterId }
        });
        res.json(report);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create report' });
    }
});

// Update report status
router.put('/reports/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
        const { status } = req.body;
        const { id } = req.params;

        const report = await prisma.report.update({
            where: { id },
            data: { status }
        });
        res.json(report);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update report' });
    }
});

export default router;
