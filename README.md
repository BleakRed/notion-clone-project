# Notion Clone Project - Documentation

This project is a full-stack, real-time collaborative workspace application inspired by Notion. It allows teams to manage pages, share files, draw together, chat, and manage tasks with Kanban boards in a unified, mobile-responsive environment.

## 🚀 Features

### 1. **Real-time Collaboration & Markdown**

- **Live Editing:** Multiple users in the same workspace can edit the same page simultaneously. Changes are broadcasted instantly using **Socket.io**.
- **Live Cursors:** See other users' cursor movements in real-time, tracked to the typing caret for precision.
- **Obsidian-like Rendering:** Supports **Markdown** with code syntax highlighting and GitHub-flavored markdown (GFM).

### 2. **GitHub-like File Explorer**

- **Nested Folders:** Organize project resources with an intuitive folder hierarchy and breadcrumb navigation.
- **Commit-style Descriptions:** Add descriptions to uploaded files to keep track of resource purpose and history.
- **Asset Previews:** Visual cards for images and dedicated icons for various file types.
- **Code Preview:** Built-in syntax highlighter for code files.

### 3. **Collaborative Drawing Canvas**

- **Shared Sketchpad:** Draw together in real-time with synchronized strokes and room-based isolation.
- **Advanced Tools:** Includes a Pen, Eraser, Undo functionality (stroke history), and customizable stroke widths/colors.
- **Persistent Drawings:** Save your sketches to the workspace, browse drawing history, and download creations as PNG files.
- **State Sync:** New users joining an active session automatically receive the current canvas state.

### 4. **Team Chat & Kanban**

- **Real-time Chat:** Instant messaging within the workspace to coordinate with team members.
- **Task Management:** Create multiple Kanban boards with customizable columns to track project progress.

### 5. **Modern UI/UX & Responsiveness**

- **Mobile Friendly:** Fully adaptive design optimized for mobile, tablet, and desktop screens.
- **Dark Mode Support:** A built-in toggle to switch between Light and Dark themes.
- **User Profiles:** Customize your username and avatar to personalize your presence.

### 6. **Workspace & Member Management**

- **Owner Privileges:** Manage workspace membership (invites and removals).
- **Access Control:** Strict authorization ensures only members can access workspace data.

---

## 🛠 Tech Stack

### **Backend**

- **Node.js & Express:** Robust REST API.
- **Socket.io:** Powers real-time features.
- **Prisma ORM:** Type-safe database access for SQLite.
- **JWT:** Secure authentication.

### **Frontend**

- **Next.js (App Router):** High-performance React framework.
- **Tailwind CSS:** Modern utility-first styling.
- **Lucide React:** Iconography.
- **Axios:** API client with interceptors.

---

## 📂 Project Structure

```text
notion-clone-project/
├── backend/
│   ├── prisma/             # Database schema (User, Workspace, Page, File, Drawing, Chat, Kanban)
│   ├── src/
│   │   ├── middleware/     # Auth middleware
│   │   ├── routes/         # API endpoints (auth, workspace, page, file, drawing, chat, kanban)
│   │   ├── socket/         # Real-time event handlers
│   │   └── index.ts        # Server entry point
│   └── uploads/            # Storage for uploaded assets
├── frontend/
│   ├── src/
│   │   ├── app/            # Next.js pages
│   │   ├── components/     # UI components (Chat, Kanban, DrawingCanvas, etc.)
│   │   └── lib/            # API and Socket clients
└── docker-compose.yml      # (Optional) Containerization setup
```

---

## 🚦 Getting Started

### Prerequisites

- Node.js (v18+)
- npm

### Installation & Running

1. **Backend Setup:**

   ```bash
   cd backend
   npm install
   npx prisma db push
   npm run dev
   ```

2. **Frontend Setup:**

   ```bash
   cd ../frontend
   npm install
   npm run dev
   ```

3. **Usage:**
   - Navigate to `http://localhost:3000`.
   - Register a user and create a workspace.
   - Use the sidebar to switch between Pages, Files, Canvas, Chat, and Kanban.

---

## 🛡 Security & Maintenance

- **Data Integrity:** SQLite persistence with Prisma migrations.
- **Large Payloads:** Express body limits increased to 50MB for high-res drawings.
- **Isolation:** Collaborative rooms are isolated per workspace/resource to prevent data leaks.
