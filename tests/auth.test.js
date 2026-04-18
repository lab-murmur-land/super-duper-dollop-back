const request = require('supertest');
const app = require('../src/app');
const { db, admin } = require('../src/config/firebase');

// Mock Captcha to bypass
jest.mock('../src/middlewares/captchaMiddleware', () => ({
  verifyCaptcha: (req, res, next) => next(),
}));

// Mock Firestore DB
jest.mock('../src/config/firebase', () => {
  const mDb = {
    collection: jest.fn().mockReturnThis(),
    doc: jest.fn().mockReturnThis(),
    get: jest.fn(),
    set: jest.fn(),
    update: jest.fn(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
  };

  const mAdmin = {
    firestore: {
      FieldValue: {
        serverTimestamp: jest.fn().mockReturnValue('MOCK_TIMESTAMP'),
        increment: jest.fn(),
      },
    },
  };

  return { db: mDb, admin: mAdmin };
});

describe('Auth API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /auth/register', () => {
    it('should register a new user successfully', async () => {
      // Mock user existence check (uid doesn't exist yet)
      db.get.mockResolvedValueOnce({ exists: false });

      const response = await request(app)
        .post('/auth/register')
        .send({ password: 'testpassword123' });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('message', 'Registered successfully');
      expect(response.body).toHaveProperty('uid');
      expect(db.set).toHaveBeenCalledTimes(1);
    });

    it('should return 400 if password is not provided', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Password is required');
    });
  });

  describe('POST /auth/login', () => {
    it('should login an existing user successfully', async () => {
      // Mock user document
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('testpassword', 10);
      
      db.get.mockResolvedValueOnce({
        exists: true,
        data: () => ({ password: hashedPassword, uid: '1234abcd' })
      });

      // Need JWT secret for the sign operation in the controller
      process.env.JWT_SECRET = 'test_secret';

      const response = await request(app)
        .post('/auth/login')
        .send({ uid: '1234abcd', password: 'testpassword' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Logged in successfully');
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('uid', '1234abcd');
      expect(db.update).toHaveBeenCalledTimes(1);
    });

    it('should return 400 if uid or password is missing', async () => {
      const response1 = await request(app).post('/auth/login').send({ uid: '123' });
      expect(response1.status).toBe(400);

      const response2 = await request(app).post('/auth/login').send({ password: 'pwd' });
      expect(response2.status).toBe(400);
    });
    
    it('should return 401 for non-existent user', async () => {
      db.get.mockResolvedValueOnce({ exists: false });

      const response = await request(app)
        .post('/auth/login')
        .send({ uid: 'unknown', password: 'testpassword' });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Invalid credentials');
    });
  });
});
