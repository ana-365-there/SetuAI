const mongoose = require('mongoose');

const mongoURI = process.env.MONGO_URI;

const connectToMongo = async () => {
    await mongoose.connect(mongoURI);
    console.log("Connected to MongoDB successfully");
}

module.exports = connectToMongo;