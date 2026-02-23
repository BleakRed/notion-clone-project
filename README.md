# Notion Clone Project - Documentation

This project is a full-stack, real-time collaborative workspace application inspired by Notion. It allows users to create workspaces, invite/remove members, and edit pages with live synchronization across multiple clients.

## 🚀 Features

### 1. **Real-time Collaboration**
- **Live Editing:** Multiple users in the same workspace can edit the same page simultaneously. Changes are broadcasted instantly using **Socket.io**.
- **Room-based Synchronization:** Users only receive updates for the specific page they are currently viewing.

### 2. **Workspace & Member Management**
- **Personal & Shared Spaces:** Users can create multiple workspaces.
- **Owner-Only Privileges:** 
    - Only the workspace **Owner** can invite new members via email.
    - Only the **Owner** can remove members from the workspace.
- **Access Control:** Workspaces are private to their members. If a user is removed, they immediately lose access to the workspace.

### 3. **Page System**
- **Infinite Hierarchy (Database Ready):** Pages are linked to workspaces and support parent-child relationships (nested pages).
- **Persistent Storage:** All content is saved in a **SQLite3** database via **Prisma ORM**.

---

## 🛠 Tech Stack

### **Backend**
- **Node.js & Express:** Robust REST API for authentication and resource management.
- **Socket.io:** Powers the real-time bidirectional communication.
- **Prisma ORM:** Type-safe database access for SQLite.
- **JWT (JSON Web Tokens):** Secure authentication for all API endpoints.
- **Bcrypt.js:** Password hashing for security.

### **Frontend**
- **Next.js (App Router):** High-performance React framework for the UI.
- **Tailwind CSS:** Modern, utility-first styling for a clean, "Notion-like" aesthetic.
- **Socket.io-client:** Connects the browser to the real-time server.
- **Axios:** Handles API requests with interceptors for automatic token handling.
- **js-cookie:** Manages session tokens on the client side.

---

## 📂 Project Structure

```text
notion-clone-project/
├── backend/
│   ├── prisma/             # Database schema and migrations
│   ├── src/
│   │   ├── middleware/     # Auth & security middleware
│   │   ├── routes/         # API endpoints (auth, workspace, page)
│   │   ├── socket/         # Real-time event handlers
│   │   └── index.ts        # Server entry point
│   └── .env                # Backend configuration (PORT, JWT_SECRET)
├── frontend/
│   ├── src/
│   │   ├── app/            # Next.js pages (Dashboard, Workspace, Auth)
│   │   ├── components/     # Reusable UI components
│   │   └── lib/            # API and Socket clients
│   └── tailwind.config.ts  # Styling configuration
└── docker-compose.yml      # (Optional) Containerization setup
```

---

## 🗄 Database Model (Prisma)

- **User:** Stores credentials (hashed) and links to owned/joined workspaces.
- **Workspace:** Contains pages and a list of members. Tracks the `ownerId`.
- **WorkspaceMember:** A junction table that links users to workspaces with specific roles (OWNER/MEMBER).
- **Page:** Stores the title, content, and parent-child hierarchy.

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
   npx prisma migrate dev --name init
   npm run build
   npm start
   ```

2. **Frontend Setup:**
   ```bash
   cd ../frontend
   npm install
   npm run build
   npm start
   ```

3. **Usage:**
   - Navigate to `http://localhost:3000`.
   - Register a user and create a workspace.
   - Open another browser window, register a second user, and invite them using the owner's dashboard in the first window.

---

## 🛡 Security & Maintenance

- **Vulnerability Checks:** All packages have been audited and pinned to stable, vulnerability-free versions.
- **Database Safety:** SQLite is used for local persistence, making the project easy to set up without complex external database requirements.
- **Privilege Escalation Protection:** All sensitive actions (deleting members, inviting users) are verified on the backend to ensure only the owner can perform them.
