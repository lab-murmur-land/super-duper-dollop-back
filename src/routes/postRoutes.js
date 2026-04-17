const express = require('express');
const { createPost, getPosts, toggleVote } = require('../controllers/postController');
const { verifyToken } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware');

const router = express.Router();

/**
 * @route   POST /topics/:topicId/posts
 * @desc    Create a new post under a topic (must be authorized)
 */
router.post('/topics/:topicId/posts', verifyToken, upload.single('file'), createPost);

/**
 * @route   GET /topics/:topicId/posts
 * @desc    Get all posts for a topic. Sort by ?sort=latest or ?sort=most-vote
 */
router.get('/topics/:topicId/posts', getPosts);

/**
 * @route   POST /votes
 * @desc    Toggle upvote/downvote for post or topic (must be authorized)
 */
router.post('/votes', verifyToken, toggleVote);

module.exports = router;
