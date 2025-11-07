// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IReputationRegistry
 * @dev Interface for ERC-8004 Reputation Registry
 * @notice Standard interface for posting and fetching feedback signals
 *
 * Reputation Registry enables an ecosystem of specialized services for agent scoring,
 * auditor networks, and insurance pools. Scoring and aggregation occur both on-chain
 * (for composability) and off-chain (for sophisticated algorithms).
 */
interface IReputationRegistry {
    /**
     * @dev Feedback categories for agent interactions
     */
    enum FeedbackType {
        POSITIVE,      // Successful interaction
        NEGATIVE,      // Failed interaction
        NEUTRAL,       // Informational feedback
        DISPUTE        // Disputed interaction
    }

    /**
     * @dev Structure for feedback entry
     */
    struct Feedback {
        address reviewer;         // Address that posted the feedback
        uint256 agentId;         // Agent being reviewed
        FeedbackType feedbackType; // Type of feedback
        uint8 rating;            // Rating (0-100)
        string contextHash;      // Hash/CID of context proving the interaction
        string metadata;         // IPFS/Arweave URI with detailed feedback
        uint256 timestamp;       // When feedback was posted
        uint256 stake;           // Optional stake backing this feedback
        bool disputed;           // Whether this feedback is under dispute
    }

    /**
     * @dev Emitted when feedback is posted for an agent
     */
    event FeedbackPosted(
        uint256 indexed feedbackId,
        uint256 indexed agentId,
        address indexed reviewer,
        FeedbackType feedbackType,
        uint8 rating,
        string contextHash
    );

    /**
     * @dev Emitted when feedback is disputed
     */
    event FeedbackDisputed(
        uint256 indexed feedbackId,
        address indexed disputer,
        string disputeReason
    );

    /**
     * @dev Emitted when a dispute is resolved
     */
    event DisputeResolved(
        uint256 indexed feedbackId,
        bool feedbackRemoved,
        address resolver
    );

    /**
     * @dev Emitted when an agent's reputation score is updated
     */
    event ReputationUpdated(
        uint256 indexed agentId,
        uint256 newScore,
        uint256 totalFeedbacks
    );

    /**
     * @dev Post feedback for an agent
     * @param agentId The agent being reviewed
     * @param feedbackType The type of feedback (positive, negative, neutral, dispute)
     * @param rating Rating from 0-100
     * @param contextHash Hash/CID proving the interaction occurred
     * @param metadata IPFS/Arweave URI with detailed feedback
     * @return feedbackId The unique ID of the posted feedback
     *
     * Requirements:
     * - agentId must exist in IdentityRegistry
     * - rating must be between 0 and 100
     * - contextHash should not be empty for verifiable feedback
     */
    function postFeedback(
        uint256 agentId,
        FeedbackType feedbackType,
        uint8 rating,
        string calldata contextHash,
        string calldata metadata
    ) external payable returns (uint256 feedbackId);

    /**
     * @dev Post staked feedback (requires ETH stake)
     * @param agentId The agent being reviewed
     * @param feedbackType The type of feedback
     * @param rating Rating from 0-100
     * @param contextHash Hash/CID proving the interaction
     * @param metadata IPFS/Arweave URI with detailed feedback
     * @return feedbackId The unique ID of the posted feedback
     *
     * Requirements:
     * - Must send ETH as stake with transaction
     * - Stake can be slashed if feedback is proven false
     */
    function postStakedFeedback(
        uint256 agentId,
        FeedbackType feedbackType,
        uint8 rating,
        string calldata contextHash,
        string calldata metadata
    ) external payable returns (uint256 feedbackId);

    /**
     * @dev Dispute a feedback entry
     * @param feedbackId The feedback to dispute
     * @param disputeReason URI pointing to evidence/reason for dispute
     *
     * Requirements:
     * - Caller must be the agent owner or authorized disputer
     * - Feedback must not already be under dispute
     */
    function disputeFeedback(uint256 feedbackId, string calldata disputeReason) external;

    /**
     * @dev Resolve a dispute (restricted to authorized resolvers)
     * @param feedbackId The disputed feedback
     * @param removeFeedback Whether to remove the feedback
     * @param slashStake Whether to slash the reviewer's stake
     *
     * Requirements:
     * - Caller must be an authorized dispute resolver
     * - Feedback must be under dispute
     */
    function resolveDispute(
        uint256 feedbackId,
        bool removeFeedback,
        bool slashStake
    ) external;

    /**
     * @dev Get feedback by ID
     * @param feedbackId The feedback ID
     * @return The feedback struct
     */
    function getFeedback(uint256 feedbackId) external view returns (Feedback memory);

    /**
     * @dev Get all feedback for an agent
     * @param agentId The agent ID
     * @return Array of feedback IDs for this agent
     */
    function getAgentFeedback(uint256 agentId) external view returns (uint256[] memory);

    /**
     * @dev Get feedback count by type for an agent
     * @param agentId The agent ID
     * @param feedbackType The type of feedback to count
     * @return The count of feedback entries of this type
     */
    function getFeedbackCountByType(
        uint256 agentId,
        FeedbackType feedbackType
    ) external view returns (uint256);

    /**
     * @dev Get the computed reputation score for an agent
     * @param agentId The agent ID
     * @return score The reputation score (0-10000, representing 0.00-100.00)
     * @return feedbackCount The total number of feedback entries
     */
    function getReputationScore(uint256 agentId)
        external
        view
        returns (uint256 score, uint256 feedbackCount);

    /**
     * @dev Get feedback posted by a specific reviewer
     * @param reviewer The reviewer's address
     * @return Array of feedback IDs posted by this reviewer
     */
    function getFeedbackByReviewer(address reviewer)
        external
        view
        returns (uint256[] memory);

    /**
     * @dev Check if an address is an authorized dispute resolver
     * @param resolver The address to check
     * @return True if authorized, false otherwise
     */
    function isDisputeResolver(address resolver) external view returns (bool);
}
