const express = require('express');
const { createTopic, getTopics, getTopicById, updateTopic, deleteTopic } = require('../controllers/topicController');
const { verifyToken } = require('../middlewares/authMiddleware');
const { verifyCaptcha } = require('../middlewares/captchaMiddleware'); // newly added

const router = express.Router();

router.post('/', verifyCaptcha, verifyToken, createTopic);
router.get('/', getTopics);
router.get('/:id', getTopicById);
router.put('/:id', verifyToken, updateTopic);
router.delete('/:id', verifyToken, deleteTopic);

module.exports = router;
