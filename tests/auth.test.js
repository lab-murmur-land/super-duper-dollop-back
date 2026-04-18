const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');

jest.mock('../src/middlewares/captchaMiddleware', () => ({
  verifyCaptcha: (req, res, next) => next(),
}));

describe('Auth API', () => {
  describe('POST /auth/register', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({ password: 'testpassword123' });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('message', 'Registered successfully');
      expect(response.body).toHaveProperty('uid');

      const user = await User.findOne({ uid: response.body.uid });
      expect(user).toBeTruthy();
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
    let testUid;
    beforeEach(async () => {
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('testpassword', 10);
      const user = await User.create({ uid: '123ab', password: hashedPassword });
      testUid = user.uid;
    });

    it('should login an existing user successfully', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({ uid: testUid, password: 'testpassword' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Logged in successfully');
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('uid', testUid);

      const user = await User.findOne({ uid: testUid });
      expect(user.currentJwt).toBe(response.body.token);
    });

    it('should return 401 for invalid pass', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({ uid: testUid, password: 'wrongpassword' });
      expect(response.status).toBe(401);
    });
  });
});
