const mongoose = require('mongoose');
const { Schema } = mongoose;

const universitySchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    name: {
        type: String,
        required: true
    },

    expertise: [String],

    departments: [String],

    facilities: [String]
});

module.exports = mongoose.model('University', universitySchema);