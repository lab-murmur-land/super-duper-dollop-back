const mongoose = require('mongoose');

const topicSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  content: {
    type: String,
    default: ''
  },
  authorId: {
    type: String,
    required: true
  },
  views: {
    type: Number,
    default: 0
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

module.exports = mongoose.model('Topic', topicSchema);
