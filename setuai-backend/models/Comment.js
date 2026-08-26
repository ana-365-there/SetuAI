const mongoose = require('mongoose');
const { Schema } = mongoose;

const commentSchema = new Schema({
  challenge: {
    type: Schema.Types.ObjectId,
    ref: 'Challenge',
    required: true,
  },
  postedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  text: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['comment', 'status_update', 'interest_expressed', 'solution_submitted'],
    default: 'comment',
  },
}, { timestamps: true });

module.exports = mongoose.model('Comment', commentSchema);