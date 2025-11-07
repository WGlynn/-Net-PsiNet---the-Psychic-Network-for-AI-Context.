// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./CRPCValidator.sol";
import "./erc8004/IReputationRegistry.sol";
import "./PsiToken.sol";

/**
 * @title CRPCIntegration
 * @dev Integrates CRPC with ΨNet's reputation and economic systems
 *
 * This contract creates powerful synergies:
 * 1. CRPC winners get reputation boosts
 * 2. High-reputation agents become trusted validators
 * 3. $PSI rewards for quality work (verified via CRPC)
 * 4. Network effect bonuses for collaborative validation
 * 5. Reduces information asymmetry (trustless AI verification)
 */
contract CRPCIntegration {
    CRPCValidator public immutable crpcValidator;
    IReputationRegistry public immutable reputationRegistry;
    PsiToken public immutable psiToken;

    // Reputation rewards for CRPC performance
    uint256 public constant WINNER_REPUTATION_BONUS = 15; // +15 points
    uint256 public constant PARTICIPANT_REPUTATION_BONUS = 5; // +5 points
    uint256 public constant VALIDATOR_REPUTATION_BONUS = 3; // +3 points

    // PSI token bonuses (in addition to task rewards)
    uint256 public constant WINNER_PSI_BONUS = 1000 * 10**18; // 1000 PSI
    uint256 public constant TOP_3_PSI_BONUS = 500 * 10**18; // 500 PSI
    uint256 public constant VALIDATOR_PSI_BONUS = 100 * 10**18; // 100 PSI

    // Minimum reputation to become validator
    uint256 public constant MIN_VALIDATOR_REPUTATION = 75; // 75/100

    // Tracking for transparency
    mapping(uint256 => bool) public taskIntegrated;
    uint256 public totalWinnersBoosted;
    uint256 public totalValidatorsRewarded;
    uint256 public totalPSIDistributed;

    // Events
    event ReputationBoosted(uint256 indexed agentId, uint256 taskId, uint256 bonus, string reason);
    event ValidatorPromoted(address indexed validator, uint256 reputation);
    event PSIBonusDistributed(address indexed recipient, uint256 amount, string reason);

    constructor(
        address _crpcValidator,
        address _reputationRegistry,
        address _psiToken
    ) {
        require(_crpcValidator != address(0), "CRPCIntegration: zero CRPC address");
        require(_reputationRegistry != address(0), "CRPCIntegration: zero reputation address");
        require(_psiToken != address(0), "CRPCIntegration: zero PSI address");

        crpcValidator = CRPCValidator(payable(_crpcValidator));
        reputationRegistry = IReputationRegistry(_reputationRegistry);
        psiToken = PsiToken(_psiToken);
    }

    /**
     * @dev Integrate CRPC task results with reputation & economics
     * Call after task is finalized
     */
    function integrateCRPCTask(uint256 taskId) external {
        require(!taskIntegrated[taskId], "CRPCIntegration: already integrated");

        CRPCValidator.Task memory task = crpcValidator.getTask(taskId);
        require(task.finalized, "CRPCIntegration: task not finalized");
        require(task.phase == CRPCValidator.TaskPhase.FINALIZED, "CRPCIntegration: not finalized");

        // Get all submissions
        CRPCValidator.WorkSubmission[] memory submissions = crpcValidator.getTaskSubmissions(taskId);

        // Process each submission
        for (uint256 i = 0; i < submissions.length; i++) {
            if (submissions[i].revealed) {
                _processSubmission(taskId, i, submissions[i], submissions.length);
            }
        }

        // Reward validators
        _rewardValidators(taskId);

        taskIntegrated[taskId] = true;
    }

    /**
     * @dev Process individual submission
     * Awards reputation and PSI bonuses based on performance
     */
    function _processSubmission(
        uint256 taskId,
        uint256 submissionId,
        CRPCValidator.WorkSubmission memory submission,
        uint256 totalSubmissions
    ) private {
        // Reputation boost based on rank
        uint256 reputationBonus = 0;

        if (submission.rank == 1) {
            // Winner gets largest boost
            reputationBonus = WINNER_REPUTATION_BONUS;
            totalWinnersBoosted++;

            // Winner gets PSI bonus
            psiToken.transfer(submission.agent, WINNER_PSI_BONUS);
            totalPSIDistributed += WINNER_PSI_BONUS;

            emit PSIBonusDistributed(submission.agent, WINNER_PSI_BONUS, "CRPC_Winner");

        } else if (submission.rank <= 3 && totalSubmissions >= 5) {
            // Top 3 get moderate boost
            reputationBonus = WINNER_REPUTATION_BONUS / 2;

            // Top 3 get smaller PSI bonus
            psiToken.transfer(submission.agent, TOP_3_PSI_BONUS);
            totalPSIDistributed += TOP_3_PSI_BONUS;

            emit PSIBonusDistributed(submission.agent, TOP_3_PSI_BONUS, "CRPC_Top3");

        } else {
            // All participants get small boost (positive-sum!)
            reputationBonus = PARTICIPANT_REPUTATION_BONUS;
        }

        // Note: In production, this would call the reputation registry
        // For now, we emit event for transparency
        emit ReputationBoosted(
            submissionId, // In real integration, would be agentId from identity registry
            taskId,
            reputationBonus,
            submission.rank == 1 ? "Winner" : (submission.rank <= 3 ? "Top3" : "Participant")
        );
    }

    /**
     * @dev Reward validators who revealed comparisons
     */
    function _rewardValidators(uint256 taskId) private {
        // Note: In production, would get validators from CRPC contract
        // and check their reputation to promote high performers

        totalValidatorsRewarded++;

        // Validators earn PSI for honest validation work
        // This incentivizes quality validation and reduces information asymmetry

        emit PSIBonusDistributed(address(this), VALIDATOR_PSI_BONUS, "CRPC_Validator_Pool");
    }

    /**
     * @dev Check if an address is eligible to be a validator
     * Based on reputation score (reduces information asymmetry)
     */
    function isEligibleValidator(uint256 agentId) external view returns (bool) {
        (uint256 score, uint256 feedbackCount) = reputationRegistry.getReputationScore(agentId);

        // Minimum feedback requirement to prevent gaming
        if (feedbackCount < 5) {
            return false;
        }

        // Convert score (0-10000) to 0-100 scale
        uint256 reputation = score / 100;

        return reputation >= MIN_VALIDATOR_REPUTATION;
    }

    /**
     * @dev Promote high-reputation agents to validator role
     * Trustless promotion based on verifiable on-chain reputation
     */
    function promoteToValidator(uint256 agentId, address agentAddress) external {
        (uint256 score, uint256 feedbackCount) = reputationRegistry.getReputationScore(agentId);

        require(feedbackCount >= 5, "CRPCIntegration: insufficient feedback");

        uint256 reputation = score / 100;
        require(reputation >= MIN_VALIDATOR_REPUTATION, "CRPCIntegration: reputation too low");

        // Grant validator role
        // Note: In production, would call CRPC contract to grant VALIDATOR_ROLE

        emit ValidatorPromoted(agentAddress, reputation);
    }

    /**
     * @dev Get integration statistics (transparency)
     */
    function getIntegrationStats()
        external
        view
        returns (
            uint256 _totalWinnersBoosted,
            uint256 _totalValidatorsRewarded,
            uint256 _totalPSIDistributed
        )
    {
        _totalWinnersBoosted = totalWinnersBoosted;
        _totalValidatorsRewarded = totalValidatorsRewarded;
        _totalPSIDistributed = totalPSIDistributed;
    }

    /**
     * @dev Calculate expected rewards for CRPC participation
     * Helps reduce information asymmetry - agents know what to expect
     */
    function calculateExpectedRewards(uint256 expectedRank, uint256 totalParticipants)
        external
        pure
        returns (
            uint256 estimatedPSI,
            uint256 estimatedReputation,
            string memory tier
        )
    {
        if (expectedRank == 1) {
            estimatedPSI = WINNER_PSI_BONUS;
            estimatedReputation = WINNER_REPUTATION_BONUS;
            tier = "Winner";
        } else if (expectedRank <= 3 && totalParticipants >= 5) {
            estimatedPSI = TOP_3_PSI_BONUS;
            estimatedReputation = WINNER_REPUTATION_BONUS / 2;
            tier = "Top 3";
        } else {
            estimatedPSI = 0; // Only top performers get PSI bonus
            estimatedReputation = PARTICIPANT_REPUTATION_BONUS;
            tier = "Participant";
        }
    }
}
