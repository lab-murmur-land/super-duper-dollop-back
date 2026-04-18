const jwt = require('jsonwebtoken');
const { db } = require('../config/firebase');

/**
 * Middleware to verify custom JWT token and DB session
 */
const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid token format' });
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const uid = decoded.uid;

    if (!uid) {
      throw new Error('Invalid token payload: Missing UID');
    }

    // Verify token against database currentJwt
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      throw new Error('User not found');
    }

    const userData = userDoc.data();
    if (userData.currentJwt !== token) {
      return res.status(401).json({ error: 'INVALID_SESSION: Token superseded' });
    }

    // Populate req.user
    req.user = { uid: uid };
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'TOKEN_EXPIRED: Token is expired' });
    }
    console.error('Error verifying custom token:', error.message);
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

module.exports = { verifyToken };
