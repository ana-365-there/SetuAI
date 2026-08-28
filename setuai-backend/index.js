const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const connectToMongo = require('./db');
const express = require('express');
const cors = require('cors');

const app = express()
const port = process.env.PORT || 5000;

app.use (cors());
app.use(express.json()); // Middleware to parse JSON bodies

// Available Routes
app.use('/api/auth', require('./routes/auth'))
app.use('/api', require('./routes/challenge'));
app.use('/api', require('./routes/solution'));
app.use('/api', require('./routes/analytics'));
app.use('/api', require('./routes/comment'));
app.use('/api', require('./routes/admin'));
app.use('/api', require('./routes/translator'));

const startServer = async () => {
  try {
    await connectToMongo();
    app.listen(port, () => {
      console.log(`SETU AI listening on port ${port}`);
    });
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error.message);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

module.exports = app;
