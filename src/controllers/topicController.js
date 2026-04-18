const Topic = require('../models/Topic');

const createTopic = async (req, res, next) => {
  try {
    const { title, content } = req.body;
    const authorId = req.user.uid;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const newTopic = await Topic.create({
      title,
      content: content || '',
      authorId
    });

    const publicTopic = newTopic.toObject();
    delete publicTopic.authorId;
    publicTopic.authorName = 'Anonymous';

    res.status(201).json({ message: 'Topic created', data: publicTopic });
  } catch (error) {
    next(error);
  }
};

const getTopics = async (req, res, next) => {
  try {
    const { sort, search, q, limit, page } = req.query;
    
    const pageNum = parseInt(page, 10) || 1;
    let queryLimit = limit ? parseInt(limit, 10) : 50;
    const skip = (pageNum - 1) * queryLimit;

    let filter = {};
    const searchTerm = search || q;
    if (searchTerm) {
      filter.$or = [
        { title: { $regex: searchTerm, $options: 'i' } },
        { content: { $regex: searchTerm, $options: 'i' } }
      ];
    }

    let sortOption = { createdAt: -1 };
    if (!searchTerm) {
      if (sort === 'most-vote') {
        sortOption = { score: -1 };
      } else if (sort === 'most-view') {
        sortOption = { views: -1 };
      }
    }

    const totalDocuments = await Topic.countDocuments(filter);
    const totalPages = Math.ceil(totalDocuments / queryLimit);

    const topics = await Topic.find(filter)
      .sort(sortOption)
      .skip(skip)
      .limit(queryLimit)
      .lean();

    const publicTopics = topics.map(topic => {
      delete topic.authorId;
      return { ...topic, authorName: 'Anonymous' };
    });

    res.status(200).json({ 
      data: publicTopics,
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

const getTopicById = async (req, res, next) => {
  try {
    const topicId = req.params.id;

    // findByIdAndUpdate to increment views atomically
    const topic = await Topic.findByIdAndUpdate(
      topicId,
      { $inc: { views: 1 } },
      { new: true }
    ).lean();

    if (!topic) {
      return res.status(404).json({ error: 'Topic not found' });
    }

    delete topic.authorId;
    
    res.status(200).json({ 
      data: { 
        ...topic, 
        authorName: 'Anonymous' 
      }
    });
  } catch (error) {
    next(error);
  }
};

const updateTopic = async (req, res, next) => {
  try {
    const topicId = req.params.id;
    const { title, content } = req.body;
    
    const topic = await Topic.findById(topicId);
    if (!topic) return res.status(404).json({ error: 'Topic not found' });
    
    if (topic.authorId !== req.user.uid) {
      return res.status(403).json({ error: 'You are not authorized to update this topic' });
    }

    if (title) topic.title = title;
    if (content !== undefined) topic.content = content;
    
    await topic.save();
    
    const publicTopic = topic.toObject();
    delete publicTopic.authorId;
    publicTopic.authorName = 'Anonymous';
    
    res.status(200).json({ message: 'Topic updated successfully', data: publicTopic });
  } catch (error) {
    next(error);
  }
};

const deleteTopic = async (req, res, next) => {
  try {
    const topicId = req.params.id;
    
    const topic = await Topic.findById(topicId);
    if (!topic) return res.status(404).json({ error: 'Topic not found' });
    
    if (topic.authorId !== req.user.uid) {
      return res.status(403).json({ error: 'You are not authorized to delete this topic' });
    }

    await Topic.findByIdAndDelete(topicId);
    // Also delete posts and votes related to this topic
    const Post = require('../models/Post');
    const Vote = require('../models/Vote');
    await Post.deleteMany({ topicId });
    await Vote.deleteMany({ targetId: topicId, targetModel: 'Topic' });
    
    res.status(200).json({ message: 'Topic and related data deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = { createTopic, getTopics, getTopicById, updateTopic, deleteTopic };
