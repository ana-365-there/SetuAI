const mongoose = require('mongoose');
const { Schema } = mongoose;

const userSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['citizen', 'university', 'industry', 'admin'],
    default: 'citizen'
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  organization: {
    type: String,
  },
  expertise: [{
    type: String,
  }],
  verificationToken: {
    type: String,
  },
  verificationTokenExpires: {
    type: Date,
  },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
