const express = require('express');
const router = express.Router();
const {
  createUser,
  findUserByEmail,
  verifyUserPassword,
  listUsers
} = require('../services/dataService');
const { authenticate, generateToken } = require('../middleware/auth');
const { getStatus } = require('../config/db');

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const user = await createUser({ name, email, password });
    const token = generateToken(user);
    res.status(201).json({
      user,
      token,
      message: 'Account created successfully'
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isValid = await verifyUserPassword(user, password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const safeUser = typeof user.toJSON === 'function' ? user.toJSON() : {
      _id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      role: user.role
    };

    const token = generateToken(safeUser);
    res.json({
      user: safeUser,
      token,
      message: 'Logged in successfully'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get current profile
router.get('/me', authenticate, async (req, res) => {
  res.json({ user: req.user });
});

// List all users for assignees / team members
router.get('/users', authenticate, async (req, res) => {
  try {
    const users = await listUsers();
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// System / DB connection status
router.get('/system-status', async (req, res) => {
  res.json(getStatus());
});

module.exports = router;

