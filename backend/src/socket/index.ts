import { Server, Socket } from 'socket.io';

export const setupSocket = (io: Server) => {
  io.on('connection', (socket: Socket) => {
    console.log('User connected:', socket.id);

    socket.on('join-page', (pageId: string) => {
      socket.join(pageId);
      console.log(`Socket ${socket.id} joined page ${pageId}`);
    });

    socket.on('leave-page', (pageId: string) => {
      socket.leave(pageId);
      console.log(`Socket ${socket.id} left page ${pageId}`);
      // Notify others that this user left
      socket.to(pageId).emit('user-left', socket.id);
    });

    socket.on('cursor-move', (data: { pageId: string, x: number, y: number, userName: string }) => {
      socket.to(data.pageId).emit('cursor-updated', {
        userId: socket.id,
        userName: data.userName,
        x: data.x,
        y: data.y
      });
    });

    socket.on('update-page', (data: { pageId: string, content: string }) => {
      // Broadcast to others in the room
      socket.to(data.pageId).emit('page-updated', data.content);
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });
};
