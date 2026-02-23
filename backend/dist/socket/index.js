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
            // Notify others that this user left
            socket.to(pageId).emit('user-left', socket.id);
        });
        socket.on('cursor-move', (data) => {
            socket.to(data.pageId).emit('cursor-updated', {
                userId: socket.id,
                userName: data.userName,
                x: data.x,
                y: data.y
            });
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
