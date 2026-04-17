const { db, admin } = require('../config/firebase');

/**
 * Controller: Create Topic
 */
const createTopic = async (req, res, next) => {
  try {
    const { title, content } = req.body;
    const authorId = req.user.uid;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const topicRef = db.collection('topics').doc();
    const newTopic = {
      id: topicRef.id,
      title: title,
      content: content || '', // Optional early body
      authorId: authorId,    // Stored but stripped later
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      views: 0,
      upvotes: 0,
      downvotes: 0,
      score: 0 // pre-calculating simple net score
    };

    await topicRef.set(newTopic);

    // Filter out authorId before returning
    const { authorId: _, ...publicTopic } = newTopic;
    publicTopic.authorName = 'Anonymous';

    res.status(201).json({ message: 'Topic created', data: publicTopic });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller: Get Topics List (Supports Sorting & Searching)
 */
const getTopics = async (req, res, next) => {
  try {
    const { sort, search, limit } = req.query;
    let queryLimit = limit ? parseInt(limit, 10) : 50;

    let topicsQuery = db.collection('topics');

    // 1. If Searching
    // Real full-text search is not supported in Firestore natively. Standard "string ranges" 
    // for starts-with search can be used if sorting by title:
    if (search) {
      // NOTE: Can't easily mix 'search' inequality on title and order by 'score' in Firestore directly 
      // without complex composite indexing. 
      // If search is provided, we filter by title boundaries (start-with logic on a field e.g., titleLower) 
      const startText = search;
      const endText = search + '\uf8ff';
      topicsQuery = topicsQuery
        .where('title', '>=', startText)
        .where('title', '<=', endText);
      // Fallback: If search applied, you cannot orderBy different fields easily. So we might sort on client side
    } else {
      // 2. Sorting (When no search applied)
      if (sort === 'most-vote') {
        topicsQuery = topicsQuery.orderBy('score', 'desc');
      } else if (sort === 'most-view') {
        topicsQuery = topicsQuery.orderBy('views', 'desc');
      } else {
        // default latest
        topicsQuery = topicsQuery.orderBy('createdAt', 'desc');
      }
    }

    topicsQuery = topicsQuery.limit(queryLimit);
    const snapshot = await topicsQuery.get();

    const topics = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      const { authorId, ...safeData } = data; // Strip author info
      topics.push({
        ...safeData,
        authorName: 'Anonymous'
      });
    });

    res.status(200).json({ data: topics });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller: Get Single Topic and Increment Views
 */
const getTopicById = async (req, res, next) => {
  try {
    const topicId = req.params.id;
    const topicRef = db.collection('topics').doc(topicId);
    
    // We update atomically if possible
    await topicRef.update({
      views: admin.firestore.FieldValue.increment(1)
    });

    const topicSnap = await topicRef.get();
    if (!topicSnap.exists) {
      return res.status(404).json({ error: 'Topic not found' });
    }

    const data = topicSnap.data();
    const { authorId, ...safeData } = data; // Safe version

    res.status(200).json({ 
      data: { 
        ...safeData, 
        authorName: 'Anonymous' 
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { createTopic, getTopics, getTopicById };
