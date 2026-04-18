const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { db, admin } = require('../config/firebase');
const crypto = require('crypto');

/**
 * Helper to generate random UID
 */
const generateUid = () => {
  return crypto.randomBytes(4).toString('hex'); // e.g. 8-char hex string
};

/**
 * Controller: Register new user
 */
const register = async (req, res, next) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'Password is required' });

    // Assuming password is client-side hashed, we re-hash it
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    let uid = generateUid();
    // Ensure unique
    let exists = await db.collection('users').doc(uid).get();
    while (exists.exists) {
      uid = generateUid();
      exists = await db.collection('users').doc(uid).get();
    }

    const newUser = {
      uid: uid,
      password: hashedPassword,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      currentJwt: null
    };

    await db.collection('users').doc(uid).set(newUser);
    res.status(201).json({ message: 'Registered successfully', uid: uid });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller: Login and return JWT
 */
const login = async (req, res, next) => {
  try {
    const { uid, password } = req.body;
    if (!uid || !password) return res.status(400).json({ error: 'UID and password required' });

    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const userData = userDoc.data();
    const isMatch = await bcrypt.compare(password, userData.password);

    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT (e.g. 24h expiration)
    const token = jwt.sign({ uid: uid }, process.env.JWT_SECRET, { expiresIn: '24h' });

    // Store latest JWT to DB to invalidate old sessions (only 1 valid login at a time)
    await db.collection('users').doc(uid).update({ currentJwt: token });

    res.status(200).json({ message: 'Logged in successfully', token: token, uid: uid });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller: Get Profile (My Posts and Topics)
 */
const getProfileTopics = async (req, res, next) => {
  try {
    const uid = req.user.uid;
    const snapshot = await db.collection('topics').where('authorId', '==', uid).orderBy('createdAt', 'desc').get();
    
    const topics = [];
    snapshot.forEach(doc => {
      topics.push(doc.data());
    });

    res.status(200).json({ data: topics });
  } catch (error) {
    next(error);
  }
};

const getProfilePosts = async (req, res, next) => {
  try {
    const uid = req.user.uid;
    // Note: since posts are nested under topics, to query ALL posts by authorId globally
    // We need a Firestore Collection Group Query
    // E.g. db.collectionGroup('posts').where('authorId', '==', uid)
    const snapshot = await db.collectionGroup('posts').where('authorId', '==', uid).orderBy('createdAt', 'desc').get();

    const posts = [];
    snapshot.forEach(doc => {
      posts.push({ ...doc.data(), topicId: doc.ref.parent.parent.id });
    });

    res.status(200).json({ data: posts });
  } catch (error) {
    // If indices are needed, firestore will error out with a link.
    next(error);
  }
};

module.exports = { register, login, getProfileTopics, getProfilePosts };
