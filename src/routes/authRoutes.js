const express = require('express');
const { register, login, logout, getProfileTopics, getProfilePosts } = require('../controllers/authController');
const { verifyCaptcha } = require('../middlewares/captchaMiddleware');
const { verifyToken } = require('../middlewares/authMiddleware');

const router = express.Router();

/**
 * @route   POST /auth/register
 * @desc    Register a new anonymous user via reCAPTCHA, returns UID
 */
router.post('/register', verifyCaptcha, register);

/**
 * @route   POST /auth/login
 * @desc    Login via UID, Password and reCAPTCHA to get JWT
 */
router.post('/login', verifyCaptcha, login);

/**
 * @route   POST /auth/logout
 * @desc    Logout user by clearing currentJwt
 */
router.post('/logout', verifyToken, logout);

/**
 * @route   GET /auth/profile/topics
 * @desc    Get user's own topics
 */
router.get('/profile/topics', verifyToken, getProfileTopics);

/**
 * @route   GET /auth/profile/posts
 * @desc    Get user's own posts
 */
router.get('/profile/posts', verifyToken, getProfilePosts);

module.exports = router;
