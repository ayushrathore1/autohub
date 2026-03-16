const express = require('express');
const router = express.Router();
const AppData = require('../models/AppData');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-change-it-in-prod';

// Middleware to verify token
const requireAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Get user app data
router.get('/sync', requireAuth, async (req, res) => {
  try {
    let data = await AppData.findOne({ userId: req.userId });
    if (!data) {
      // Create default data for new user
      data = new AppData({ userId: req.userId });
      await data.save();
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update user app data
router.post('/sync', requireAuth, async (req, res) => {
  try {
    const payload = req.body;
    // Don't accidentally override the userId
    delete payload.userId;
    delete payload._id;

    // Stamp lastUpdated
    payload.lastUpdated = Date.now();

    const data = await AppData.findOneAndUpdate(
      { userId: req.userId },
      { $set: payload },
      { new: true, upsert: true }
    );
    res.json({ success: true, lastUpdated: data.lastUpdated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
