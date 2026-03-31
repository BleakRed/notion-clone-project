import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import prisma from '../prisma';
import { supabase, supabaseBucket } from '../supabase';

const router = Router();

// Use memory storage for Multer to avoid ephemeral disk issues
const storage = multer.memoryStorage();

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// Helper to extract path from Supabase URL
const getFilePathFromUrl = (url: string) => {
  // Public URL format: https://[project].supabase.co/storage/v1/object/public/[bucket]/[path]
  const parts = url.split(`/storage/v1/object/public/${supabaseBucket}/`);
  return parts.length > 1 ? parts[1] : null;
};

// Upload a file to a workspace
router.post('/workspace/:workspaceId', authenticateToken, upload.single('file'), async (req: AuthRequest, res: Response) => {
  const { workspaceId } = req.params;
  const { folderId, description } = req.body;
  const userId = req.user?.userId;

  if (!req.file || !userId) {
    return res.status(400).json({ error: 'Please upload a file' });
  }

  try {
    const file = req.file;
    const fileExt = path.extname(file.originalname);
    const fileName = `files/${workspaceId}/${Date.now()}-${Math.round(Math.random() * 1E9)}${fileExt}`;

    // Upload to Supabase
    const { data, error } = await supabase.storage
      .from(supabaseBucket)
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: true
      });

    if (error) {
      console.error('Supabase upload error:', error);
      return res.status(500).json({ error: 'Failed to upload file to storage' });
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(supabaseBucket)
      .getPublicUrl(fileName);
    
    const fileRecord = await prisma.file.create({
      data: {
        name: req.file.originalname,
        url: publicUrl,
        size: req.file.size,
        type: req.file.mimetype,
        description,
        workspaceId,
        uploaderId: userId,
        folderId: folderId || null,
      },
      include: { uploader: { select: { id: true, username: true, email: true, avatarUrl: true } } },
    });

    res.json(fileRecord);
  } catch (err) {
    console.error('File upload error:', err);
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

    // Delete from Supabase
    const filePath = getFilePathFromUrl(file.url);
    if (filePath) {
      const { error } = await supabase.storage
        .from(supabaseBucket)
        .remove([filePath]);
      
      if (error) {
        console.error('Supabase delete error:', error);
        // We continue to delete from DB even if Supabase fails (maybe it was already gone)
      }
    }

    await prisma.file.delete({ where: { id } });
    res.json({ message: 'File deleted' });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

// Update file content in Supabase
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

    // Update in Supabase
    const filePath = getFilePathFromUrl(file.url);
    if (!filePath) {
      return res.status(400).json({ error: 'Invalid file URL for update' });
    }

    const { error } = await supabase.storage
      .from(supabaseBucket)
      .upload(filePath, Buffer.from(content), {
        contentType: file.type,
        upsert: true
      });

    if (error) {
        console.error('Supabase update error:', error);
        return res.status(500).json({ error: 'Failed to update file in storage' });
    }
    
    // Update file size in DB
    await prisma.file.update({
        where: { id },
        data: { size: Buffer.byteLength(content) }
    });

    res.json({ message: 'File updated successfully' });
  } catch (err) {
    console.error('Update error:', err);
    res.status(500).json({ error: 'Failed to update file' });
  }
});

export default router;
