const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Project = require('../models/Project');
const Issue = require('../models/Issue');
const Comment = require('../models/Comment');

// Memory store fallback in case MongoDB Atlas is not yet connected
const memoryStore = {
  users: [],
  projects: [],
  issues: [],
  comments: []
};

function isDbConnected() {
  return mongoose.connection.readyState === 1;
}

// Generate simple unique ID for memory store
function genId() {
  return new mongoose.Types.ObjectId().toString();
}

// ================= USER SERVICES =================

async function findUserByEmail(email) {
  if (!email) return null;
  const cleanEmail = email.toLowerCase().trim();
  if (isDbConnected()) {
    return await User.findOne({ email: cleanEmail });
  }
  return memoryStore.users.find(u => u.email.toLowerCase() === cleanEmail) || null;
}

async function findUserById(id) {
  if (!id) return null;
  if (isDbConnected()) {
    return await User.findById(id).select('-password');
  }
  const u = memoryStore.users.find(u => u._id.toString() === id.toString());
  if (!u) return null;
  const { password, ...safeUser } = u;
  return safeUser;
}

async function createUser({ name, email, password, role = 'member' }) {
  const cleanEmail = email.toLowerCase().trim();
  if (isDbConnected()) {
    const existing = await User.findOne({ email: cleanEmail });
    if (existing) throw new Error('User with this email already exists');
    const user = new User({ name, email: cleanEmail, password, role });
    await user.save();
    return user.toJSON();
  }

  const existing = memoryStore.users.find(u => u.email.toLowerCase() === cleanEmail);
  if (existing) throw new Error('User with this email already exists');

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);
  const user = {
    _id: genId(),
    name: name.trim(),
    email: cleanEmail,
    password: passwordHash,
    avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name.trim())}`,
    role,
    createdAt: new Date()
  };
  memoryStore.users.push(user);
  const { password: _, ...safeUser } = user;
  return safeUser;
}

async function listUsers() {
  if (isDbConnected()) {
    return await User.find({}).select('-password').sort({ name: 1 });
  }
  return memoryStore.users.map(({ password, ...u }) => u);
}

async function verifyUserPassword(user, password) {
  if (!user || !user.password) return false;
  return await bcrypt.compare(password, user.password);
}

// ================= PROJECT SERVICES =================

async function listProjects(userId = null) {
  if (isDbConnected()) {
    return await Project.find({})
      .populate('lead', 'name email avatar')
      .populate('members', 'name email avatar')
      .sort({ createdAt: -1 });
  }
  return memoryStore.projects.map(p => ({
    ...p,
    lead: memoryStore.users.find(u => u._id.toString() === (p.lead?._id || p.lead)?.toString()) || null,
    members: (p.members || []).map(mId => memoryStore.users.find(u => u._id.toString() === (mId?._id || mId)?.toString()) || null).filter(Boolean)
  }));
}

async function getProjectById(id) {
  if (!id) return null;
  if (isDbConnected()) {
    return await Project.findById(id)
      .populate('lead', 'name email avatar')
      .populate('members', 'name email avatar');
  }
  const p = memoryStore.projects.find(p => p._id.toString() === id.toString());
  if (!p) return null;
  return {
    ...p,
    lead: memoryStore.users.find(u => u._id.toString() === (p.lead?._id || p.lead)?.toString()) || null,
    members: (p.members || []).map(mId => memoryStore.users.find(u => u._id.toString() === (mId?._id || mId)?.toString()) || null).filter(Boolean)
  };
}

async function getProjectByKey(key) {
  if (!key) return null;
  const upperKey = key.toUpperCase().trim();
  if (isDbConnected()) {
    return await Project.findOne({ key: upperKey })
      .populate('lead', 'name email avatar')
      .populate('members', 'name email avatar');
  }
  const p = memoryStore.projects.find(p => p.key === upperKey);
  if (!p) return null;
  return {
    ...p,
    lead: memoryStore.users.find(u => u._id.toString() === (p.lead?._id || p.lead)?.toString()) || null,
    members: (p.members || []).map(mId => memoryStore.users.find(u => u._id.toString() === (mId?._id || mId)?.toString()) || null).filter(Boolean)
  };
}

async function createProject({ name, key, description = '', leadId, memberIds = [] }) {
  const upperKey = key.toUpperCase().trim();
  if (isDbConnected()) {
    const existing = await Project.findOne({ key: upperKey });
    if (existing) throw new Error(`Project key "${upperKey}" is already in use`);

    const members = Array.from(new Set([leadId, ...memberIds].filter(Boolean)));
    const project = new Project({
      name: name.trim(),
      key: upperKey,
      description: description.trim(),
      lead: leadId,
      members,
      issueCounter: 0
    });
    await project.save();
    return await getProjectById(project._id);
  }

  const existing = memoryStore.projects.find(p => p.key === upperKey);
  if (existing) throw new Error(`Project key "${upperKey}" is already in use`);

  const members = Array.from(new Set([leadId, ...memberIds].filter(Boolean)));
  const project = {
    _id: genId(),
    name: name.trim(),
    key: upperKey,
    description: description.trim(),
    lead: leadId,
    members,
    issueCounter: 0,
    createdAt: new Date()
  };
  memoryStore.projects.push(project);
  return await getProjectById(project._id);
}

// ================= ISSUE SERVICES =================

async function listIssues({ projectId = null, projectKey = null, status = null, assigneeId = null, type = null, priority = null, search = null }) {
  let projId = projectId;
  if (!projId && projectKey) {
    const proj = await getProjectByKey(projectKey);
    if (!proj) return [];
    projId = proj._id;
  }

  if (isDbConnected()) {
    const filter = {};
    if (projId) filter.project = projId;
    if (status) filter.status = status;
    if (assigneeId) filter.assignee = assigneeId;
    if (type) filter.type = type;
    if (priority) filter.priority = priority;
    if (search) {
      filter.$or = [
        { summary: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { issueKey: { $regex: search, $options: 'i' } }
      ];
    }
    return await Issue.find(filter)
      .populate('project', 'name key')
      .populate('assignee', 'name email avatar')
      .populate('reporter', 'name email avatar')
      .sort({ order: 1, createdAt: -1 });
  }

  return memoryStore.issues
    .filter(issue => {
      if (projId && issue.project.toString() !== projId.toString()) return false;
      if (status && issue.status !== status) return false;
      if (assigneeId && (issue.assignee?._id || issue.assignee)?.toString() !== assigneeId.toString()) return false;
      if (type && issue.type !== type) return false;
      if (priority && issue.priority !== priority) return false;
      if (search) {
        const s = search.toLowerCase();
        const match = issue.summary.toLowerCase().includes(s) ||
                      (issue.description && issue.description.toLowerCase().includes(s)) ||
                      issue.issueKey.toLowerCase().includes(s);
        if (!match) return false;
      }
      return true;
    })
    .map(populateMemoryIssue)
    .sort((a, b) => (a.order || 0) - (b.order || 0));
}

function populateMemoryIssue(issue) {
  const proj = memoryStore.projects.find(p => p._id.toString() === (issue.project?._id || issue.project)?.toString());
  const assignee = memoryStore.users.find(u => u._id.toString() === (issue.assignee?._id || issue.assignee)?.toString());
  const reporter = memoryStore.users.find(u => u._id.toString() === (issue.reporter?._id || issue.reporter)?.toString());
  return {
    ...issue,
    project: proj ? { _id: proj._id, name: proj.name, key: proj.key } : issue.project,
    assignee: assignee ? { _id: assignee._id, name: assignee.name, email: assignee.email, avatar: assignee.avatar } : null,
    reporter: reporter ? { _id: reporter._id, name: reporter.name, email: reporter.email, avatar: reporter.avatar } : null
  };
}

async function getIssueById(id) {
  if (!id) return null;
  if (isDbConnected()) {
    return await Issue.findById(id)
      .populate('project', 'name key')
      .populate('assignee', 'name email avatar')
      .populate('reporter', 'name email avatar');
  }
  const issue = memoryStore.issues.find(i => i._id.toString() === id.toString());
  return issue ? populateMemoryIssue(issue) : null;
}

async function getIssueByKey(key) {
  if (!key) return null;
  const upperKey = key.toUpperCase().trim();
  if (isDbConnected()) {
    return await Issue.findOne({ issueKey: upperKey })
      .populate('project', 'name key')
      .populate('assignee', 'name email avatar')
      .populate('reporter', 'name email avatar');
  }
  const issue = memoryStore.issues.find(i => i.issueKey === upperKey);
  return issue ? populateMemoryIssue(issue) : null;
}

async function createIssue({
  projectId,
  summary,
  description = '',
  type = 'Task',
  status = 'To Do',
  priority = 'Medium',
  storyPoints = null,
  assigneeId = null,
  reporterId,
  labels = [],
  dueDate = null
}) {
  if (!summary || !summary.trim()) throw new Error('Issue summary/title is required');

  if (isDbConnected()) {
    const project = await Project.findById(projectId);
    if (!project) throw new Error('Project not found');

    project.issueCounter += 1;
    await project.save();

    const issueKey = `${project.key}-${project.issueCounter}`;
    const issue = new Issue({
      project: project._id,
      issueKey,
      summary: summary.trim(),
      description: description.trim(),
      type,
      status,
      priority,
      storyPoints: storyPoints ? Number(storyPoints) : null,
      assignee: assigneeId || null,
      reporter: reporterId,
      labels: Array.isArray(labels) ? labels : (labels ? labels.split(',').map(s => s.trim()) : []),
      dueDate: dueDate ? new Date(dueDate) : null,
      history: [{
        field: 'status',
        from: '',
        to: status,
        changedBy: reporterId,
        changedAt: new Date()
      }]
    });
    await issue.save();
    return await getIssueById(issue._id);
  }

  const project = memoryStore.projects.find(p => p._id.toString() === projectId.toString());
  if (!project) throw new Error('Project not found');

  project.issueCounter = (project.issueCounter || 0) + 1;
  const issueKey = `${project.key}-${project.issueCounter}`;

  const issue = {
    _id: genId(),
    project: project._id,
    issueKey,
    summary: summary.trim(),
    description: description.trim(),
    type,
    status,
    priority,
    storyPoints: storyPoints ? Number(storyPoints) : null,
    assignee: assigneeId || null,
    reporter: reporterId,
    labels: Array.isArray(labels) ? labels : (labels ? labels.split(',').map(s => s.trim()) : []),
    order: memoryStore.issues.filter(i => i.status === status).length,
    dueDate: dueDate ? new Date(dueDate) : null,
    history: [{
      field: 'status',
      from: '',
      to: status,
      changedBy: reporterId,
      changedAt: new Date()
    }],
    createdAt: new Date(),
    updatedAt: new Date()
  };

  memoryStore.issues.push(issue);
  return populateMemoryIssue(issue);
}

async function updateIssue(idOrKey, updates, changedById = null) {
  let issue = await (mongoose.Types.ObjectId.isValid(idOrKey) ? getIssueById(idOrKey) : getIssueByKey(idOrKey));
  if (!issue) throw new Error(`Issue not found: ${idOrKey}`);

  const historyEntries = [];
  const allowedFields = ['summary', 'description', 'type', 'status', 'priority', 'storyPoints', 'assignee', 'labels', 'dueDate', 'order'];

  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      let oldVal = issue[field];
      let newVal = updates[field];

      if (field === 'assignee') {
        const oldId = oldVal?._id || oldVal;
        const newId = newVal?._id || newVal;
        if (String(oldId || '') !== String(newId || '')) {
          historyEntries.push({
            field: 'assignee',
            from: oldVal?.name || String(oldId || 'Unassigned'),
            to: newVal ? String(newId) : 'Unassigned',
            changedBy: changedById,
            changedAt: new Date()
          });
        }
      } else if (String(oldVal || '') !== String(newVal || '')) {
        historyEntries.push({
          field,
          from: String(oldVal ?? ''),
          to: String(newVal ?? ''),
          changedBy: changedById,
          changedAt: new Date()
        });
      }
    }
  }

  if (isDbConnected()) {
    const rawIssue = await Issue.findById(issue._id);
    if (!rawIssue) throw new Error('Issue not found in database');

    Object.assign(rawIssue, updates);
    if (historyEntries.length > 0) {
      rawIssue.history.push(...historyEntries);
    }
    rawIssue.updatedAt = new Date();
    await rawIssue.save();
    return await getIssueById(rawIssue._id);
  }

  const memIndex = memoryStore.issues.findIndex(i => i._id.toString() === issue._id.toString());
  if (memIndex === -1) throw new Error('Issue not found in memory store');

  const memIssue = memoryStore.issues[memIndex];
  Object.assign(memIssue, updates, {
    updatedAt: new Date()
  });
  if (!memIssue.history) memIssue.history = [];
  if (historyEntries.length > 0) {
    memIssue.history.push(...historyEntries);
  }
  return populateMemoryIssue(memIssue);
}

async function deleteIssue(idOrKey) {
  let issue = await (mongoose.Types.ObjectId.isValid(idOrKey) ? getIssueById(idOrKey) : getIssueByKey(idOrKey));
  if (!issue) return false;

  if (isDbConnected()) {
    await Issue.findByIdAndDelete(issue._id);
    await Comment.deleteMany({ issue: issue._id });
    return true;
  }

  memoryStore.issues = memoryStore.issues.filter(i => i._id.toString() !== issue._id.toString());
  memoryStore.comments = memoryStore.comments.filter(c => c.issue.toString() !== issue._id.toString());
  return true;
}

// ================= COMMENT SERVICES =================

async function listCommentsByIssue(issueId) {
  if (isDbConnected()) {
    return await Comment.find({ issue: issueId })
      .populate('author', 'name email avatar')
      .sort({ createdAt: 1 });
  }

  return memoryStore.comments
    .filter(c => c.issue.toString() === issueId.toString())
    .map(c => ({
      ...c,
      author: memoryStore.users.find(u => u._id.toString() === (c.author?._id || c.author)?.toString()) || null
    }))
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}

async function addComment({ issueId, authorId, content }) {
  if (!content || !content.trim()) throw new Error('Comment content cannot be empty');

  if (isDbConnected()) {
    const comment = new Comment({
      issue: issueId,
      author: authorId,
      content: content.trim()
    });
    await comment.save();
    return await Comment.findById(comment._id).populate('author', 'name email avatar');
  }

  const comment = {
    _id: genId(),
    issue: issueId,
    author: authorId,
    content: content.trim(),
    createdAt: new Date(),
    updatedAt: new Date()
  };
  memoryStore.comments.push(comment);

  const author = memoryStore.users.find(u => u._id.toString() === authorId.toString());
  return {
    ...comment,
    author: author ? { _id: author._id, name: author.name, email: author.email, avatar: author.avatar } : null
  };
}

// ================= STATS / SUMMARY =================

async function getProjectStats(projectIdOrKey) {
  let project = mongoose.Types.ObjectId.isValid(projectIdOrKey)
    ? await getProjectById(projectIdOrKey)
    : await getProjectByKey(projectIdOrKey);

  if (!project) throw new Error('Project not found');

  const issues = await listIssues({ projectId: project._id });
  const total = issues.length;
  const statusCounts = {
    'Backlog': 0,
    'To Do': 0,
    'In Progress': 0,
    'In Review': 0,
    'Done': 0
  };
  const typeCounts = {
    'Story': 0,
    'Task': 0,
    'Bug': 0,
    'Epic': 0
  };

  let totalStoryPoints = 0;
  let completedStoryPoints = 0;

  issues.forEach(issue => {
    if (statusCounts[issue.status] !== undefined) statusCounts[issue.status]++;
    if (typeCounts[issue.type] !== undefined) typeCounts[issue.type]++;
    if (issue.storyPoints) {
      totalStoryPoints += issue.storyPoints;
      if (issue.status === 'Done') {
        completedStoryPoints += issue.storyPoints;
      }
    }
  });

  return {
    project: {
      _id: project._id,
      name: project.name,
      key: project.key
    },
    totalIssues: total,
    statusCounts,
    typeCounts,
    totalStoryPoints,
    completedStoryPoints,
    completionPercentage: totalStoryPoints > 0 ? Math.round((completedStoryPoints / totalStoryPoints) * 100) : (total > 0 ? Math.round((statusCounts['Done'] / total) * 100) : 0)
  };
}

// ================= SEED INITIAL DATA =================

async function seedInitialData() {
  const existingUsers = await listUsers();
  if (existingUsers.length > 0) {
    return { message: 'Database already has data. Seed skipped.' };
  }

  console.log('🌱 Seeding initial demo data...');
  // Create Demo User
  const demoUser = await createUser({
    name: 'Alex Johnson (Product Lead)',
    email: 'alex@company.com',
    password: 'password123',
    role: 'admin'
  });

  const devUser = await createUser({
    name: 'Sarah Chen (Senior Dev)',
    email: 'sarah@company.com',
    password: 'password123',
    role: 'member'
  });

  const qaUser = await createUser({
    name: 'David Miller (QA Specialist)',
    email: 'david@company.com',
    password: 'password123',
    role: 'member'
  });

  // Create Sample Project
  const project = await createProject({
    name: 'Core Platform 2.0',
    key: 'PLAT',
    description: 'Modernizing core cloud platform with high-speed microservices and real-time collaboration.',
    leadId: demoUser._id,
    memberIds: [demoUser._id, devUser._id, qaUser._id]
  });

  // Sample Issues
  const sampleIssues = [
    {
      summary: 'Design modern Jira-like board and backlog views',
      description: 'Implement Kanban drag-and-drop board with column limits, quick issue cards, and responsive CSS.',
      type: 'Story',
      status: 'Done',
      priority: 'Highest',
      storyPoints: 5,
      assigneeId: devUser._id,
      reporterId: demoUser._id,
      labels: ['frontend', 'ui', 'mvp']
    },
    {
      summary: 'Integrate Model Context Protocol (MCP) server endpoints',
      description: 'Add standard MCP tools for AI agents to query issues, update statuses, and log comments automatically.',
      type: 'Story',
      status: 'In Progress',
      priority: 'High',
      storyPoints: 8,
      assigneeId: devUser._id,
      reporterId: demoUser._id,
      labels: ['mcp', 'ai', 'backend']
    },
    {
      summary: 'MongoDB Atlas connection resilience & schema validation',
      description: 'Connect securely using MONGODB_URI and provide graceful in-memory fallback for local development.',
      type: 'Task',
      status: 'Done',
      priority: 'High',
      storyPoints: 3,
      assigneeId: devUser._id,
      reporterId: demoUser._id,
      labels: ['database', 'atlas']
    },
    {
      summary: 'Email & Password authentication with JWT and bcrypt',
      description: 'Implement secure login, token generation, user profiles, and session persistence in browser storage.',
      type: 'Task',
      status: 'In Review',
      priority: 'Medium',
      storyPoints: 3,
      assigneeId: qaUser._id,
      reporterId: demoUser._id,
      labels: ['auth', 'security']
    },
    {
      summary: 'Fix drag-and-drop ghost preview styling in Firefox',
      description: 'Ensure drag preview element retains rounded borders and proper drop-indicator line.',
      type: 'Bug',
      status: 'To Do',
      priority: 'Low',
      storyPoints: 2,
      assigneeId: qaUser._id,
      reporterId: devUser._id,
      labels: ['ui', 'bugfix']
    },
    {
      summary: 'Add export to CSV and markdown issue summaries',
      description: 'Allow project leads to export all sprint issues to CSV or download sprint metrics as markdown report.',
      type: 'Story',
      status: 'Backlog',
      priority: 'Lowest',
      storyPoints: 5,
      assigneeId: null,
      reporterId: demoUser._id,
      labels: ['reporting', 'enhancement']
    }
  ];

  for (const item of sampleIssues) {
    const created = await createIssue({
      projectId: project._id,
      ...item
    });

    if (item.summary.includes('MCP')) {
      await addComment({
        issueId: created._id,
        authorId: demoUser._id,
        content: 'MCP tools tested and verified with standard JSON-RPC 2.0 schemas! Ready for agent testing.'
      });
    }
  }

  console.log('✅ Demo data successfully seeded!');
  return { message: 'Demo data seeded successfully', projectId: project._id };
}

module.exports = {
  findUserByEmail,
  findUserById,
  createUser,
  listUsers,
  verifyUserPassword,
  listProjects,
  getProjectById,
  getProjectByKey,
  createProject,
  listIssues,
  getIssueById,
  getIssueByKey,
  createIssue,
  updateIssue,
  deleteIssue,
  listCommentsByIssue,
  addComment,
  getProjectStats,
  seedInitialData
};

