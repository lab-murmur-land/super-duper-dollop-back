const express = require('express');
const cors = require('cors');
const errorHandler = require('./middlewares/errorMiddleware');
const topicRoutes = require('./routes/topicRoutes');
const postRoutes = require('./routes/postRoutes');

// Load env variables (also loaded in firebase via src/config/firebase.js, but good to have here explicitly)
require('dotenv').config();

const app = express();

/**
 * Middleware setup
 */
app.use(cors()); // Allow all cross-origin requests
app.use(express.json()); // Parse incoming JSON payloads
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded payloads

/**
 * Routes setup
 */
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date() });
});

app.use('/topics', topicRoutes);
app.use('/posts', postRoutes);

/**
 * Global Error Handler Middleware
 */
app.use(errorHandler);

module.exports = app;
