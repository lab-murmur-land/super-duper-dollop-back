const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  topicId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Topic',
    required: true
  },
  content: {
    type: String,
    default: ''
  },
  fileUrl: {
    type: String,
    default: null
  },
  authorId: {
    type: String,
    required: true
  },
  score: {
    type: Number,
    default: 0
  },
  upvotes: {
    type: Number,
    default: 0
  },
  downvotes: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

module.exports = mongoose.model('Post', postSchema);
