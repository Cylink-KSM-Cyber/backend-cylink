import {
  getFeedbackList,
  createFeedback,
  voteFeedback,
  removeVote,
  getVoters,
  searchSimilar,
  deleteFeedback,
} from './feedback';

/**
 * Feedback Controller
 *
 * Handles feedback-related operations including listing, creating, voting, and deleting feedback
 * @module controllers/feedbackController
 */

// Export the refactored getFeedbackList function
exports.getFeedbackList = getFeedbackList;

// Export the refactored createFeedback function
exports.createFeedback = createFeedback;

// Export the refactored voteFeedback function
exports.voteFeedback = voteFeedback;

// Export the refactored removeVote function
exports.removeVote = removeVote;

// Export the refactored getVoters function
exports.getVoters = getVoters;

// Export the refactored searchSimilar function
exports.searchSimilar = searchSimilar;

// Export the refactored deleteFeedback function
exports.deleteFeedback = deleteFeedback;
