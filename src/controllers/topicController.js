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
    const { sort, search, limit } = req.query;
    let queryLimit = limit ? parseInt(limit, 10) : 50;

    let filter = {};
    if (search) {
      filter.title = { $regex: search, $options: 'i' };
    }

    let sortOption = { createdAt: -1 };
    if (!search) {
      if (sort === 'most-vote') {
        sortOption = { score: -1 };
      } else if (sort === 'most-view') {
        sortOption = { views: -1 };
      }
    }

    const topics = await Topic.find(filter)
      .sort(sortOption)
      .limit(queryLimit)
      .lean();

    const publicTopics = topics.map(topic => {
      delete topic.authorId;
      return { ...topic, authorName: 'Anonymous' };
    });

    res.status(200).json({ data: publicTopics });
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
}

module.exports = { createTopic, getTopics, getTopicById };
