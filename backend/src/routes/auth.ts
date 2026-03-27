import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import crypto from 'crypto';

const prisma = new PrismaClient();
const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, confirmPassword, name, username } = req.body;
    
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    if (password !== confirmPassword) return res.status(400).json({ error: 'Passwords do not match' });

    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) return res.status(400).json({ error: 'Email already exists' });

    if (username) {
        const existingUser = await prisma.user.findUnique({ where: { username } });
        if (existingUser) return res.status(400).json({ error: 'Username already exists' });
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { 
        email, 
        password: hashedPassword, 
        name, 
        username,
        verificationToken
      }
    });

    // Mock Email Sending
    console.log(`Verification link: ${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`);

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '1d' });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, username: user.username, avatarUrl: user.avatarUrl, isVerified: user.isVerified } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '1d' });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, username: user.username, avatarUrl: user.avatarUrl, isVerified: user.isVerified } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/forgot-password', async (req: Request, res: Response) => {
    try {
        const { email } = req.body;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

        await prisma.user.update({
            where: { id: user.id },
            data: { resetToken, resetTokenExpiry }
        });

        // Mock Email Sending
        console.log(`Reset link: ${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`);

        res.json({ message: 'Password reset link sent to your email' });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/reset-password', async (req: Request, res: Response) => {
    try {
        const { token, password } = req.body;
        const user = await prisma.user.findFirst({
            where: {
                resetToken: token,
                resetTokenExpiry: { gt: new Date() }
            }
        });

        if (!user) return res.status(400).json({ error: 'Invalid or expired token' });

        const hashedPassword = await bcrypt.hash(password, 10);
        await prisma.user.update({
            where: { id: user.id },
            data: { 
                password: hashedPassword,
                resetToken: null,
                resetTokenExpiry: null
            }
        });

        res.json({ message: 'Password reset successful' });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/verify-email', async (req: Request, res: Response) => {
    try {
        const { token } = req.query;
        const user = await prisma.user.findFirst({
            where: { verificationToken: token as string }
        });

        if (!user) return res.status(400).json({ error: 'Invalid verification token' });

        await prisma.user.update({
            where: { id: user.id },
            data: { 
                isVerified: true,
                verificationToken: null
            }
        });

        res.json({ message: 'Email verified successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.put('/profile', authenticateToken, async (req: any, res: Response) => {
    try {
      const userId = req.user!.userId;
      const { username, avatarUrl, name, removeAvatar } = req.body;

      if (username) {
          const existingUser = await prisma.user.findUnique({ where: { username } });
          if (existingUser && existingUser.id !== userId) {
              return res.status(400).json({ error: 'Username already exists' });
          }
      }

      const user = await prisma.user.update({
          where: { id: userId },
          data: { 
              username, 
              avatarUrl: removeAvatar ? null : avatarUrl, 
              name 
          },
          include: { memberships: true }
      });

      const updatedData = { 
          id: user.id, 
          email: user.email, 
          name: user.name, 
          username: user.username, 
          avatarUrl: user.avatarUrl, 
          isVerified: user.isVerified 
      };

      // Notify all workspaces the user belongs to
      user.memberships.forEach(m => {
          req.io.to(`chat-${m.workspaceId}`).emit('member-updated', updatedData);
      });

      res.json(updatedData);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
