"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupSocket = void 0;
const setupSocket = (io) => {
    io.on('connection', (socket) => {
        console.log('User connected:', socket.id);
        socket.on('join-page', (pageId) => {
            socket.join(pageId);
            console.log(`Socket ${socket.id} joined page ${pageId}`);
        });
        socket.on('leave-page', (pageId) => {
            socket.leave(pageId);
            console.log(`Socket ${socket.id} left page ${pageId}`);
        });
        socket.on('update-page', (data) => {
            // Broadcast to others in the room
            socket.to(data.pageId).emit('page-updated', data.content);
        });
        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.id);
        });
    });
};
exports.setupSocket = setupSocket;
