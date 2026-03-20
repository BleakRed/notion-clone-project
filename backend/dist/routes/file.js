"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const auth_1 = require("../middleware/auth");
const prisma_1 = __importDefault(require("../prisma"));
const router = (0, express_1.Router)();
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path_1.default.extname(file.originalname));
    }
});
const upload = (0, multer_1.default)({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});
// Upload a file to a workspace
router.post('/workspace/:workspaceId', auth_1.authenticateToken, upload.single('file'), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { workspaceId } = req.params;
    const { folderId, description } = req.body;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
    if (!req.file || !userId) {
        return res.status(400).json({ error: 'Please upload a file' });
    }
    try {
        const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
        const file = yield prisma_1.default.file.create({
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
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to save file info' });
    }
}));
// Create a folder in a workspace
router.post('/folders/:workspaceId', auth_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { workspaceId } = req.params;
    const { name, parentId } = req.body;
    try {
        const folder = yield prisma_1.default.folder.create({
            data: {
                name,
                workspaceId,
                parentId: parentId || null,
            }
        });
        res.json(folder);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to create folder' });
    }
}));
// Get all files and folders in a workspace
router.get('/workspace/:workspaceId', auth_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { workspaceId } = req.params;
    try {
        const files = yield prisma_1.default.file.findMany({
            where: { workspaceId },
            include: { uploader: { select: { id: true, username: true, email: true, avatarUrl: true } } },
            orderBy: { createdAt: 'desc' }
        });
        const folders = yield prisma_1.default.folder.findMany({
            where: { workspaceId },
            orderBy: { name: 'asc' }
        });
        res.json({ files, folders });
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to fetch files and folders' });
    }
}));
// Delete a folder
router.delete('/folders/:id', auth_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        // Note: This won't delete files in the folder unless we do it recursively or Cascade
        // Prisma Cascade delete would be better, but we'll do it manually for simplicity if needed
        // In schema we didn't add Cascade. 
        // Let's just delete the folder for now.
        yield prisma_1.default.folder.delete({ where: { id } });
        res.json({ message: 'Folder deleted' });
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to delete folder' });
    }
}));
// Delete a file
router.delete('/:id', auth_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { id } = req.params;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
    try {
        const file = yield prisma_1.default.file.findUnique({ where: { id } });
        if (!file)
            return res.status(404).json({ error: 'File not found' });
        // Check if user is uploader or workspace owner (simplified: just uploader for now)
        if (file.uploaderId !== userId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        yield prisma_1.default.file.delete({ where: { id } });
        res.json({ message: 'File deleted' });
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to delete file' });
    }
}));
// Update file content on disk
router.put('/:id', auth_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { id } = req.params;
    const { content } = req.body;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
    try {
        const file = yield prisma_1.default.file.findUnique({ where: { id } });
        if (!file)
            return res.status(404).json({ error: 'File not found' });
        // Check if user is in workspace
        const membership = yield prisma_1.default.workspaceMember.findUnique({
            where: { workspaceId_userId: { workspaceId: file.workspaceId, userId: userId } }
        });
        if (!membership)
            return res.status(403).json({ error: 'Unauthorized' });
        // Extract filename from URL: http://.../uploads/file-123.txt
        const urlParts = file.url.split('/');
        const filename = urlParts[urlParts.length - 1];
        const filePath = path_1.default.join(process.cwd(), 'uploads', filename);
        if (!fs_1.default.existsSync(filePath)) {
            return res.status(404).json({ error: 'File not found on disk' });
        }
        fs_1.default.writeFileSync(filePath, content);
        // Update file size in DB
        const stats = fs_1.default.statSync(filePath);
        yield prisma_1.default.file.update({
            where: { id },
            data: { size: stats.size }
        });
        res.json({ message: 'File updated successfully' });
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to update file' });
    }
}));
exports.default = router;
