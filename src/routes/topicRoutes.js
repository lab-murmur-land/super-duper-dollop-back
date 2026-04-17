const express = require('express');
const { createTopic, getTopics, getTopicById } = require('../controllers/topicController');
const { verifyToken } = require('../middlewares/authMiddleware');

const router = express.Router();

/**
 * @route   POST /topics
 * @desc    Create a new topic (entry) - requires authorization. The author info will be stored but stripped on fetch.
 */
router.post('/', verifyToken, createTopic);

/**
 * @route   GET /topics
 * @desc    Get all topics, supports ?sort= latest | most-vote | most-view  and ?search=keyword
 */
router.get('/', getTopics);

/**
 * @route   GET /topics/:id
 * @desc    Get single topic and increment views
 */
router.get('/:id', getTopicById);

module.exports = router;
