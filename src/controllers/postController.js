const Post = require('../models/Post');
const Topic = require('../models/Topic');
const Vote = require('../models/Vote');

const createPost = async (req, res, next) => {
  try {
    const { topicId } = req.params;
    const { content } = req.body;
    const authorId = req.user.uid;
    const file = req.file;

    if (!topicId) return res.status(400).json({ error: 'Topic ID is required' });
    if (!content && !file) return res.status(400).json({ error: 'Content or file is required' });

    const topicExists = await Topic.findById(topicId);
    if (!topicExists) {
      return res.status(404).json({ error: 'Topic not found' });
    }

    let fileUrl = null;
    if (file) {
      fileUrl = `/uploads/${file.filename}`;
    }

    const newPost = await Post.create({
      topicId,
      content: content || '',
      fileUrl,
      authorId
    });

    const publicPost = newPost.toObject();
    delete publicPost.authorId;
    publicPost.authorName = 'Anonymous';

    res.status(201).json({ message: 'Post created', data: publicPost });
  } catch (error) {
    next(error);
  }
};

const getPosts = async (req, res, next) => {
  try {
    const { topicId } = req.params;
    const { sort } = req.query; // 'latest', 'most-vote'

    let sortOption = { createdAt: -1 };
    if (sort === 'most-vote') {
      sortOption = { score: -1 };
    }

    const posts = await Post.find({ topicId }).sort(sortOption).lean();

    const publicPosts = posts.map(post => {
      delete post.authorId;
      return { ...post, authorName: 'Anonymous' };
    });

    res.status(200).json({ data: publicPosts });
  } catch (error) {
    next(error);
  }
};

const toggleVote = async (req, res, next) => {
  try {
    const { targetId, targetType, vote } = req.body;
    const authorId = req.user.uid;

    if (!targetId || !targetType || ![1, -1, 0].includes(vote)) {
      return res.status(400).json({ error: 'Invalid vote parameters.' });
    }

    const Model = targetType === 'topic' ? Topic : targetType === 'post' ? Post : null;
    if (!Model) return res.status(400).json({ error: 'targetType must be topic or post' });
    
    const targetModelStr = targetType === 'topic' ? 'Topic' : 'Post';

    const targetDoc = await Model.findById(targetId);
    if (!targetDoc) return res.status(404).json({ error: 'Target not found' });

    const existingVote = await Vote.findOne({ targetId, targetModel: targetModelStr, authorId });
    const currentVoteVal = existingVote ? existingVote.value : 0;

    let upvoteDelta = 0;
    let downvoteDelta = 0;

    if (currentVoteVal === 1) upvoteDelta -= 1;
    if (currentVoteVal === -1) downvoteDelta -= 1;

    if (vote === 1) upvoteDelta += 1;
    if (vote === -1) downvoteDelta += 1;

    targetDoc.upvotes += upvoteDelta;
    targetDoc.downvotes += downvoteDelta;
    targetDoc.score = targetDoc.upvotes - targetDoc.downvotes;
    
    await targetDoc.save();

    if (vote === 0) {
      if (existingVote) await Vote.findByIdAndDelete(existingVote._id);
    } else {
      if (existingVote) {
        existingVote.value = vote;
        await existingVote.save();
      } else {
        await Vote.create({ targetId, targetModel: targetModelStr, authorId, value: vote });
      }
    }

    res.status(200).json({ message: 'Vote recorded' });
  } catch (error) {
    next(error);
  }
};

module.exports = { createPost, getPosts, toggleVote };
