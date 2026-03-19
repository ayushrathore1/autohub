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
  
  // Core Tool Arrays
  customers: { type: Array, default: [] },
  jobCards: { type: Array, default: [] },
  supplierLedger: { type: Array, default: [] },
  udhaarCustomers: { type: Array, default: [] },
  warranties: { type: Array, default: [] },
  
  // Shared States
  udhaarDue: { type: Number, default: 0 },
  pendingInvoiceDraft: { type: Object, default: null },
  
  appStatus: { type: String, default: 'active' },
  lastUpdated: { type: Number, default: Date.now }
}, { strict: false }); // extremely important: allows saving dynamic tool state without Mongoose dropping fields

module.exports = mongoose.model('AppData', AppDataSchema);
