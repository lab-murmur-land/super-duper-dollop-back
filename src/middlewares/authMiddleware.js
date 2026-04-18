const jwt = require('jsonwebtoken');
const User = require('../models/User');

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

    const userData = await User.findOne({ uid });
    if (!userData) {
      throw new Error('User not found');
    }

    if (userData.currentJwt !== token) {
      return res.status(401).json({ error: 'INVALID_SESSION: Token superseded' });
    }

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
