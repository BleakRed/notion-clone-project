"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const auth_1 = __importDefault(require("./routes/auth"));
const workspace_1 = __importDefault(require("./routes/workspace"));
const page_1 = __importDefault(require("./routes/page"));
const upload_1 = __importDefault(require("./routes/upload"));
const file_1 = __importDefault(require("./routes/file"));
const drawing_1 = __importDefault(require("./routes/drawing"));
const chat_1 = __importDefault(require("./routes/chat"));
const kanban_1 = __importDefault(require("./routes/kanban"));
const socket_1 = require("./socket");
dotenv_1.default.config();
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: '*', // Allow all for dev
        methods: ['GET', 'POST']
    }
});
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: '50mb' }));
app.use(express_1.default.urlencoded({ limit: '50mb', extended: true }));
app.use('/uploads', express_1.default.static('uploads'));
// Routes
app.use('/api/auth', auth_1.default);
app.use('/api/workspaces', workspace_1.default);
app.use('/api/pages', page_1.default);
app.use('/api/upload', upload_1.default);
app.use('/api/files', file_1.default);
app.use('/api/drawings', drawing_1.default);
app.use('/api/chat', chat_1.default);
app.use('/api/kanban', kanban_1.default);
// Socket
(0, socket_1.setupSocket)(io);
const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
