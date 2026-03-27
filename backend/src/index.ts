import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import workspaceRoutes from './routes/workspace';
import pageRoutes from './routes/page';
import uploadRoutes from './routes/upload';
import fileRoutes from './routes/file';
import drawingRoutes from './routes/drawing';
import chatRoutes from './routes/chat';
import kanbanRoutes from './routes/kanban';
import adminRoutes from './routes/admin';
import { setupSocket } from './socket';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // Allow all for dev
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/uploads', express.static('uploads'));

// Middleware to attach io to req
app.use((req: any, res, next) => {
    req.io = io;
    next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/pages', pageRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/drawings', drawingRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/kanban', kanbanRoutes);
app.use('/api/admin', adminRoutes);

// Socket
setupSocket(io);

const PORT = process.env.PORT || 8000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
