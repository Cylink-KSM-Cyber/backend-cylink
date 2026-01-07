/**
 * Feedback Service
 *
 * Provides business logic for the Feedback Board feature
 * @module services/feedbackService
 */

const feedbackModel = require('../models/feedbackModel');
const feedbackVoteModel = require('../models/feedbackVoteModel');
const userModel = require('../models/userModel');

import {
  FeedbackData,
  FeedbackCreateInput,
  FeedbackFilters,
  FeedbackType,
  FeedbackStatus,
} from '../models/feedbackModel';
import { VoteType, VoteReason, VoterInfo } from '../models/feedbackVoteModel';

/**
 * Feedback response interface for API responses
 */
export interface FeedbackResponse {
  id: number;
  title: string;
  description: string;
  type: FeedbackType;
  status: FeedbackStatus;
  user_id: number | null;
  created_at: string;
  updated_at: string;
  upvotes: number;
  downvotes: number;
  score: number;
  tags: string[];
  use_case?: string;
  reproduction_steps?: string;
  expected_behavior?: string;
  actual_behavior?: string;
  voters: VoterInfo[];
  total_voters: number;
  user_vote: VoteType | null;
  author: {
    id: number;
    name: string;
    email: string;
    avatar_url: string | null;
  } | null;
}

/**
 * Pagination info interface
 */
export interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

/**
 * Calculates Wilson Score for confidence-based ranking
 * @param upvotes - Number of upvotes
 * @param downvotes - Number of downvotes
 * @returns Wilson Score value
 */
const calculateWilsonScore = (upvotes: number, downvotes: number): number => {
  const n = upvotes + downvotes;
  if (n === 0) return 0;

  const z = 1.96; // 95% confidence
  const p = upvotes / n;

  const numerator = p + (z * z) / (2 * n) - z * Math.sqrt((p * (1 - p) + (z * z) / (4 * n)) / n);
  const denominator = 1 + (z * z) / n;

  return numerator / denominator;
};

/**
 * Formats a feedback record for API response
 * @param feedback - Raw feedback data
 * @param userId - Current user ID for vote status
 * @param voters - First N voters for facepile
 * @param totalVoters - Total upvoter count
 * @param userVote - Current user's vote type
 * @param author - Author user data
 * @returns Formatted feedback response
 */
const formatFeedbackResponse = (
  feedback: FeedbackData,
  userId: number,
  voters: VoterInfo[],
  totalVoters: number,
  userVote: VoteType | null,
  author: { id: number; username: string; email: string } | null,
): FeedbackResponse => {
  const response: FeedbackResponse = {
    id: feedback.id,
    title: feedback.title,
    description: feedback.description,
    type: feedback.type,
    status: feedback.status,
    user_id: feedback.user_id,
    created_at: feedback.created_at.toISOString(),
    updated_at: feedback.updated_at.toISOString(),
    upvotes: feedback.upvotes,
    downvotes: feedback.downvotes,
    score: feedback.score,
    tags: feedback.tags || [],
    voters,
    total_voters: totalVoters,
    user_vote: userVote,
    author: author
      ? {
          id: author.id,
          name: author.username,
          email: author.email,
          avatar_url: null,
        }
      : null,
  };

  // Add type-specific fields
  if (feedback.type === 'feature' && feedback.use_case) {
    response.use_case = feedback.use_case;
  }

  if (feedback.type === 'bug') {
    if (feedback.reproduction_steps) response.reproduction_steps = feedback.reproduction_steps;
    if (feedback.expected_behavior) response.expected_behavior = feedback.expected_behavior;
    if (feedback.actual_behavior) response.actual_behavior = feedback.actual_behavior;
  }

  return response;
};

/**
 * Creates a new feedback with auto-upvote for the author
 * @param userId - Creating user ID
 * @param data - Feedback creation data
 * @returns Created feedback response
 */
const createFeedback = async (
  userId: number,
  data: Omit<FeedbackCreateInput, 'user_id'>,
): Promise<FeedbackResponse> => {
  // Create the feedback
  const feedback = await feedbackModel.createFeedback({
    ...data,
    user_id: userId,
  });

  // Auto-upvote for the author
  await feedbackVoteModel.createVote({
    feedback_id: feedback.id,
    user_id: userId,
    vote_type: 'upvote',
  });

  // Get author info
  const author = await userModel.getUserById(userId);

  // Format and return response
  const voters = await feedbackVoteModel.getVotersByFeedback(feedback.id, 5);
  const totalVoters = await feedbackVoteModel.getTotalVotersCount(feedback.id);

  return formatFeedbackResponse(feedback, userId, voters, totalVoters, 'upvote', author);
};

/**
 * Gets paginated feedback list with filters
 * @param userId - Current user ID
 * @param filters - Filter options
 * @returns Paginated feedback list
 */
const getFeedbackList = async (
  userId: number,
  filters: FeedbackFilters,
): Promise<{
  data: FeedbackResponse[];
  pagination: PaginationInfo;
}> => {
  const { page = 1, limit = 10 } = filters;

  const { feedbacks, total } = await feedbackModel.getFeedbackList({
    ...filters,
    userId,
  });

  // Enrich each feedback with voters, user vote, and author info
  const enrichedFeedbacks = await Promise.all(
    feedbacks.map(async (feedback: FeedbackData) => {
      const [voters, totalVoters, userVote, author] = await Promise.all([
        feedbackVoteModel.getVotersByFeedback(feedback.id, 5),
        feedbackVoteModel.getTotalVotersCount(feedback.id),
        feedbackVoteModel.getVoteByUserAndFeedback(userId, feedback.id),
        feedback.user_id ? userModel.getUserById(feedback.user_id) : null,
      ]);

      return formatFeedbackResponse(
        feedback,
        userId,
        voters,
        totalVoters,
        userVote?.vote_type || null,
        author,
      );
    }),
  );

  return {
    data: enrichedFeedbacks,
    pagination: {
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
    },
  };
};

/**
 * Votes on a feedback item
 * @param userId - Voting user ID
 * @param feedbackId - Feedback ID
 * @param voteType - Type of vote
 * @param reason - Optional reason for downvote
 * @param comment - Optional comment for downvote
 * @returns Updated vote data
 */
const voteFeedback = async (
  userId: number,
  feedbackId: number,
  voteType: VoteType,
  reason?: VoteReason,
  comment?: string,
): Promise<{
  id: number;
  upvotes: number;
  downvotes: number;
  score: number;
  user_vote: VoteType;
  voters: VoterInfo[];
  total_voters: number;
}> => {
  // Check if feedback exists
  const feedback = await feedbackModel.getFeedbackById(feedbackId);
  if (!feedback) {
    throw { status: 404, message: 'Feedback not found' };
  }

  // Check if user is voting on their own feedback
  if (feedback.user_id === userId) {
    throw { status: 409, message: 'You cannot vote on your own feedback' };
  }

  // Check for existing vote
  const existingVote = await feedbackVoteModel.getVoteByUserAndFeedback(userId, feedbackId);

  if (existingVote) {
    // Update existing vote
    // When changing to upvote, explicitly set reason/comment to null to clear them
    await feedbackVoteModel.updateVote(existingVote.id, {
      vote_type: voteType,
      reason: voteType === 'downvote' ? reason : null,
      comment: voteType === 'downvote' ? comment : null,
    });
  } else {
    // Create new vote
    await feedbackVoteModel.createVote({
      feedback_id: feedbackId,
      user_id: userId,
      vote_type: voteType,
      reason: voteType === 'downvote' ? reason : undefined,
      comment: voteType === 'downvote' ? comment : undefined,
    });
  }

  // Update vote counts in feedback table
  await feedbackModel.updateVoteCounts(feedbackId);

  // Get updated data
  const updatedFeedback = await feedbackModel.getFeedbackById(feedbackId);
  const voters = await feedbackVoteModel.getVotersByFeedback(feedbackId, 5);
  const totalVoters = await feedbackVoteModel.getTotalVotersCount(feedbackId);

  return {
    id: feedbackId,
    upvotes: updatedFeedback.upvotes,
    downvotes: updatedFeedback.downvotes,
    score: updatedFeedback.score,
    user_vote: voteType,
    voters,
    total_voters: totalVoters,
  };
};

/**
 * Removes a vote from a feedback item
 * @param userId - User ID
 * @param feedbackId - Feedback ID
 * @returns Updated vote data
 */
const removeVote = async (
  userId: number,
  feedbackId: number,
): Promise<{
  id: number;
  upvotes: number;
  downvotes: number;
  score: number;
  user_vote: null;
  voters: VoterInfo[];
  total_voters: number;
}> => {
  // Check if feedback exists
  const feedback = await feedbackModel.getFeedbackById(feedbackId);
  if (!feedback) {
    throw { status: 404, message: 'Feedback not found' };
  }

  // Check if user is the author (cannot remove auto-upvote)
  if (feedback.user_id === userId) {
    throw { status: 409, message: 'You cannot remove your vote from your own feedback' };
  }

  // Check for existing vote
  const existingVote = await feedbackVoteModel.getVoteByUserAndFeedback(userId, feedbackId);
  if (!existingVote) {
    throw { status: 404, message: 'Vote not found' };
  }

  // Delete vote
  await feedbackVoteModel.deleteVote(userId, feedbackId);

  // Update vote counts
  await feedbackModel.updateVoteCounts(feedbackId);

  // Get updated data
  const updatedFeedback = await feedbackModel.getFeedbackById(feedbackId);
  const voters = await feedbackVoteModel.getVotersByFeedback(feedbackId, 5);
  const totalVoters = await feedbackVoteModel.getTotalVotersCount(feedbackId);

  return {
    id: feedbackId,
    upvotes: updatedFeedback.upvotes,
    downvotes: updatedFeedback.downvotes,
    score: updatedFeedback.score,
    user_vote: null,
    voters,
    total_voters: totalVoters,
  };
};

/**
 * Gets list of voters for a feedback item
 * @param feedbackId - Feedback ID
 * @param search - Optional search term
 * @returns Voters list with total count
 */
const getVoters = async (
  feedbackId: number,
  search?: string,
): Promise<{
  voters: VoterInfo[];
  total: number;
}> => {
  // Check if feedback exists
  const feedback = await feedbackModel.getFeedbackById(feedbackId);
  if (!feedback) {
    throw { status: 404, message: 'Feedback not found' };
  }

  const voters = await feedbackVoteModel.getVotersByFeedback(feedbackId, undefined, search);
  const total = await feedbackVoteModel.getTotalVotersCount(feedbackId);

  return { voters, total };
};

/**
 * Searches for similar feedback items
 * @param title - Title to search for
 * @returns Array of similar feedback items
 */
const searchSimilar = async (
  title: string,
): Promise<
  Array<{
    id: number;
    title: string;
    description: string;
    type: FeedbackType;
    status: FeedbackStatus;
    upvotes: number;
    score: number;
    created_at: string;
  }>
> => {
  const feedbacks = await feedbackModel.searchSimilarFeedback(title, 5);

  return feedbacks.map((feedback: FeedbackData) => ({
    id: feedback.id,
    title: feedback.title,
    description: feedback.description,
    type: feedback.type,
    status: feedback.status,
    upvotes: feedback.upvotes,
    score: feedback.score,
    created_at: feedback.created_at.toISOString(),
  }));
};

/**
 * Deletes a feedback item
 * @param userId - User ID requesting deletion
 * @param feedbackId - Feedback ID to delete
 * @param isAdmin - Whether user is admin
 */
const deleteFeedback = async (
  userId: number,
  feedbackId: number,
  isAdmin: boolean = false,
): Promise<void> => {
  // Check if feedback exists
  const feedback = await feedbackModel.getFeedbackById(feedbackId);
  if (!feedback) {
    throw { status: 404, message: 'Feedback not found' };
  }

  // Check permission
  if (!isAdmin && feedback.user_id !== userId) {
    throw { status: 403, message: "You don't have permission to delete this feedback" };
  }

  // Soft delete the feedback
  const deleted = await feedbackModel.deleteFeedback(feedbackId);
  if (!deleted) {
    throw { status: 500, message: 'Failed to delete feedback' };
  }
};

module.exports = {
  calculateWilsonScore,
  createFeedback,
  getFeedbackList,
  voteFeedback,
  removeVote,
  getVoters,
  searchSimilar,
  deleteFeedback,
};
