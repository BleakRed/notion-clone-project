# GEMINI.md - Project Memory & Mandates

This file serves as the foundational context for the Notion Clone project. It outlines implemented features, architectural decisions, and technical mandates to ensure consistency across sessions.

## 🚀 Project Overview
A full-stack, real-time collaborative workspace (Notes, Files, Drawing) inspired by Notion, built with a focus on mobile responsiveness and GitHub-like resource management.

## 🛠 Technical Stack
- **Frontend**: Next.js (App Router), Tailwind CSS, Socket.io-client, Lucide React, highlight.js.
- **Backend**: Node.js, Express, Socket.io, Prisma ORM, Multer.
- **Database**: SQLite (local persistence).

## 📌 Foundational Mandates
- **Body Limits**: The Express JSON and URL-encoded limits are set to **50mb** to accommodate large base64 strings from high-resolution canvas drawings.
- **Styling**: Prefer Tailwind CSS for UI components and Vanilla CSS for custom animations/overrides.
- **Security**: Never commit `.env` files or sensitive credentials.
- **Caret-Based Cursors**: Collaborative cursors in the editor MUST track the **typing caret position** (insertion point), not the mouse pointer. Use the `getCaretCoordinates` helper for high precision.

## ✨ Implemented Features
- **Adaptive Dashboard**: Responsive grid showing workspaces with real-time member avatars and "+N" counts.
- **Collaborative Editor**: 
    - Real-time Markdown editing with live previews.
    - Caret-based cursors that scroll with the content.
    - Integrated "Link Resource" tool to embed workspace files/images directly.
- **GitHub-like File Explorer**:
    - Nested folder support with breadcrumb navigation.
    - File descriptions (commit-style) and search functionality.
    - **Code Preview**: Syntax-highlighted viewer for `.py`, `.js`, `.ts`, `.java`, `.json`, etc., using `highlight.js`.
- **Collaborative Drawing Canvas**:
    - Real-time stroke synchronization.
    - Drawing history (Undo), Eraser, Color/Width controls.
    - Save/Load system with a persistent history sidebar.
    - PNG Export/Download.
- **Profile System**: Users can update usernames and avatars, which sync across the dashboard and collaborative cursors.

## 🔍 Context for Continuation
- **Socket Rooms**:
    - Pages: `join-page` (room: `pageId`).
    - Drawing: `join-drawing` (room: `drawing-{workspaceId}`).
- **Cursor Logic**: Cursors are rendered inside a `relative` wrapper around the `textarea` to ensure they follow scroll and layout changes perfectly.
- **Database Status**: Managed via `prisma db push`. Current schema includes `Folder`, `File` (with description), and `Drawing` models.

---
*Last Updated: Thursday, March 5, 2026*
