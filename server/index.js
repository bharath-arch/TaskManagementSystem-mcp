require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { connectDB } = require('./config/db');
const { seedInitialData } = require('./services/dataService');

const authRoutes = require('./routes/authRoutes');
const projectRoutes = require('./routes/projectRoutes');
const issueRoutes = require('./routes/issueRoutes');
const mcpRoutes = require('./routes/mcpRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../public')));

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/issues', issueRoutes);
app.use('/api/mcp', mcpRoutes);

// Fallback for single-page app
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Central error handling
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

async function startServer() {
  try {
    // Attempt DB connection (MongoDB Atlas)
    await connectDB();

    // Seed demo data if database/store is empty
    await seedInitialData();

    app.listen(PORT, () => {
      console.log('\n======================================================');
      console.log(`🚀 Jira Clone + MCP Server running on: http://localhost:${PORT}`);
      console.log(`📡 MCP Tools endpoint: http://localhost:${PORT}/api/mcp/tools`);
      console.log(`🔌 MCP JSON-RPC: http://localhost:${PORT}/api/mcp/rpc`);
      console.log(`⚡ MCP SSE Stream: http://localhost:${PORT}/api/mcp/sse`);
      console.log('======================================================\n');
    });
  } catch (err) {
    console.error('Fatal startup error:', err);
    process.exit(1);
  }
}

startServer();

