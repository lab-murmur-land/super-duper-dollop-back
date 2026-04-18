const request = require('supertest');
const app = require('../src/app');
const jwt = require('jsonwebtoken');
const User = require('../src/models/User');
const Topic = require('../src/models/Topic');
const Post = require('../src/models/Post');

jest.mock('../src/middlewares/captchaMiddleware', () => ({
  verifyCaptcha: (req, res, next) => next(),
}));

describe('Post API', () => {
  let token;
  const testUid = 'test-author-123';
  let topicId;

  beforeEach(async () => {
    process.env.JWT_SECRET = 'test_secret';
    token = jwt.sign({ uid: testUid }, process.env.JWT_SECRET);
    await User.create({ uid: testUid, password: 'hash', currentJwt: token });
    const topic = await Topic.create({ title: 'A Topic', content: 'C', authorId: testUid });
    topicId = topic._id.toString();
  });

  describe('POST /posts/topics/:topicId/posts', () => {
    it('should create a post successfully', async () => {
      const response = await request(app)
        .post(`/posts/topics/${topicId}/posts`)
        .set('Authorization', `Bearer ${token}`)
        .send({ content: 'Reply content here' });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('message', 'Post created');
      const postsCount = await Post.countDocuments();
      expect(postsCount).toBe(1);
    });

    it('should return 400 if content is missing', async () => {
      const response = await request(app)
        .post(`/posts/topics/${topicId}/posts`)
        .set('Authorization', `Bearer ${token}`)
        .send({});
      
      expect(response.status).toBe(400);
    });
  });

  describe('GET /posts/topics/:topicId/posts', () => {
    it('should get posts for a topic', async () => {
      await Post.create([{ content: 'c1', topicId, authorId: 'a', createdAt: new Date('2030-01-01') }, { content: 'c2', topicId, authorId: 'a', createdAt: new Date('2030-01-02') }]);

      const response = await request(app).get(`/posts/topics/${topicId}/posts`);
      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(2);
      expect(response.body.data[0].content).toBe('c2'); // sorted by newest
    });
  });
});
