const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const Topic = require('../models/Topic');
const Post = require('../models/Post');

const generateUid = () => crypto.randomBytes(4).toString('hex');

const register = async (req, res, next) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'Password is required' });

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    let uid = generateUid();
    let exists = await User.findOne({ uid });
    while (exists) {
      uid = generateUid();
      exists = await User.findOne({ uid });
    }

    await User.create({
      uid: uid,
      password: hashedPassword,
      currentJwt: null
    });

    res.status(201).json({ message: 'Registered successfully', uid: uid });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { uid, password } = req.body;
    if (!uid || !password) return res.status(400).json({ error: 'UID and password required' });

    const user = await User.findOne({ uid });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ uid: uid }, process.env.JWT_SECRET, { expiresIn: '24h' });

    user.currentJwt = token;
    await user.save();

    res.status(200).json({ message: 'Logged in successfully', token: token, uid: uid });
  } catch (error) {
    next(error);
  }
};

const getProfileTopics = async (req, res, next) => {
  try {
    const uid = req.user.uid;
    const topics = await Topic.find({ authorId: uid }).sort({ createdAt: -1 });

    res.status(200).json({ data: topics });
  } catch (error) {
    next(error);
  }
};

const getProfilePosts = async (req, res, next) => {
  try {
    const uid = req.user.uid;
    const posts = await Post.find({ authorId: uid }).sort({ createdAt: -1 });

    res.status(200).json({ data: posts });
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, getProfileTopics, getProfilePosts };
