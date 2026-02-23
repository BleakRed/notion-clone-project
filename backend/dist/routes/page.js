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
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const prisma = new client_1.PrismaClient();
const router = (0, express_1.Router)();
// Create page
router.post('/', auth_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { title, workspaceId, parentId } = req.body;
        const authorId = req.user.userId;
        const page = yield prisma.page.create({
            data: {
                title,
                content: '',
                workspaceId,
                authorId,
                parentId
            }
        });
        res.json(page);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create page' });
    }
}));
// Get pages in workspace
router.get('/workspace/:workspaceId', auth_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const workspaceId = req.params.workspaceId;
        const pages = yield prisma.page.findMany({
            where: { workspaceId },
            orderBy: { createdAt: 'desc' }
        });
        res.json(pages);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch pages' });
    }
}));
// Get page
router.get('/:id', auth_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = req.params.id;
        const page = yield prisma.page.findUnique({ where: { id } });
        if (!page)
            return res.status(404).json({ error: 'Page not found' });
        res.json(page);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch page' });
    }
}));
// Update page
router.put('/:id', auth_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = req.params.id;
        const { title, content } = req.body;
        const page = yield prisma.page.update({
            where: { id },
            data: { title, content }
        });
        res.json(page);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update page' });
    }
}));
exports.default = router;
