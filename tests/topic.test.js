const request = require('supertest');
const app = require('../src/app');
const jwt = require('jsonwebtoken');
const User = require('../src/models/User');
const Topic = require('../src/models/Topic');

jest.mock('../src/middlewares/captchaMiddleware', () => ({
  verifyCaptcha: (req, res, next) => next(),
}));

describe('Topic API', () => {
  let token;
  const testUid = 'test-author-123';

  beforeEach(async () => {
    process.env.JWT_SECRET = 'test_secret';
    token = jwt.sign({ uid: testUid }, process.env.JWT_SECRET);
    await User.create({ uid: testUid, password: 'hash', currentJwt: token });
  });

  describe('POST /topics', () => {
    it('should create a new topic', async () => {
      const response = await request(app)
        .post('/topics')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Test Topic Title', content: 'Test content here' });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('message', 'Topic created');
    });

    it('should return 400 if missing title', async () => {
      const response = await request(app)
        .post('/topics')
        .set('Authorization', `Bearer ${token}`)
        .send({ content: 'Only content' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Title is required');
    });
  });

  describe('GET /topics', () => {
    it('should fetch topics based on default sort (latest)', async () => {
      await Topic.create([
        { title: 'T1', content: 'C1', authorId: 'A1', createdAt: new Date('2022-01-01') },
        { title: 'T2', content: 'C2', authorId: 'A2', createdAt: new Date('2022-01-02') }
      ]);
      const response = await request(app).get('/topics');
      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(2);
      expect(response.body.data[0].title).toBe('T2'); // newest first
    });
  });
});
