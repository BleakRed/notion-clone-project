# 📄 Notion Clone - System Documentation

This document provides a comprehensive technical overview of the Notion Clone project, including use cases, architectural diagrams, and data models.

---

## 🚀 1. Use Case Diagram & Scenarios

### 🛠 Core Use Cases
- **Authentication**: Users can sign up, log in, verify email, and reset passwords.
- **Workspace Management**: Owners can create workspaces, invite members, and manage roles.
- **Collaborative Page Editor**: Real-time Markdown editing with live cursor tracking.
- **GitHub-like File Explorer**: Upload, download, and preview files with syntax highlighting for code.
- **Collaborative Drawing Canvas**: Real-time sketching with room-based isolation and state synchronization.
- **Team Chat**: Instant messaging within workspaces.
- **Kanban Boards**: Task management with drag-and-drop, multi-assignment, and custom column colors.
- **Profile Management**: Update user profile details (avatar, username).

### 🎬 Key Scenarios
1.  **Real-time Collaboration**: Alice and Bob are in the same Page. Alice types; Bob sees the update instantly via Socket.io. Bob's cursor moves; Alice sees Bob's named cursor at the exact insertion point.
2.  **Resource Integration**: A developer uploads a `.py` script to the File Explorer. Another team member previews the code directly in the browser with syntax highlighting and then links it to a Kanban card.
3.  **Creative Brainstorming**: A team joins a "Drawing" room. New joiners automatically request the current canvas state from existing users to ensure everyone sees the same sketch.

---

## 📊 2. Database Schema (ERD/ORD)

The system uses **PostgreSQL** (managed via Prisma ORM) to persist workspace data.

### 📝 Entity Relationship Description
- **User**: The central entity. Owns workspaces, participates as a member, authors pages, files, and chat messages.
- **Workspace**: A container for all resources. Has a 1:N relationship with Pages, Files, Folders, Drawings, ChatRooms, and KanbanBoards.
- **WorkspaceMember**: A join table managing the M:N relationship between Users and Workspaces with specific roles (OWNER, ADMIN, MEMBER).
- **Page**: Support nested hierarchy (self-relation). Linked to a Workspace and an Author.
- **Folder/File**: Folders support nested hierarchy. Files belong to a Folder and a Workspace.
- **Kanban**: A Board contains Columns, which contain Cards. Cards can have multiple Assignees (Users).

---

## 🎨 3. PlantUML Diagrams

### 🏗 Class Diagram (Object-Relational View)
```plantuml
@startuml
class User {
  id: String
  email: String
  username: String
  avatarUrl: String
  isVerified: Boolean
}

class Workspace {
  id: String
  name: String
  ownerId: String
}

class Page {
  id: String
  title: String
  content: String
  parentId: String
}

class File {
  id: String
  name: String
  url: String
  type: String
}

class KanbanBoard {
  id: String
  title: String
}

class KanbanCard {
  id: String
  content: String
  columnId: String
}

User "1" -- "0..*" Workspace : owns
User "1" -- "0..*" WorkspaceMember : belongs to
Workspace "1" -- "0..*" WorkspaceMember : contains
Workspace "1" -- "0..*" Page : hosts
Workspace "1" -- "0..*" File : stores
Workspace "1" -- "0..*" KanbanBoard : has
KanbanBoard "1" -- "0..*" KanbanColumn : contains
KanbanColumn "1" -- "0..*" KanbanCard : contains
Page "1" -- "0..*" Page : children (nested)
@enduml
```

### 🔄 Sequence Diagram: Real-time Drawing Stroke
```plantuml
@startuml
actor UserA
participant "Frontend (UserA)" as ClientA
participant "Socket.io Server" as Server
participant "Frontend (UserB)" as ClientB
actor UserB

UserA -> ClientA: Draws stroke on canvas
ClientA -> Server: socket.emit('draw-stroke', data)
Server -> ClientB: socket.to(room).emit('stroke-received', data)
ClientB -> UserB: Renders stroke on canvas
@enduml
```

### 📉 State Chart Diagram: Kanban Card Lifecycle
```plantuml
@startuml
[*] --> ToDo : Card Created
ToDo --> InProgress : Dragged to In Progress
InProgress --> ToDo : Reverted
InProgress --> Done : Task Completed
Done --> InProgress : Reopened
Done --> [*] : Card Deleted
@enduml
```

### 🏃 Activity Diagram: User Registration & Verification
```plantuml
@startuml
start
:User submits Signup Form;
if (Valid Email & Password?) then (yes)
  :Create User in DB (isVerified=false);
  :Generate Verification Token;
  :Send Verification Email via Nodemailer;
  :Display "Check Email" Message;
  fork
    :User clicks link in email;
    :Update User (isVerified=true);
    :Redirect to Dashboard;
  detach
  fork again
    :Wait 1 Month;
    if (isVerified == false?) then (yes)
      :Run Cleanup Script (Cron);
      :Delete User & Resources (Cascade);
      :Delete Physical Files;
    endif
  end fork
else (no)
  :Show Error;
endif
stop
@enduml
```

### 🤝 Collaboration (Communication) Diagram: Real-time Page Edit
```plantuml
@startuml
agent "User A (Browser)" as UA
agent "User B (Browser)" as UB
boundary "Socket Server" as SS

UA -down-> SS : 1: update-page (content)
SS -down-> UB : 2: page-updated (content)
UB -up-> SS : 3: cursor-move (x, y)
SS -up-> UA : 4: cursor-updated (x, y)
@enduml
```

### 🧩 Component Diagram
```plantuml
@startuml
package "Frontend (Next.js)" {
  [App Router]
  [Collaborative Components]
  [Socket.io Client]
  [Tailwind CSS]
}

package "Backend (Node.js/Express)" {
  [Auth Middleware]
  [Socket.io Server]
  [Prisma Client]
  [Multer Upload]
}

database "PostgreSQL" {
  [Workspace Data]
}

[Socket.io Client] <--> [Socket.io Server] : WebSocket
[Collaborative Components] --> [Socket.io Client]
[App Router] --> [Auth Middleware] : HTTP API
[Auth Middleware] --> [Prisma Client]
[Prisma Client] --> [Workspace Data]
@enduml
```

### 🚢 Deployment Diagram
```plantuml
@startuml
node "Client Browser" {
  [Next.js App]
}

node "Cloud / Docker Host" {
  node "Web Server Container" {
    [Express API]
    [Socket.io Server]
  }
  
  node "Database Container" {
    [PostgreSQL Instance]
  }
  
  node "Storage" {
    [Uploaded Files]
  }
}

[Next.js App] -- [Express API] : HTTPS / WSS
[Express API] -- [PostgreSQL Instance] : TCP/IP (Prisma)
[Express API] -- [Uploaded Files] : FS
@enduml
```

### 🌐 Network Diagram
```plantuml
@startuml
nwdiag {
  network Internet {
    width = "full"
    description = "Public Network"
    Client_Browser [address = "User Device"];
  }
  
  network DMZ {
    address = "10.0.1.0/24"
    Reverse_Proxy [address = "10.0.1.1", description = "Nginx / Traefik"];
  }

  network App_Internal {
    address = "10.0.2.0/24"
    Reverse_Proxy;
    App_Server [address = "10.0.2.10", description = "Node.js App"];
    Database [address = "10.0.2.20", description = "PostgreSQL"];
  }
}
@enduml
```
