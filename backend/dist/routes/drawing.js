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
const auth_1 = require("../middleware/auth");
const prisma_1 = __importDefault(require("../prisma"));
const router = (0, express_1.Router)();
// Create a new drawing
router.post('/workspace/:workspaceId', auth_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { workspaceId } = req.params;
    const { title, data } = req.body;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
    if (!userId)
        return res.status(401).json({ error: 'Unauthorized' });
    try {
        const drawing = yield prisma_1.default.drawing.create({
            data: {
                title: title || 'Untitled Drawing',
                data,
                workspaceId,
                authorId: userId
            }
        });
        res.json(drawing);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to create drawing' });
    }
}));
// Update a drawing
router.put('/:id', auth_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { title, data } = req.body;
    try {
        const drawing = yield prisma_1.default.drawing.update({
            where: { id },
            data: {
                title,
                data,
                updatedAt: new Date()
            }
        });
        res.json(drawing);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to update drawing' });
    }
}));
// Get all drawings in a workspace
router.get('/workspace/:workspaceId', auth_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { workspaceId } = req.params;
    try {
        const drawings = yield prisma_1.default.drawing.findMany({
            where: { workspaceId },
            include: { author: { select: { id: true, username: true, email: true, avatarUrl: true } } },
            orderBy: { updatedAt: 'desc' }
        });
        res.json(drawings);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to fetch drawings' });
    }
}));
// Get a single drawing
router.get('/:id', auth_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        const drawing = yield prisma_1.default.drawing.findUnique({
            where: { id },
            include: { author: { select: { id: true, username: true, email: true, avatarUrl: true } } }
        });
        if (!drawing)
            return res.status(404).json({ error: 'Drawing not found' });
        res.json(drawing);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to fetch drawing' });
    }
}));
// Delete a drawing
router.delete('/:id', auth_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        yield prisma_1.default.drawing.delete({ where: { id } });
        res.json({ message: 'Drawing deleted' });
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to delete drawing' });
    }
}));
exports.default = router;
