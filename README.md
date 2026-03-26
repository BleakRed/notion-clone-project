# Notion Clone Project - Documentation

This project is a full-stack, real-time collaborative workspace application inspired by Notion. It allows teams to manage pages, share files, draw together, chat, and manage tasks with Kanban boards in a unified, mobile-responsive environment.

## 🚀 Features

### 1. **Real-time Collaboration & Markdown**

- **Live Editing:** Multiple users in the same workspace can edit the same page simultaneously. Changes are broadcasted instantly using **Socket.io**.
- **Live Cursors:** See other users' cursor movements in real-time, tracked to the typing caret for precision.
- **Obsidian-like Rendering:** Supports **Markdown** with code syntax highlighting and GitHub-flavored markdown (GFM).
- **Markdown Export:** Download any page as a `.md` file for offline use or backup.

### 2. **GitHub-like File Explorer**

- **Nested Folders:** Organize project resources with an intuitive folder hierarchy and breadcrumb navigation.
- **Commit-style Descriptions:** Add descriptions to uploaded files to keep track of resource purpose and history.
- **Asset Previews:** Visual cards for images and dedicated icons for various file types.
- **Code Preview:** Built-in syntax highlighter for code files.

### 3. **Collaborative Drawing Canvas**

- **Shared Sketchpad:** Draw together in real-time with synchronized strokes and room-based isolation.
- **Isolated Editing:** Loading a saved drawing joins a dedicated room, preventing interference with the shared workspace canvas.
- **Advanced Tools:** Includes a Pen, Eraser, Undo functionality (stroke history), and customizable stroke widths/colors.
- **State Sync:** New users joining an active session automatically receive the current canvas state.

### 4. **Team Chat & Kanban**

- **Polished Team Chat:** Real-time instant messaging with dynamic bubbles, member avatars, and automatic scrolling.
- **Advanced Kanban Boards:** 
    - **Drag & Drop:** Move cards between columns seamlessly.
    - **Multi-Assignee:** Assign multiple team members to a single task.
    - **Custom Colors:** Personalize column aesthetics with a built-in color picker.
    - **Detailed Tasks:** Add rich descriptions and manage tasks via an intuitive modal.
    - **Animated UI:** Smooth transitions and layout adjustments.

### 5. **Modern UI/UX & Responsiveness**

- **Mobile Friendly:** Fully adaptive design optimized for all screen sizes.
- **Dark Mode Support:** System-synced and manual toggle for light/dark themes.
- **User Profiles:** Customize your identity with usernames and avatar uploads.

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

- **Large Payloads:** Express body limits increased to 50MB for high-res drawings.
- **Isolation:** Collaborative rooms are isolated per workspace/resource to prevent data leaks.
