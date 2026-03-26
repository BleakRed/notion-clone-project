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
// Get chat history for a workspace
router.get('/workspace/:workspaceId', auth_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { workspaceId } = req.params;
        const messages = yield prisma_1.default.chatMessage.findMany({
            where: { workspaceId },
            include: {
                author: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                        avatarUrl: true,
                    }
                }
            },
            orderBy: { createdAt: 'asc' },
        });
        res.json(messages);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch chat messages' });
    }
}));
// Post a new message
router.post('/workspace/:workspaceId', auth_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { workspaceId } = req.params;
        const { content } = req.body;
        const authorId = req.user.id;
        const message = yield prisma_1.default.chatMessage.create({
            data: {
                content,
                workspaceId,
                authorId,
            },
            include: {
                author: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                        avatarUrl: true,
                    }
                }
            }
        });
        res.json(message);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to send message' });
    }
}));
exports.default = router;
