# GEMINI.md - Project Memory & Mandates

This file serves as the foundational context for the Notion Clone project. It outlines implemented features, architectural decisions, and technical mandates to ensure consistency across sessions.

## 🚀 Project Overview
A full-stack, real-time collaborative workspace (Notes, Files, Drawing, Chat, Kanban) inspired by Notion, built with a focus on mobile responsiveness and GitHub-like resource management.

## 🛠 Technical Stack
- **Frontend**: Next.js (App Router), Tailwind CSS, Socket.io-client, Lucide React, highlight.js.
- **Backend**: Node.js, Express, Socket.io, Prisma ORM, Multer.
- **Database**: SQLite (local persistence).

## 📌 Foundational Mandates
- **Body Limits**: The Express JSON and URL-encoded limits are set to **50mb** to accommodate large base64 strings from high-resolution canvas drawings.
- **Styling**: Prefer Tailwind CSS for UI components and Vanilla CSS for custom animations/overrides.
- **Security**: Never commit `.env` files or sensitive credentials.
- **Caret-Based Cursors**: Collaborative cursors in the editor MUST track the **typing caret position** (insertion point), not the mouse pointer. Use the `getCaretCoordinates` helper for high precision.
- **Socket Isolation**: Always ensure `join-room` and `leave-room` logic is implemented for collaborative components (Editor, Canvas, Chat, Kanban) to prevent cross-workspace contamination.

## ✨ Implemented Features
- **Adaptive Dashboard**: Responsive grid showing workspaces with real-time member avatars and "+N" counts.
- **Collaborative Editor**: 
    - Real-time Markdown editing with live previews.
    - Caret-based cursors that scroll with the content.
    - Integrated "Link Resource" tool to embed workspace files/images directly.
    - **Markdown Export**: Download pages as `.md` files for offline use.
- **GitHub-like File Explorer**:
    - Nested folder support with breadcrumb navigation.
    - File descriptions (commit-style) and search functionality.
    - **Code Preview**: Syntax-highlighted viewer for `.py`, `.js`, `.ts`, `.java`, `.json`, etc., using `highlight.js`.
- **Collaborative Drawing Canvas**:
    - Real-time stroke synchronization with room-based isolation.
    - **Isolated Editing**: Loading a saved drawing now joins a dedicated room (`drawing-saved-{id}`), preventing interference with the general workspace canvas.
    - **New Canvas**: Users can switch back to a fresh, shared workspace canvas at any time.
    - State synchronization for new users joining an active canvas.
    - Drawing history (Undo), Eraser, Color/Width controls.
    - Save/Load system with a persistent history sidebar.
    - PNG Export/Download.
- **Team Chat**: Real-time persistent chat within workspaces with message history and member avatars.
- **Kanban Boards**: 
    - Create multiple boards with columns and cards. 
    - **Drag & Drop**: Native HTML5 drag and drop for moving cards between columns.
    - **Multi-Assignment**: Assign multiple team members to a single card.
    - **Custom Aesthetics**: Color picker for columns (defaults: Red for To Do, Yellow for In Progress, Green for Done).
    - **Detailed Tasks**: Task descriptions and title editing via a dedicated card modal.
    - Collaborative updates via Socket.io.
- **Profile System**: Users can update usernames and avatars, which sync across the dashboard and collaborative cursors.

## 🔍 Context for Continuation
- **Socket Rooms**:
    - Pages: `join-page` (room: `pageId`).
    - Drawing: `join-drawing` (room: `drawing-{workspaceId}`).
    - Chat: `join-chat` (room: `chat-{workspaceId}`).
    - Kanban: `join-kanban` (room: `kanban-{boardId}`).
- **Cursor Logic**: Cursors are rendered inside a `relative` wrapper around the `textarea` to ensure they follow scroll and layout changes perfectly.
- **Database Status**: Managed via `prisma db push`. Schema includes `Folder`, `File`, `Drawing`, `ChatMessage`, `KanbanBoard`, `KanbanColumn`, and `KanbanCard`.

---
*Last Updated: Thursday, March 26, 2026*
