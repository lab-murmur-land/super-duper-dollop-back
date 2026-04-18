const express = require('express');
const { createPost, getPosts, toggleVote } = require('../controllers/postController');
const { verifyToken } = require('../middlewares/authMiddleware');
const { verifyCaptcha } = require('../middlewares/captchaMiddleware'); // newly added
const upload = require('../middlewares/uploadMiddleware');

const router = express.Router();

router.post('/topics/:topicId/posts', verifyCaptcha, verifyToken, upload.single('file'), createPost);
router.get('/topics/:topicId/posts', getPosts);
router.post('/votes', verifyToken, toggleVote); // no captcha required for vote based on prev plan, although we could add it

module.exports = router;
