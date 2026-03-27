import { Server, Socket } from 'socket.io';

export const setupSocket = (io: Server) => {
  io.on('connection', (socket: Socket) => {
    console.log('User connected:', socket.id);

    // Page Events
    socket.on('join-page', (pageId: string) => {
      socket.join(pageId);
      console.log(`Socket ${socket.id} joined page ${pageId}`);
    });

    socket.on('leave-page', (pageId: string) => {
      socket.leave(pageId);
      console.log(`Socket ${socket.id} left page ${pageId}`);
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
      socket.to(data.pageId).emit('page-updated', data.content);
    });

    // Drawing Events
    socket.on('join-drawing', async (roomName: string) => {
        const existingUsers = await io.in(roomName).fetchSockets();
        
        socket.join(roomName);
        console.log(`Socket ${socket.id} joined drawing room ${roomName}`);

        // If there are other users, request state from one of them
        if (existingUsers.length > 0) {
            const firstUser = existingUsers[0].id;
            io.to(firstUser).emit('request-canvas-state', socket.id);
        }
    });

    socket.on('leave-drawing', (roomName: string) => {
        socket.leave(roomName);
        console.log(`Socket ${socket.id} left drawing room ${roomName}`);
    });

    socket.on('canvas-state-sent', (data: { targetId: string, state: string }) => {
        io.to(data.targetId).emit('canvas-state-received', data.state);
    });

    socket.on('draw-stroke', (data: { roomName: string, x1: number, y1: number, x2: number, y2: number, color: string, lineWidth: number }) => {
        socket.to(data.roomName).emit('stroke-received', data);
    });

    socket.on('clear-drawing', (roomName: string) => {
        socket.to(roomName).emit('drawing-cleared');
    });

    // Chat Events
    socket.on('join-chat', (roomId: string) => {
        socket.join(`chat-room-${roomId}`);
        console.log(`Socket ${socket.id} joined chat room ${roomId}`);
    });

    socket.on('leave-chat', (roomId: string) => {
        socket.leave(`chat-room-${roomId}`);
        console.log(`Socket ${socket.id} left chat room ${roomId}`);
    });

    // Kanban Events
    socket.on('join-kanban', (boardId: string) => {
        socket.join(`kanban-${boardId}`);
        console.log(`Socket ${socket.id} joined kanban board ${boardId}`);
    });

    socket.on('leave-kanban', (boardId: string) => {
        socket.leave(`kanban-${boardId}`);
        console.log(`Socket ${socket.id} left kanban board ${boardId}`);
    });

    socket.on('update-kanban', (boardId: string) => {
        socket.to(`kanban-${boardId}`).emit('kanban-updated');
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });
};
