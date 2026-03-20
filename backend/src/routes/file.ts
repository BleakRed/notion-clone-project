import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import prisma from '../prisma';

const router = Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// Upload a file to a workspace
router.post('/workspace/:workspaceId', authenticateToken, upload.single('file'), async (req: AuthRequest, res: Response) => {
  const { workspaceId } = req.params;
  const { folderId, description } = req.body;
  const userId = req.user?.userId;

  if (!req.file || !userId) {
    return res.status(400).json({ error: 'Please upload a file' });
  }

  try {
    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    
    const file = await prisma.file.create({
      data: {
        name: req.file.originalname,
        url: fileUrl,
        size: req.file.size,
        type: req.file.mimetype,
        description,
        workspaceId,
        uploaderId: userId,
        folderId: folderId || null,
      },
      include: { uploader: { select: { id: true, username: true, email: true, avatarUrl: true } } },
    });

    res.json(file);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save file info' });
  }
});

// Create a folder in a workspace
router.post('/folders/:workspaceId', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { workspaceId } = req.params;
  const { name, parentId } = req.body;

  try {
    const folder = await prisma.folder.create({
      data: {
        name,
        workspaceId,
        parentId: parentId || null,
      }
    });
    res.json(folder);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create folder' });
  }
});

// Get all files and folders in a workspace
router.get('/workspace/:workspaceId', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { workspaceId } = req.params;

  try {
    const files = await prisma.file.findMany({
      where: { workspaceId },
      include: { uploader: { select: { id: true, username: true, email: true, avatarUrl: true } } },
      orderBy: { createdAt: 'desc' }
    });
    
    const folders = await prisma.folder.findMany({
      where: { workspaceId },
      orderBy: { name: 'asc' }
    });

    res.json({ files, folders });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch files and folders' });
  }
});

// Delete a folder
router.delete('/folders/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    // Note: This won't delete files in the folder unless we do it recursively or Cascade
    // Prisma Cascade delete would be better, but we'll do it manually for simplicity if needed
    // In schema we didn't add Cascade. 
    // Let's just delete the folder for now.
    await prisma.folder.delete({ where: { id } });
    res.json({ message: 'Folder deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete folder' });
  }
});

// Delete a file
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.userId;

  try {
    const file = await prisma.file.findUnique({ where: { id } });
    if (!file) return res.status(404).json({ error: 'File not found' });
    
    // Check if user is uploader or workspace owner (simplified: just uploader for now)
    if (file.uploaderId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await prisma.file.delete({ where: { id } });
    res.json({ message: 'File deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

// Update file content on disk
router.put('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { content } = req.body;
  const userId = req.user?.userId;

  try {
    const file = await prisma.file.findUnique({ where: { id } });
    if (!file) return res.status(404).json({ error: 'File not found' });
    
    // Check if user is in workspace
    const membership = await prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId: file.workspaceId, userId: userId! } }
    });
    if (!membership) return res.status(403).json({ error: 'Unauthorized' });

    // Extract filename from URL: http://.../uploads/file-123.txt
    const urlParts = file.url.split('/');
    const filename = urlParts[urlParts.length - 1];
    const filePath = path.join(process.cwd(), 'uploads', filename);

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found on disk' });
    }

    fs.writeFileSync(filePath, content);
    
    // Update file size in DB
    const stats = fs.statSync(filePath);
    await prisma.file.update({
        where: { id },
        data: { size: stats.size }
    });

    res.json({ message: 'File updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update file' });
  }
});

export default router;
