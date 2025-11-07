// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./PsiToken.sol";
import "./erc8004/IIdentityRegistry.sol";
import "./erc8004/IReputationRegistry.sol";
import "./erc8004/IValidationRegistry.sol";

/**
 * @title PsiNetEconomics
 * @dev Integrates PsiToken with ERC-8004 registries for automated positive-sum economics
 *
 * This contract creates the economic layer that:
 * 1. Rewards high-reputation agents automatically
 * 2. Distributes cooperation bonuses
 * 3. Implements network effect multipliers
 * 4. Reduces information asymmetry through transparency
 * 5. Minimizes rent extraction through automated distribution
 */
contract PsiNetEconomics {
    PsiToken public immutable psiToken;
    IIdentityRegistry public immutable identityRegistry;
    IReputationRegistry public immutable reputationRegistry;
    IValidationRegistry public immutable validationRegistry;

    // Economic parameters
    uint256 public constant BASE_REWARD = 100 * 10**18; // 100 PSI
    uint256 public constant REPUTATION_THRESHOLD = 80; // 80/100
    uint256 public constant HIGH_REPUTATION_BONUS = 50 * 10**18; // 50 PSI
    uint256 public constant VALIDATION_REWARD = 200 * 10**18; // 200 PSI
    uint256 public constant COOPERATION_BASE = 500 * 10**18; // 500 PSI

    // Network effect thresholds
    uint256 public constant SMALL_NETWORK = 10;
    uint256 public constant MEDIUM_NETWORK = 50;
    uint256 public constant LARGE_NETWORK = 100;
    uint256 public constant MEGA_NETWORK = 500;

    // Tracking for transparency
    mapping(uint256 => uint256) public agentTotalRewards;
    mapping(uint256 => uint256) public agentCooperativeRewards;
    mapping(uint256 => uint256) public lastRewardBlock;

    uint256 public totalNetworkRewards;
    uint256 public totalCooperationRewards;
    uint256 public totalReputationRewards;
    uint256 public totalValidationRewards;

    // Events for transparency
    event ReputationReward(uint256 indexed agentId, uint256 reward, uint256 reputation);
    event CooperationReward(uint256 indexed agent1, uint256 indexed agent2, uint256 reward);
    event NetworkEffectBonus(uint256 indexed agentId, uint256 bonus, uint256 networkSize);
    event ValidationReward(uint256 indexed agentId, uint256 reward, bool success);
    event AutomaticDistribution(uint256 totalDistributed, uint256 recipientCount);

    constructor(
        address _psiToken,
        address _identityRegistry,
        address _reputationRegistry,
        address _validationRegistry
    ) {
        require(_psiToken != address(0), "PsiNetEconomics: zero token address");
        require(_identityRegistry != address(0), "PsiNetEconomics: zero identity address");
        require(_reputationRegistry != address(0), "PsiNetEconomics: zero reputation address");
        require(_validationRegistry != address(0), "PsiNetEconomics: zero validation address");

        psiToken = PsiToken(_psiToken);
        identityRegistry = IIdentityRegistry(_identityRegistry);
        reputationRegistry = IReputationRegistry(_reputationRegistry);
        validationRegistry = IValidationRegistry(_validationRegistry);
    }

    /**
     * @dev Automatically reward agent based on reputation
     * Positive-sum: High reputation earns passive rewards
     */
    function distributeReputationReward(uint256 agentId) external {
        require(identityRegistry.isAgentActive(agentId), "PsiNetEconomics: agent not active");

        // Get reputation score
        (uint256 score, uint256 feedbackCount) = reputationRegistry.getReputationScore(agentId);

        // Minimum feedback threshold to prevent gaming
        require(feedbackCount >= 5, "PsiNetEconomics: insufficient feedback");

        // Convert score (0-10000) to 0-100 scale
        uint256 reputation = score / 100;

        // Only reward high reputation
        require(reputation >= REPUTATION_THRESHOLD, "PsiNetEconomics: reputation too low");

        // Cooldown: once per 1000 blocks (~3.5 hours)
        require(
            block.number >= lastRewardBlock[agentId] + 1000,
            "PsiNetEconomics: reward cooldown"
        );

        // Calculate reward based on reputation
        uint256 reward = HIGH_REPUTATION_BONUS;
        uint256 reputationBonus = (reputation - REPUTATION_THRESHOLD) * 10 * 10**18;
        reward += reputationBonus;

        // Apply network effect multiplier
        uint256 networkSize = identityRegistry.getTotalAgents();
        reward = _applyNetworkEffect(reward, networkSize);

        // Grant REWARDER_ROLE to this contract first, then distribute
        address agentOwner = identityRegistry.getAgentOwner(agentId);
        psiToken.rewardAgent(agentOwner, reward, false, networkSize);

        // Track
        agentTotalRewards[agentId] += reward;
        totalReputationRewards += reward;
        lastRewardBlock[agentId] = block.number;

        emit ReputationReward(agentId, reward, reputation);
    }

    /**
     * @dev Reward cooperation between two agents
     * Mutualistic design: Both agents benefit, total > competitive scenario
     */
    function rewardCooperation(uint256 agent1Id, uint256 agent2Id) external {
        require(identityRegistry.isAgentActive(agent1Id), "PsiNetEconomics: agent1 not active");
        require(identityRegistry.isAgentActive(agent2Id), "PsiNetEconomics: agent2 not active");
        require(agent1Id != agent2Id, "PsiNetEconomics: cannot cooperate with self");

        // Get both agents
        address agent1Owner = identityRegistry.getAgentOwner(agent1Id);
        address agent2Owner = identityRegistry.getAgentOwner(agent2Id);

        // Both agents get cooperation bonus (positive-sum!)
        uint256 networkSize = identityRegistry.getTotalAgents();

        psiToken.rewardCooperation(agent1Owner, agent2Owner, COOPERATION_BASE);

        // Track
        agentCooperativeRewards[agent1Id] += COOPERATION_BASE * 150 / 100; // 1.5x
        agentCooperativeRewards[agent2Id] += COOPERATION_BASE * 150 / 100;
        agentTotalRewards[agent1Id] += COOPERATION_BASE * 150 / 100;
        agentTotalRewards[agent2Id] += COOPERATION_BASE * 150 / 100;
        totalCooperationRewards += COOPERATION_BASE * 3; // Total distributed

        emit CooperationReward(agent1Id, agent2Id, COOPERATION_BASE * 150 / 100);
    }

    /**
     * @dev Reward successful validation
     * Economic security through incentives
     */
    function rewardValidation(uint256 requestId) external {
        IValidationRegistry.ValidationRequest memory request =
            validationRegistry.getValidationRequest(requestId);

        require(
            request.status == IValidationRegistry.ValidationStatus.VALIDATED,
            "PsiNetEconomics: not validated"
        );

        IValidationRegistry.ValidationResponse memory response =
            validationRegistry.getValidationResponse(requestId);

        // Reward validator
        uint256 reward = VALIDATION_REWARD;

        // Bonus for approved validations
        if (response.approved) {
            reward = (reward * 120) / 100; // 20% bonus
        }

        // Apply network effect
        uint256 networkSize = identityRegistry.getTotalAgents();
        reward = _applyNetworkEffect(reward, networkSize);

        psiToken.rewardValidator(response.validator, reward);

        // Track
        totalValidationRewards += reward;

        emit ValidationReward(request.agentId, reward, response.approved);
    }

    /**
     * @dev Distribute network effect bonus to all agents
     * Positive-sum: Everyone benefits from network growth
     */
    function distributeNetworkEffectBonus() external {
        uint256 networkSize = identityRegistry.getTotalAgents();
        require(networkSize >= MEDIUM_NETWORK, "PsiNetEconomics: network too small");

        // Calculate total bonus based on Metcalfe's Law (Value ∝ n²)
        uint256 baseBonus = BASE_REWARD;
        uint256 networkValue = networkSize * networkSize;
        uint256 perAgentBonus = (baseBonus * networkValue) / (networkSize * 100);

        // Apply to all agents with minimum reputation
        uint256 distributed = 0;
        uint256 recipients = 0;

        for (uint256 i = 1; i <= networkSize; i++) {
            if (identityRegistry.isAgentActive(i)) {
                (uint256 score, uint256 feedbackCount) = reputationRegistry.getReputationScore(i);

                // Only distribute to agents with some reputation
                if (feedbackCount >= 3) {
                    address agentOwner = identityRegistry.getAgentOwner(i);
                    psiToken.rewardAgent(agentOwner, perAgentBonus, false, networkSize);

                    agentTotalRewards[i] += perAgentBonus;
                    distributed += perAgentBonus;
                    recipients++;

                    emit NetworkEffectBonus(i, perAgentBonus, networkSize);
                }
            }
        }

        totalNetworkRewards += distributed;

        emit AutomaticDistribution(distributed, recipients);
    }

    /**
     * @dev Apply network effect multiplier
     * Larger network = higher rewards for everyone (positive-sum!)
     */
    function _applyNetworkEffect(uint256 baseReward, uint256 networkSize)
        private
        pure
        returns (uint256)
    {
        if (networkSize >= MEGA_NETWORK) {
            return (baseReward * 300) / 100; // 3x
        } else if (networkSize >= LARGE_NETWORK) {
            return (baseReward * 200) / 100; // 2x
        } else if (networkSize >= MEDIUM_NETWORK) {
            return (baseReward * 150) / 100; // 1.5x
        } else if (networkSize >= SMALL_NETWORK) {
            return (baseReward * 120) / 100; // 1.2x
        }
        return baseReward; // 1x
    }

    /**
     * @dev Get economic stats for an agent
     * Transparency reduces information asymmetry
     */
    function getAgentEconomics(uint256 agentId)
        external
        view
        returns (
            uint256 totalRewards,
            uint256 cooperativeRewards,
            uint256 reputation,
            uint256 feedbackCount,
            uint256 validationSuccessRate
        )
    {
        totalRewards = agentTotalRewards[agentId];
        cooperativeRewards = agentCooperativeRewards[agentId];

        (uint256 score, uint256 count) = reputationRegistry.getReputationScore(agentId);
        reputation = score / 100; // Convert to 0-100
        feedbackCount = count;

        (uint256 successRate, ) = validationRegistry.getValidationSuccessRate(agentId);
        validationSuccessRate = successRate / 100; // Convert to 0-100
    }

    /**
     * @dev Get global economic stats
     * Full transparency of network economics
     */
    function getGlobalEconomics()
        external
        view
        returns (
            uint256 _totalNetworkRewards,
            uint256 _totalCooperationRewards,
            uint256 _totalReputationRewards,
            uint256 _totalValidationRewards,
            uint256 networkSize,
            uint256 avgReputation
        )
    {
        _totalNetworkRewards = totalNetworkRewards;
        _totalCooperationRewards = totalCooperationRewards;
        _totalReputationRewards = totalReputationRewards;
        _totalValidationRewards = totalValidationRewards;
        networkSize = identityRegistry.getTotalAgents();

        // Calculate average reputation
        uint256 totalRep = 0;
        uint256 activeCount = 0;

        for (uint256 i = 1; i <= networkSize; i++) {
            if (identityRegistry.isAgentActive(i)) {
                (uint256 score, ) = reputationRegistry.getReputationScore(i);
                totalRep += score;
                activeCount++;
            }
        }

        avgReputation = activeCount > 0 ? totalRep / (activeCount * 100) : 0;
    }

    /**
     * @dev Calculate potential rent extraction savings
     * Shows how much users save vs traditional platforms
     */
    function calculateRentExtractionSavings(uint256 transactionValue)
        external
        pure
        returns (
            uint256 psiNetFee,
            uint256 traditionalFee,
            uint256 savings,
            uint256 savingsPercentage
        )
    {
        // ΨNet: 0.1% fee
        psiNetFee = (transactionValue * 10) / 10000;

        // Traditional platform: 30% fee
        traditionalFee = (transactionValue * 3000) / 10000;

        // Savings
        savings = traditionalFee - psiNetFee;
        savingsPercentage = (savings * 10000) / traditionalFee; // Basis points
    }
}
