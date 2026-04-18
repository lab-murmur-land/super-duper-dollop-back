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
    const { sort, limit, page } = req.query; // 'latest', 'most-vote'

    const pageNum = parseInt(page, 10) || 1;
    let queryLimit = limit ? parseInt(limit, 10) : 50;
    const skip = (pageNum - 1) * queryLimit;

    let sortOption = { createdAt: -1 };
    if (sort === 'most-vote') {
      sortOption = { score: -1 };
    }

    const totalDocuments = await Post.countDocuments({ topicId });
    const totalPages = Math.ceil(totalDocuments / queryLimit);

    const posts = await Post.find({ topicId })
      .sort(sortOption)
      .skip(skip)
      .limit(queryLimit)
      .lean();

    const publicPosts = posts.map(post => {
      delete post.authorId;
      return { ...post, authorName: 'Anonymous' };
    });

    res.status(200).json({ 
      data: publicPosts,
      meta: {
        totalDocuments,
        totalPages,
        currentPage: pageNum,
        limit: queryLimit
      }
    });
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

const updatePost = async (req, res, next) => {
  try {
    const postId = req.params.postId;
    const { content } = req.body;
    
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    
    if (post.authorId !== req.user.uid) {
      return res.status(403).json({ error: 'You are not authorized to update this post' });
    }

    if (content !== undefined) post.content = content;
    
    // If we wanted to allow file updates we would handle req.file here
    
    await post.save();
    
    const publicPost = post.toObject();
    delete publicPost.authorId;
    publicPost.authorName = 'Anonymous';
    
    res.status(200).json({ message: 'Post updated successfully', data: publicPost });
  } catch (error) {
    next(error);
  }
};

const deletePost = async (req, res, next) => {
  try {
    const postId = req.params.postId;
    
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    
    if (post.authorId !== req.user.uid) {
      return res.status(403).json({ error: 'You are not authorized to delete this post' });
    }

    await Post.findByIdAndDelete(postId);
    // Also delete votes related to this post
    await Vote.deleteMany({ targetId: postId, targetModel: 'Post' });
    
    res.status(200).json({ message: 'Post and related data deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = { createPost, getPosts, toggleVote, updatePost, deletePost };
