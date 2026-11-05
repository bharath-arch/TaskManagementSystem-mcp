const express = require('express');
const router = express.Router();
const {
  listIssues,
  getIssueById,
  getIssueByKey,
  createIssue,
  updateIssue,
  deleteIssue,
  listCommentsByIssue,
  addComment
} = require('../services/dataService');
const { authenticate } = require('../middleware/auth');
const mongoose = require('mongoose');

// List issues with filters
router.get('/', authenticate, async (req, res) => {
  try {
    const { projectId, projectKey, status, assigneeId, type, priority, search } = req.query;
    const issues = await listIssues({
      projectId,
      projectKey,
      status,
      assigneeId,
      type,
      priority,
      search
    });
    res.json({ issues });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create issue
router.post('/', authenticate, async (req, res) => {
  try {
    const {
      projectId,
      summary,
      description,
      type,
      status,
      priority,
      storyPoints,
      assigneeId,
      labels,
      dueDate
    } = req.body;

    if (!projectId || !summary) {
      return res.status(400).json({ error: 'Project ID and Issue summary are required.' });
    }

    const issue = await createIssue({
      projectId,
      summary,
      description,
      type,
      status,
      priority,
      storyPoints,
      assigneeId,
      reporterId: req.user._id,
      labels,
      dueDate
    });

    res.status(201).json({ issue, message: 'Issue created successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get issue by ID or Key (e.g. "PLAT-1")
router.get('/:idOrKey', authenticate, async (req, res) => {
  try {
    const { idOrKey } = req.params;
    const issue = mongoose.Types.ObjectId.isValid(idOrKey)
      ? await getIssueById(idOrKey)
      : await getIssueByKey(idOrKey);

    if (!issue) {
      return res.status(404).json({ error: 'Issue not found.' });
    }

    res.json({ issue });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update issue
router.patch('/:idOrKey', authenticate, async (req, res) => {
  try {
    const { idOrKey } = req.params;
    const updates = req.body;

    const updated = await updateIssue(idOrKey, updates, req.user._id);
    res.json({ issue: updated, message: 'Issue updated successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete issue
router.delete('/:idOrKey', authenticate, async (req, res) => {
  try {
    const { idOrKey } = req.params;
    const deleted = await deleteIssue(idOrKey);
    if (!deleted) {
      return res.status(404).json({ error: 'Issue not found' });
    }
    res.json({ success: true, message: 'Issue deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List comments for an issue
router.get('/:id/comments', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const comments = await listCommentsByIssue(id);
    res.json({ comments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add comment to an issue
router.post('/:id/comments', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Comment content cannot be empty' });
    }

    const comment = await addComment({
      issueId: id,
      authorId: req.user._id,
      content
    });

    res.status(201).json({ comment, message: 'Comment added' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;

