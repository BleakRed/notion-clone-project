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
// Create workspace
router.post('/', auth_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name } = req.body;
        const userId = req.user.userId;
        const workspace = yield prisma.workspace.create({
            data: {
                name,
                ownerId: userId,
                members: {
                    create: { userId, role: 'OWNER' }
                }
            }
        });
        res.json(workspace);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create workspace' });
    }
}));
// List workspaces
router.get('/', auth_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.userId;
        const memberships = yield prisma.workspaceMember.findMany({
            where: { userId },
            include: {
                workspace: {
                    include: {
                        members: {
                            include: {
                                user: {
                                    select: { id: true, email: true, name: true }
                                }
                            }
                        }
                    }
                }
            }
        });
        res.json(memberships.map(m => m.workspace));
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch workspaces' });
    }
}));
// Get workspace members
router.get('/:id/members', auth_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const workspaceId = req.params.id;
        const members = yield prisma.workspaceMember.findMany({
            where: { workspaceId },
            include: {
                user: {
                    select: { id: true, email: true, name: true }
                }
            }
        });
        res.json(members);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch members' });
    }
}));
// Invite member
router.post('/:id/invite', auth_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const workspaceId = req.params.id;
        const { email } = req.body;
        const ownerId = req.user.userId;
        // Check ownership
        const workspace = yield prisma.workspace.findUnique({
            where: { id: workspaceId }
        });
        if (!workspace)
            return res.status(404).json({ error: 'Workspace not found' });
        if (workspace.ownerId !== ownerId) {
            return res.status(403).json({ error: 'Only owner can invite' });
        }
        const userToInvite = yield prisma.user.findUnique({ where: { email } });
        if (!userToInvite)
            return res.status(404).json({ error: 'User not found' });
        // Check if already member
        const existing = yield prisma.workspaceMember.findFirst({
            where: { workspaceId, userId: userToInvite.id }
        });
        if (existing)
            return res.status(400).json({ error: 'User already a member' });
        yield prisma.workspaceMember.create({
            data: {
                workspaceId,
                userId: userToInvite.id,
                role: 'MEMBER'
            }
        });
        res.json({ message: 'Invited' });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to invite' });
    }
}));
// Remove member
router.delete('/:id/members/:memberId', auth_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const workspaceId = req.params.id;
        const memberId = req.params.memberId;
        const ownerId = req.user.userId;
        // Check ownership
        const workspace = yield prisma.workspace.findUnique({
            where: { id: workspaceId }
        });
        if (!workspace)
            return res.status(404).json({ error: 'Workspace not found' });
        if (workspace.ownerId !== ownerId) {
            return res.status(403).json({ error: 'Only owner can remove members' });
        }
        if (memberId === ownerId) {
            return res.status(400).json({ error: 'Cannot remove owner' });
        }
        yield prisma.workspaceMember.deleteMany({
            where: {
                workspaceId,
                userId: memberId
            }
        });
        res.json({ message: 'Removed' });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to remove member' });
    }
}));
exports.default = router;
