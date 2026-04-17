const { db, admin, storage } = require('../config/firebase');

/**
 * Controller: Create a Post directly under a Topic
 */
const createPost = async (req, res, next) => {
  try {
    const { topicId } = req.params;
    const { content } = req.body;
    const authorId = req.user.uid;
    const file = req.file;

    if (!topicId) return res.status(400).json({ error: 'Topic ID is required' });
    if (!content && !file) return res.status(400).json({ error: 'Content or file is required' });

    // Validate if topic exists
    const topicRef = db.collection('topics').doc(topicId);
    const topicSnap = await topicRef.get();
    if (!topicSnap.exists) {
      return res.status(404).json({ error: 'Topic not found' });
    }

    let fileUrl = null;
    if (file) {
      // Create unique name
      const fileName = `posts/${Date.now()}_${file.originalname}`;
      const bucket = storage.bucket();
      const fileUpload = bucket.file(fileName);

      await fileUpload.save(file.buffer, {
        metadata: { contentType: file.mimetype },
        public: true, // Needs Storage rules adjustment if using standard buckets
      });

      // Get public URL depending on bucket configs or use standard format:
      fileUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
    }

    const postRef = topicRef.collection('posts').doc();
    const newPost = {
      id: postRef.id,
      content: content || '',
      fileUrl: fileUrl,
      authorId: authorId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      upvotes: 0,
      downvotes: 0,
      score: 0
    };

    await postRef.set(newPost);

    // Filter author
    const { authorId: _, ...publicPost } = newPost;
    publicPost.authorName = 'Anonymous';

    res.status(201).json({ message: 'Post created', data: publicPost });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller: Get Posts inside a Topic
 */
const getPosts = async (req, res, next) => {
  try {
    const { topicId } = req.params;
    const { sort } = req.query; // e.g. 'latest', 'most-vote'

    const topicRef = db.collection('topics').doc(topicId);
    let postsQuery = topicRef.collection('posts');

    if (sort === 'most-vote') {
      postsQuery = postsQuery.orderBy('score', 'desc');
    } else {
      postsQuery = postsQuery.orderBy('createdAt', 'desc');
    }

    const snapshot = await postsQuery.get();

    const posts = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      const { authorId, ...safeData } = data;
      posts.push({ ...safeData, authorName: 'Anonymous' });
    });

    res.status(200).json({ data: posts });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller: Toggle Vote on a target
 * Expecting params: req.body.targetId (the topic or post), req.body.type ('topic' or 'post'), req.body.vote (1 for up, -1 for down)
 */
const toggleVote = async (req, res, next) => {
  try {
    const { targetId, targetType, vote } = req.body;
    const authorId = req.user.uid;

    if (!targetId || !targetType || ![1, -1, 0].includes(vote)) {
      return res.status(400).json({ error: 'Invalid vote parameters.' });
    }

    let targetRef;
    if (targetType === 'topic') {
      targetRef = db.collection('topics').doc(targetId);
    } else if (targetType === 'post') {
      // Need topicId for posts if we are nested!
      // To simplify voting on Posts, the targetId might be 'topics/{tId}/posts/{pId}' explicitly or passed via param
      const { topicId } = req.body; 
      if (!topicId) return res.status(400).json({ error: 'topicId required to vote on posts' });
      targetRef = db.collection('topics').doc(topicId).collection('posts').doc(targetId);
    } else {
      return res.status(400).json({ error: 'targetType must be topic or post' });
    }

    const voteRef = targetRef.collection('votes').doc(authorId);

    await db.runTransaction(async (t) => {
      const voteDoc = await t.get(voteRef);
      const targetDoc = await t.get(targetRef);

      if (!targetDoc.exists) throw new Error('Target document does not exist.');

      const currentVote = voteDoc.exists ? voteDoc.data().value : 0;
      
      // Calculate diffs
      let upvoteDelta = 0;
      let downvoteDelta = 0;
      
      // remove old vote
      if (currentVote === 1) upvoteDelta -= 1;
      if (currentVote === -1) downvoteDelta -= 1;
      
      // add new vote
      if (vote === 1) upvoteDelta += 1;
      if (vote === -1) downvoteDelta += 1;

      // New values
      const currentStats = targetDoc.data();
      const newUpvotes = (currentStats.upvotes || 0) + upvoteDelta;
      const newDownvotes = (currentStats.downvotes || 0) + downvoteDelta;
      const newScore = newUpvotes - newDownvotes;

      t.update(targetRef, {
        upvotes: newUpvotes,
        downvotes: newDownvotes,
        score: newScore
      });

      if (vote === 0) {
         t.delete(voteRef); // Withdrawing vote
      } else {
         t.set(voteRef, { value: vote, timestamp: admin.firestore.FieldValue.serverTimestamp() });
      }
    });

    res.status(200).json({ message: 'Vote recorded' });
  } catch (error) {
    next(error);
  }
};

module.exports = { createPost, getPosts, toggleVote };
