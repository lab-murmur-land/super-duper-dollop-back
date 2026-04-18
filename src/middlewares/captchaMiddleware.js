const axios = require('axios');

/**
 * Middleware: Verify Google reCAPTCHA
 */
const verifyCaptcha = async (req, res, next) => {
  const token = req.body.recaptchaToken;
  if (!token) {
    return res.status(400).json({ error: 'Missing reCAPTCHA token' });
  }

  try {
    const secretKey = process.env.RECAPTCHA_SECRET_KEY;
    const response = await axios.post(`https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${token}`);
    
    if (response.data.success) {
      // Optional: Check action or score for v3
      next();
    } else {
      console.error('reCAPTCHA failed:', response.data['error-codes']);
      return res.status(403).json({ error: 'Invalid reCAPTCHA token' });
    }
  } catch (error) {
    console.error('reCAPTCHA validation error:', error.message);
    return res.status(500).json({ error: 'Failed to validate reCAPTCHA' });
  }
};

module.exports = { verifyCaptcha };
