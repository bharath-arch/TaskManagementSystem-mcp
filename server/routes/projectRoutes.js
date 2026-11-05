const express = require('express');
const router = express.Router();
const {
  listProjects,
  getProjectById,
  getProjectByKey,
  createProject,
  getProjectStats
} = require('../services/dataService');
const { authenticate } = require('../middleware/auth');
const mongoose = require('mongoose');

// List projects
router.get('/', authenticate, async (req, res) => {
  try {
    const projects = await listProjects(req.user._id);
    res.json({ projects });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create project
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, key, description, memberIds } = req.body;
    if (!name || !key) {
      return res.status(400).json({ error: 'Project name and key are required.' });
    }

    const project = await createProject({
      name,
      key,
      description,
      leadId: req.user._id,
      memberIds: memberIds || []
    });

    res.status(201).json({ project, message: 'Project created successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get project details
router.get('/:idOrKey', authenticate, async (req, res) => {
  try {
    const { idOrKey } = req.params;
    const project = mongoose.Types.ObjectId.isValid(idOrKey)
      ? await getProjectById(idOrKey)
      : await getProjectByKey(idOrKey);

    if (!project) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    res.json({ project });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get project stats
router.get('/:idOrKey/stats', authenticate, async (req, res) => {
  try {
    const { idOrKey } = req.params;
    const stats = await getProjectStats(idOrKey);
    res.json({ stats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

