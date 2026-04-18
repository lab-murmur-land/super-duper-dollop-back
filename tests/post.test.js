const request = require('supertest');
const app = require('../src/app');
const { db } = require('../src/config/firebase');
const jwt = require('jsonwebtoken');

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
      Query: {
        where: jest.fn(),
      }
    },
  };

  return { db: mDb, admin: mAdmin };
});

describe('Post API', () => {
  let token;
  const testUid = 'test-author-123';

  beforeAll(() => {
    process.env.JWT_SECRET = 'test_secret';
    token = jwt.sign({ uid: testUid }, process.env.JWT_SECRET);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Auth Middleware requires valid token and user in DB based on current implementation
    db.get.mockResolvedValue({
      exists: true,
      data: () => ({ currentJwt: token })
    });
  });

  describe('POST /posts/topics/:topicId/posts', () => {
    it('should create a post successfully', async () => {
      // Mock user for auth middleware
      db.get.mockResolvedValueOnce({ exists: true, data: () => ({ currentJwt: token }) });
      // Mock topic existence
      db.get.mockResolvedValueOnce({ exists: true });
      
      db.set.mockResolvedValueOnce({});
      
      const response = await request(app)
        .post('/posts/topics/topic123/posts')
        .set('Authorization', `Bearer ${token}`)
        .send({ content: 'Reply content here' }); 

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('message', 'Post created');
    });

    it('should return 400 if content is missing', async () => {
      // Mock user for auth middleware
      db.get.mockResolvedValueOnce({ exists: true, data: () => ({ currentJwt: token }) });
      
      const response = await request(app)
        .post('/posts/topics/topic123/posts')
        .set('Authorization', `Bearer ${token}`)
        .send({}); 
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Content or file is required');
    });
  });

  describe('GET /posts/topics/:topicId/posts', () => {
    it('should get posts for a topic', async () => {
      const mockDocs = [
        { data: () => ({ content: 'content 1', topicId: 'topicA' }) },
        { data: () => ({ content: 'content 2', topicId: 'topicA' }) }
      ];

      db.get.mockResolvedValueOnce({
        forEach: (cb) => mockDocs.forEach(cb)
      });

      const response = await request(app).get('/posts/topics/topicA/posts');
      
      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(2);
      expect(response.body.data[0]).toHaveProperty('content', 'content 1');
    });
  });
});
