const express = require('express');
const cors = require('cors');
const path = require('path');
const errorHandler = require('./middlewares/errorMiddleware');
const topicRoutes = require('./routes/topicRoutes');
const postRoutes = require('./routes/postRoutes');
const authRoutes = require('./routes/authRoutes');
const connectDB = require('./config/db');

require('dotenv').config();

// Connect to MongoDB
connectDB();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date() });
});

app.use('/auth', authRoutes);
app.use('/topics', topicRoutes);
app.use('/posts', postRoutes);

app.use(errorHandler);

module.exports = app;
