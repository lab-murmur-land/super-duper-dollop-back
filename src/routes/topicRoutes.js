const express = require('express');
const { createTopic, getTopics, getTopicById } = require('../controllers/topicController');
const { verifyToken } = require('../middlewares/authMiddleware');
const { verifyCaptcha } = require('../middlewares/captchaMiddleware'); // newly added

const router = express.Router();

router.post('/', verifyCaptcha, verifyToken, createTopic);
router.get('/', getTopics);
router.get('/:id', getTopicById);

module.exports = router;
