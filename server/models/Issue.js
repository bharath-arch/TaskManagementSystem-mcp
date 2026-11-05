const mongoose = require('mongoose');

const historyItemSchema = new mongoose.Schema({
  field: { type: String, required: true },
  from: { type: String, default: '' },
  to: { type: String, default: '' },
  changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  changedAt: { type: Date, default: Date.now }
}, { _id: false });

const issueSchema = new mongoose.Schema({
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  issueKey: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  summary: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    enum: ['Story', 'Task', 'Bug', 'Epic'],
    default: 'Task'
  },
  status: {
    type: String,
    enum: ['Backlog', 'To Do', 'In Progress', 'In Review', 'Done'],
    default: 'To Do'
  },
  priority: {
    type: String,
    enum: ['Lowest', 'Low', 'Medium', 'High', 'Highest'],
    default: 'Medium'
  },
  storyPoints: {
    type: Number,
    min: 0,
    max: 100,
    default: null
  },
  assignee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  reporter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  labels: [{
    type: String,
    trim: true
  }],
  order: {
    type: Number,
    default: 0
  },
  dueDate: {
    type: Date,
    default: null
  },
  history: [historyItemSchema],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

issueSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.models.Issue || mongoose.model('Issue', issueSchema);

