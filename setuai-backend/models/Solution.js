const mongoose = require('mongoose');
const { Schema } = mongoose;

const solutionSchema = new Schema({
  challenge: {
    type: Schema.Types.ObjectId,
    ref: 'Challenge',
    required: true,
  },
  submittedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  attachmentUrl: {
    type: String, // optional doc/image link for proposal
  },

  collaboratingOrganizations: [{ type: String }], // auto-derived, not manually entered — computed whenever teamMembers changes

  teamMembers: [{ type: Schema.Types.ObjectId, ref: 'User' }], // student accounts assigned to work on this
  
  mentor: { type: Schema.Types.ObjectId, ref: 'User' }, // faculty/mentor account, or just a String if not a real login

  submissions: [{
    submittedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    link: { type: String, required: true }, // project repo, paper, demo link
    note: { type: String },
    submittedAt: { type: Date, default: Date.now },
  }],
  status: {
    type: String,
    enum: ['Proposed', 'In Progress', 'Solved', 'Rejected'],
    default: 'Proposed',
  },
  upvotes: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
  }],
}, { timestamps: true });

module.exports = mongoose.model('Solution', solutionSchema);