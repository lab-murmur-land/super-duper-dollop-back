const mongoose = require('mongoose');

const voteSchema = new mongoose.Schema({
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'targetModel'
  },
  targetModel: {
    type: String,
    required: true,
    enum: ['Topic', 'Post']
  },
  authorId: {
    type: String,
    required: true
  },
  value: {
    type: Number,
    required: true,
    enum: [1, -1] // 1 for upvote, -1 for downvote
  }
}, { timestamps: true });

// Prevent user from voting on same target multiple times
voteSchema.index({ targetId: 1, targetModel: 1, authorId: 1 }, { unique: true });

module.exports = mongoose.model('Vote', voteSchema);
