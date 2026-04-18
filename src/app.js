const express = require('express');
const cors = require('cors');
const errorHandler = require('./middlewares/errorMiddleware');
const topicRoutes = require('./routes/topicRoutes');
const postRoutes = require('./routes/postRoutes');
const authRoutes = require('./routes/authRoutes'); // New Route

require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date() });
});

app.use('/auth', authRoutes); // Insert new Route
app.use('/topics', topicRoutes);
app.use('/posts', postRoutes);

app.use(errorHandler);

module.exports = app;
