# ⚡ Jira Clone with Native Model Context Protocol (MCP) Support

A full-stack, lightweight Jira-inspired agile project management application built with **Node.js/Express**, **MongoDB Atlas**, **HTML/CSS/Vanilla JavaScript**, and complete **Model Context Protocol (MCP)** integration.

---

## ✨ Features

- **Agile Project Management**:
  - **Kanban Board**: Drag-and-drop workflow across columns (*To Do*, *In Progress*, *In Review*, *Done*).
  - **Backlog & Sprints**: Sprint planning container and backlog queue with story point totals.
  - **All Issues Table**: Filterable and searchable table view of all project tickets.
  - **Project Metrics**: Visual progress bar, completion rate %, issue count by status and type.
- **Issue Lifecycle**:
  - Standard Jira types: 📗 **Story**, 📘 **Task**, 📕 **Bug**, ⚡ **Epic**.
  - Priority levels: *Highest*, *High*, *Medium*, *Low*, *Lowest*.
  - Assignee picker, story point estimation, labels/tags.
  - Issue detail drawer with editable summary/description, comments feed, and changelog audit.
  - Quick "+ Create" modal accessible anytime (or press shortcut <kbd>C</kbd>).
- **Email & Password Authentication**:
  - Secure registration & login with **bcrypt** password hashing and **JWT** session tokens.
  - 1-Click Demo login buttons for quick access (*Alex - Product Lead*, *Sarah - Senior Dev*).
- **MongoDB Atlas Backend**:
  - Native Mongoose models with validation and atomic issue counter incrementing (`PLAT-1`, `PLAT-2`).
  - Seamless fallback to an embedded local store if `MONGODB_URI` is not yet configured, allowing zero-friction instant startup!
- **Model Context Protocol (MCP) Server**:
  - Standard **JSON-RPC 2.0** over `stdio` (`server/mcp/stdio.js`) and HTTP/SSE (`/api/mcp`).
  - Allows autonomous AI agents (**Claude Desktop**, **Antigravity**, **Cursor**) to list projects, query issues, create tickets, change status, and post comments.
  - In-app **MCP Playground** to test tools live and inspect requests/responses in real-time.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure MongoDB Atlas (Optional but Recommended)
Open or create `.env` in the project root:
```ini
PORT=3000
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.abcde.mongodb.net/jira-clone?retryWrites=true&w=majority
JWT_SECRET=jira-clone-jwt-super-secret-key-2026
```
> **Note**: If `MONGODB_URI` is left blank, the app runs smoothly with the built-in storage engine and indicates status in the top bar.

### 3. Start the Web Application
```bash
npm start
```
Open your browser at: **[http://localhost:3000](http://localhost:3000)**

### 4. Preloaded Demo Accounts
| Name | Email | Password | Role |
| :--- | :--- | :--- | :--- |
| **Alex Johnson** | `alex@company.com` | `password123` | Product Lead (Admin) |
| **Sarah Chen** | `sarah@company.com` | `password123` | Senior Dev |
| **David Miller** | `david@company.com` | `password123` | QA Specialist |

*(Or click any of the 1-Click Demo buttons on the sign-in screen)*

---

## 🤖 Model Context Protocol (MCP) Integration

This application can act as an MCP server for any MCP-compliant AI assistant.

### Method 1: Claude Desktop / Antigravity via Stdio
Add this entry to your `claude_desktop_config.json` (or Antigravity MCP settings):

```json
{
  "mcpServers": {
    "jira-clone": {
      "command": "node",
      "args": ["/Users/bharath/Desktop/jiraClon/server/mcp/stdio.js"]
    }
  }
}
```

### Method 2: HTTP / SSE Endpoints
The running server exposes:
- **Tools Specification**: `GET http://localhost:3000/api/mcp/tools`
- **JSON-RPC 2.0 Endpoint**: `POST http://localhost:3000/api/mcp/rpc`
- **SSE Stream**: `GET http://localhost:3000/api/mcp/sse`

### Available MCP Tools
| Tool Name | Description | Key Parameters |
| :--- | :--- | :--- |
| `jira_list_projects` | List all projects with key, name, and lead | `{}` |
| `jira_create_project` | Create a new project | `name`, `key`, `description`, `leadEmail` |
| `jira_list_issues` | Filter tickets by project, status, type, priority, or search text | `projectKey`, `status`, `type`, `priority`, `search` |
| `jira_get_issue` | Retrieve full details of an issue by key (e.g. `PLAT-1`) | `issueKey` |
| `jira_create_issue` | Create a new ticket / user story / bug | `projectKey`, `summary`, `type`, `priority`, `storyPoints`, `assigneeEmail` |
| `jira_update_issue_status` | Move ticket across Kanban columns | `issueKey`, `status` (`To Do`, `In Progress`, `In Review`, `Done`) |
| `jira_update_issue` | Modify title, description, points, or assignee | `issueKey`, `summary`, `description`, `storyPoints`, `assigneeEmail` |
| `jira_add_comment` | Post an update or note to an issue | `issueKey`, `comment`, `authorEmail` |
| `jira_get_project_summary` | Get progress metrics, completion %, and story points | `projectKey` |

---

## 📁 Project Structure

```
jiraClon/
├── server/
│   ├── index.js              # Express app & static file server
│   ├── config/
│   │   └── db.js             # MongoDB Atlas connection handler
│   ├── models/               # Mongoose schemas
│   │   ├── User.js           # User credentials & avatars
│   │   ├── Project.js        # Projects & issue counter
│   │   ├── Issue.js          # Issues, types, priorities & history
│   │   └── Comment.js        # Ticket comments
│   ├── services/
│   │   └── dataService.js    # Data layer with MongoDB & fallback logic
│   ├── middleware/
│   │   └── auth.js           # JWT authentication middleware
│   ├── routes/
│   │   ├── authRoutes.js     # /api/auth (register, login, users)
│   │   ├── projectRoutes.js  # /api/projects
│   │   ├── issueRoutes.js    # /api/issues
│   │   └── mcpRoutes.js      # /api/mcp (HTTP, SSE & JSON-RPC)
│   └── mcp/
│       ├── tools.js          # MCP Tool definitions & dispatcher
│       └── stdio.js          # Stdio transport MCP server
├── public/
│   ├── index.html            # Main UI SPA
│   ├── css/
│   │   └── style.css         # Atlassian/Jira inspired styling & dark accents
│   └── js/
│       ├── api.js            # REST API client
│       ├── auth.js           # Session & user state
│       ├── board.js          # HTML5 Drag-and-drop Kanban board
│       ├── backlog.js        # Backlog & table views
│       ├── modal.js          # Create & detail modals
│       ├── mcp.js            # In-app MCP playground
│       └── app.js            # Application bootstrap & routing
├── .env.example              # Environment variables template
├── package.json              # Dependencies & scripts
└── README.md                 # Documentation
```

---

## 💻 Tech Stack
- **Backend**: Node.js, Express, Mongoose, JWT (`jsonwebtoken`), bcrypt (`bcryptjs`), CORS.
- **Frontend**: Semantic HTML5, CSS3 (Modern Flexbox/Grid, Atlassian Design System palette), Vanilla ES6+ JavaScript.
- **Database**: MongoDB Atlas (`mongodb+srv`).
- **AI / Agent Protocol**: Model Context Protocol (MCP) JSON-RPC 2.0 (stdio and SSE).

