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
    limit: jest.fn().mockReturnThis()
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

describe('Topic API', () => {
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

  describe('POST /topics', () => {
    it('should create a topic successfully', async () => {
      // Setup mock returns
      db.set.mockResolvedValueOnce({});

      const response = await request(app)
        .post('/topics')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'My first topic', content: 'Some content' });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('message', 'Topic created');
      expect(response.body.data).toHaveProperty('title', 'My first topic');
      expect(response.body.data).toHaveProperty('authorName', 'Anonymous');
      expect(response.body.data).not.toHaveProperty('authorId');
    });

    it('should require a title for topis', async () => {
      const response = await request(app)
        .post('/topics')
        .set('Authorization', `Bearer ${token}`)
        .send({ content: 'I forgot the title' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Title is required');
    });
  });

  describe('GET /topics', () => {
    it('should return a list of topics', async () => {
      const mockDocs = [
        { data: () => ({ title: 'Topic 1', content: 'content 1', authorId: 'user1' }) },
        { data: () => ({ title: 'Topic 2', content: 'content 2', authorId: 'user1' }) }
      ];

      db.get.mockResolvedValueOnce({
        forEach: (cb) => mockDocs.forEach(cb)
      });

      const response = await request(app).get('/topics');

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(2);
      expect(response.body.data[0]).toHaveProperty('title', 'Topic 1');
      expect(response.body.data[0]).not.toHaveProperty('authorId');
      expect(response.body.data[0]).toHaveProperty('authorName', 'Anonymous');
    });
  });

  describe('GET /topics/:id', () => {
    it('should return single topic and increment views', async () => {
      db.get.mockResolvedValueOnce({
        exists: true,
        data: () => ({ title: 'Test Topic Title', content: 'body here' })
      });
      db.update.mockResolvedValueOnce({});

      const response = await request(app).get('/topics/mock-id-1234');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('title', 'Test Topic Title');
      expect(db.update).toHaveBeenCalledTimes(1);
    });

    it('should return 404 if topic not found', async () => {
      db.get.mockResolvedValueOnce({ exists: false });
      
      const response = await request(app).get('/topics/invalid-id');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Topic not found');
    });
  });
});
