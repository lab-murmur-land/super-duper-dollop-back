require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const connectDB = require('./src/config/db');

const User = require('./src/models/User');
const Topic = require('./src/models/Topic');
const Post = require('./src/models/Post');
const Vote = require('./src/models/Vote');

const seedDatabase = async () => {
  try {
    await connectDB();

    console.log('Clearing existing data...');
    await User.deleteMany();
    await Topic.deleteMany();
    await Post.deleteMany();
    await Vote.deleteMany();

    console.log('Inserting seed data...');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword1 = await bcrypt.hash('password123', salt);
    const hashedPassword2 = await bcrypt.hash('password123', salt);

    const user1 = await User.create({
      _id: new mongoose.Types.ObjectId('60d5ecb8b392d7001f3e3a11'),
      uid: 'demoUser1',
      password: hashedPassword1
    });

    const user2 = await User.create({
      _id: new mongoose.Types.ObjectId('60d5ecb8b392d7001f3e3a12'),
      uid: 'demoUser2',
      password: hashedPassword2
    });

    const topic1 = await Topic.create({
      _id: new mongoose.Types.ObjectId('60d5ecb8b392d7001f3e3a21'),
      title: 'Node.js MongoDB Entegrasyonu Nasıldır?',
      content: 'MongoDB ve Mongoose kullanarak harika projeler yapabilirsiniz.',
      authorId: user1.uid,
      views: 150,
      score: 1,
      upvotes: 1,
      downvotes: 0
    });

    const post1 = await Post.create({
      _id: new mongoose.Types.ObjectId('60d5ecb8b392d7001f3e3a31'),
      topicId: topic1._id,
      content: "Kesinlikle katılıyorum, Mongoose'un şema yapısı çok kullanışlı.",
      authorId: user2.uid,
      score: 0,
      upvotes: 0,
      downvotes: 0
    });

    await Vote.create({
      _id: new mongoose.Types.ObjectId('60d5ecb8b392d7001f3e3a41'),
      targetId: topic1._id,
      targetModel: 'Topic',
      authorId: user2.uid,
      value: 1
    });

    console.log('Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
