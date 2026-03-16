const mongoose = require('mongoose');

const AppDataSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  pages: { type: Array, default: [] },
  entries: { type: Array, default: [] },
  bills: { type: Array, default: [] },
  salesEvents: { type: Array, default: [] },
  gpsReminders: { type: Array, default: [] },
  settings: { type: Object, default: {} },
  appStatus: { type: String, default: 'active' },
  lastUpdated: { type: Number, default: Date.now }
});

module.exports = mongoose.model('AppData', AppDataSchema);
