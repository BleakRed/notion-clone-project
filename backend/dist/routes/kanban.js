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
const express_1 = __importDefault(require("express"));
const prisma_1 = __importDefault(require("../prisma"));
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Get boards for a workspace
router.get('/workspace/:workspaceId', auth_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { workspaceId } = req.params;
        const boards = yield prisma_1.default.kanbanBoard.findMany({
            where: { workspaceId },
            orderBy: { createdAt: 'desc' },
        });
        res.json(boards);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch boards' });
    }
}));
// Create a board
router.post('/workspace/:workspaceId', auth_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { workspaceId } = req.params;
        const { title } = req.body;
        const board = yield prisma_1.default.kanbanBoard.create({
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
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to create board' });
    }
}));
// Get a board with columns and cards
router.get('/board/:boardId', auth_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { boardId } = req.params;
        const board = yield prisma_1.default.kanbanBoard.findUnique({
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
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch board details' });
    }
}));
// Create a card
router.post('/columns/:columnId/cards', auth_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { columnId } = req.params;
        const { content } = req.body;
        const authorId = req.user.id;
        // Get max order
        const lastCard = yield prisma_1.default.kanbanCard.findFirst({
            where: { columnId },
            orderBy: { order: 'desc' }
        });
        const order = lastCard ? lastCard.order + 1 : 0;
        const card = yield prisma_1.default.kanbanCard.create({
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
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to create card' });
    }
}));
// Update a card (content, column, or order)
router.put('/cards/:cardId', auth_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { cardId } = req.params;
        const { content, columnId, order } = req.body;
        const card = yield prisma_1.default.kanbanCard.update({
            where: { id: cardId },
            data: {
                content,
                columnId,
                order
            }
        });
        res.json(card);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to update card' });
    }
}));
// Delete a card
router.delete('/cards/:cardId', auth_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { cardId } = req.params;
        yield prisma_1.default.kanbanCard.delete({
            where: { id: cardId }
        });
        res.json({ message: 'Card deleted' });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete card' });
    }
}));
// Create a column
router.post('/board/:boardId/columns', auth_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { boardId } = req.params;
        const { title } = req.body;
        const lastColumn = yield prisma_1.default.kanbanColumn.findFirst({
            where: { boardId },
            orderBy: { order: 'desc' }
        });
        const order = lastColumn ? lastColumn.order + 1 : 0;
        const column = yield prisma_1.default.kanbanColumn.create({
            data: { title, boardId, order }
        });
        res.json(column);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to create column' });
    }
}));
exports.default = router;
