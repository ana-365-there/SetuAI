const mongoose = require('mongoose');
const { Schema } = mongoose;

const challengeSchema = new Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    enum: ['Healthcare', 'Education', 'Agriculture', 'Environment', 'Technology', 'Infrastructure', 'Other'],
  },
  priorityScore: {
    type: Number,
    default: 0,
  },
  location: {
    type: String,
  },
  imageUrl: {
    type: String,
  },
  submittedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  submitterType: {
    type: String,
    enum: ['citizen', 'industry', 'university'],
    default: 'citizen',
  },
  severity: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    default: 'Low',
  },
  suggestedUniversities: [{
    type: Schema.Types.ObjectId,
    ref: 'User', // users with role: 'university'
  }],
  suggestedUniversityName: {
    type: String,
  },
  assignedUniversity: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  teamMembers: [{
    type: String,
  }],
  mentorName: {
    type: String,
  },
  status: {
    type: String,
    enum: ['Open', 'Under Review', 'In Progress', 'Solved'],
    default: 'Open',
  },
  interestedIndustries: [{
    type: Schema.Types.ObjectId,
    ref: 'User', // users with role: 'industry'
  }],
  upvotes: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
  }],
}, { timestamps: true });

module.exports = mongoose.model('Challenge', challengeSchema);
