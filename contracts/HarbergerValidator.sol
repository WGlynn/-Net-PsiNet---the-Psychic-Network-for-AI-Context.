// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./HarbergerNFT.sol";
import "./erc8004/IReputationRegistry.sol";

/**
 * @title HarbergerValidator
 * @dev CRPC validator positions with Harberger taxation
 *
 * INNOVATION: Validator slots as contestable assets
 *
 * PROBLEM WITH TRADITIONAL VALIDATORS:
 * - Once you become a validator, you can hold the position forever
 * - Underperforming validators can't be easily removed
 * - New, high-quality validators are locked out
 * - Centralization risk
 *
 * HARBERGER SOLUTION:
 * - Validator positions are NFTs with self-assessed value
 * - Current validators pay tax to maintain their position
 * - Anyone can buy a validator slot at the self-assessed price
 * - Forces validators to honestly value their position
 * - Ensures only committed, high-performers hold slots
 *
 * EXAMPLE:
 * Alice is a CRPC validator:
 * - Self-assesses her slot at 50,000 PSI
 * - Pays 2,500 PSI/year in tax (5%)
 * - Tax funds reward pool and treasury
 * - Bob thinks he's a better validator
 * - Bob pays 50,000 PSI to buy Alice's slot
 * - Alice gets 50,000 PSI, Bob becomes validator
 * - If Alice overvalued, she overpays tax
 * - If Alice undervalued, Bob buys her out
 * - Optimal: honest market valuation
 *
 * BENEFITS:
 * - Prevents validator monopolization
 * - Ensures active, committed validators
 * - Generates revenue for ecosystem
 * - Always-liquid validator market
 * - Meritocratic (best validators willing to pay most)
 * - Self-regulating (poor performance → low valuation → buyout)
 */
contract HarbergerValidator is HarbergerNFT {
    bytes32 public constant VALIDATOR_ADMIN_ROLE = keccak256("VALIDATOR_ADMIN_ROLE");

    IReputationRegistry public reputationRegistry;

    uint256 public constant MIN_REPUTATION_SCORE = 75; // Minimum reputation to become validator
    uint256 public constant MIN_VALIDATOR_VALUE = 10000 * 10**18; // Minimum 10k PSI assessment
    uint256 public maxValidators = 100; // Maximum number of validator slots

    // Validator performance tracking
    struct ValidatorPerformance {
        uint256 tasksValidated;
        uint256 correctValidations;
        uint256 disputesLost;
        uint256 averageResponseTime; // In seconds
        uint256 lastActiveTimestamp;
        uint256 joinedAt;
        bool active;
    }

    mapping(uint256 => ValidatorPerformance) public validatorPerformance;

    // Validator slot metadata
    struct ValidatorSlot {
        string validatorName;
        string validatorURI; // Profile metadata
        uint256 agentId; // Link to ERC-8004 agent identity
        uint256 mintedAt;
    }

    mapping(uint256 => ValidatorSlot) public validatorSlots;

    uint256 private _nextValidatorId;
    uint256 public activeValidatorCount;

    event ValidatorRegistered(
        uint256 indexed validatorId,
        address indexed validator,
        uint256 agentId,
        uint256 initialValue
    );
    event ValidatorBoughtOut(
        uint256 indexed validatorId,
        address indexed oldValidator,
        address indexed newValidator,
        uint256 price
    );
    event ValidationRecorded(uint256 indexed validatorId, bool correct, uint256 responseTime);
    event ValidatorSlashed(uint256 indexed validatorId, uint256 amount, string reason);
    event ValidatorPromoted(uint256 indexed validatorId, uint256 bonus);

    constructor(
        address _psiToken,
        address _rewardPool,
        address _treasury,
        address _reputationRegistry
    ) HarbergerNFT(
        "PsiNet CRPC Validator (Harberger)",
        "PSIVAL-H",
        _psiToken,
        _rewardPool,
        _treasury
    ) {
        reputationRegistry = IReputationRegistry(_reputationRegistry);
        _nextValidatorId = 1;
        _grantRole(VALIDATOR_ADMIN_ROLE, msg.sender);
    }

    /**
     * @dev Register as a validator
     * Requires:
     * - Minimum reputation score
     * - Initial self-assessment >= minimum
     * - Available slots
     */
    function registerValidator(
        string calldata validatorName,
        string calldata validatorURI,
        uint256 agentId,
        uint256 initialValue
    ) external returns (uint256 validatorId) {
        require(activeValidatorCount < maxValidators, "All validator slots filled");
        require(initialValue >= MIN_VALIDATOR_VALUE, "Minimum assessment not met");
        require(bytes(validatorName).length > 0, "Name required");

        // Check reputation (if agent ID provided)
        if (agentId > 0) {
            (uint256 reputationScore, ) = reputationRegistry.getReputationScore(agentId);
            require(
                reputationScore >= MIN_REPUTATION_SCORE,
                "Insufficient reputation"
            );
        }

        validatorId = _nextValidatorId++;

        // Mint validator NFT
        _mint(msg.sender, validatorId);

        // Register Harberger asset
        _registerAsset(validatorId, msg.sender, initialValue);

        // Initialize validator data
        validatorSlots[validatorId] = ValidatorSlot({
            validatorName: validatorName,
            validatorURI: validatorURI,
            agentId: agentId,
            mintedAt: block.timestamp
        });

        validatorPerformance[validatorId] = ValidatorPerformance({
            tasksValidated: 0,
            correctValidations: 0,
            disputesLost: 0,
            averageResponseTime: 0,
            lastActiveTimestamp: block.timestamp,
            joinedAt: block.timestamp,
            active: true
        });

        activeValidatorCount++;

        emit ValidatorRegistered(validatorId, msg.sender, agentId, initialValue);

        return validatorId;
    }

    /**
     * @dev Record validation activity (called by CRPC contract)
     */
    function recordValidation(
        uint256 validatorId,
        bool correct,
        uint256 responseTime
    ) external onlyRole(VALIDATOR_ADMIN_ROLE) {
        require(_exists(validatorId), "Validator does not exist");

        ValidatorPerformance storage perf = validatorPerformance[validatorId];

        perf.tasksValidated++;
        if (correct) {
            perf.correctValidations++;
        }

        // Update average response time
        if (perf.averageResponseTime == 0) {
            perf.averageResponseTime = responseTime;
        } else {
            perf.averageResponseTime =
                (perf.averageResponseTime + responseTime) / 2;
        }

        perf.lastActiveTimestamp = block.timestamp;

        emit ValidationRecorded(validatorId, correct, responseTime);
    }

    /**
     * @dev Record dispute loss (validator was wrong)
     */
    function recordDisputeLoss(uint256 validatorId)
        external
        onlyRole(VALIDATOR_ADMIN_ROLE)
    {
        require(_exists(validatorId), "Validator does not exist");

        validatorPerformance[validatorId].disputesLost++;

        emit ValidatorSlashed(validatorId, 0, "Dispute lost");
    }

    /**
     * @dev Calculate validator performance score (0-100)
     */
    function getPerformanceScore(uint256 validatorId)
        public
        view
        returns (uint256 score)
    {
        ValidatorPerformance storage perf = validatorPerformance[validatorId];

        if (perf.tasksValidated == 0) return 0;

        // Base score: accuracy
        uint256 accuracyScore = (perf.correctValidations * 100) / perf.tasksValidated;

        // Penalty for disputes lost
        uint256 disputePenalty = perf.disputesLost * 10;
        if (disputePenalty > accuracyScore) {
            return 0;
        }

        score = accuracyScore - disputePenalty;

        // Bonus for response time (if fast)
        if (perf.averageResponseTime < 1 hours && perf.averageResponseTime > 0) {
            score = score > 95 ? 100 : score + 5;
        }

        return score > 100 ? 100 : score;
    }

    /**
     * @dev Get validator efficiency rating
     * Used to adjust self-assessment recommendations
     */
    function getValidatorEfficiency(uint256 validatorId)
        public
        view
        returns (uint256 efficiency)
    {
        ValidatorPerformance storage perf = validatorPerformance[validatorId];

        if (perf.tasksValidated == 0) return 0;

        uint256 performanceScore = getPerformanceScore(validatorId);

        // Consider activity recency
        uint256 daysSinceActive = (block.timestamp - perf.lastActiveTimestamp) / 1 days;
        uint256 activityPenalty = daysSinceActive * 2; // -2% per day inactive

        if (activityPenalty > performanceScore) {
            return 0;
        }

        efficiency = performanceScore - activityPenalty;

        return efficiency > 100 ? 100 : efficiency;
    }

    /**
     * @dev Recommend self-assessment value based on performance
     * High performers should value their slot higher
     * Low performers should lower their assessment (or risk buyout)
     */
    function recommendedAssessment(uint256 validatorId)
        public
        view
        returns (uint256 recommended, string memory reason)
    {
        uint256 currentValue = assets[validatorId].selfAssessedValue;
        uint256 efficiency = getValidatorEfficiency(validatorId);

        if (efficiency >= 90) {
            // Excellent performer - can increase value
            recommended = (currentValue * 120) / 100; // +20%
            reason = "Excellent performance - consider raising assessment";
        } else if (efficiency >= 75) {
            // Good performer - maintain value
            recommended = currentValue;
            reason = "Good performance - maintain current assessment";
        } else if (efficiency >= 50) {
            // Mediocre - should lower value
            recommended = (currentValue * 80) / 100; // -20%
            reason = "Mediocre performance - consider lowering to avoid buyout";
        } else {
            // Poor - significant reduction needed
            recommended = (currentValue * 50) / 100; // -50%
            reason = "Poor performance - lower assessment or risk forced sale";
        }

        // Ensure minimum
        if (recommended < MIN_VALIDATOR_VALUE) {
            recommended = MIN_VALIDATOR_VALUE;
        }

        return (recommended, reason);
    }

    /**
     * @dev Override forced purchase to enforce reputation requirement
     */
    function forcedPurchase(uint256 validatorId) external override nonReentrant {
        // Check reputation of buyer
        if (validatorSlots[validatorId].agentId > 0) {
            (uint256 buyerReputation, ) = reputationRegistry.getReputationScore(
                uint256(uint160(msg.sender))
            );
            require(
                buyerReputation >= MIN_REPUTATION_SCORE,
                "Insufficient reputation to become validator"
            );
        }

        // Execute purchase
        super.forcedPurchase(validatorId);

        // Reset performance for new validator
        validatorPerformance[validatorId] = ValidatorPerformance({
            tasksValidated: 0,
            correctValidations: 0,
            disputesLost: 0,
            averageResponseTime: 0,
            lastActiveTimestamp: block.timestamp,
            joinedAt: block.timestamp,
            active: true
        });

        emit ValidatorBoughtOut(validatorId, ownerOf(validatorId), msg.sender, assets[validatorId].selfAssessedValue);
    }

    /**
     * @dev Get all active validators
     */
    function getActiveValidators()
        external
        view
        returns (uint256[] memory validatorIds)
    {
        uint256 count = 0;
        uint256[] memory temp = new uint256[](_nextValidatorId);

        for (uint256 i = 1; i < _nextValidatorId; i++) {
            if (_exists(i) && validatorPerformance[i].active) {
                temp[count] = i;
                count++;
            }
        }

        validatorIds = new uint256[](count);
        for (uint256 j = 0; j < count; j++) {
            validatorIds[j] = temp[j];
        }

        return validatorIds;
    }

    /**
     * @dev Find underperforming validators (candidates for buyout)
     */
    function findUnderperformingValidators(uint256 minEfficiency)
        external
        view
        returns (uint256[] memory underperformers)
    {
        uint256 count = 0;
        uint256[] memory temp = new uint256[](_nextValidatorId);

        for (uint256 i = 1; i < _nextValidatorId; i++) {
            if (_exists(i) && getValidatorEfficiency(i) < minEfficiency) {
                temp[count] = i;
                count++;
            }
        }

        underperformers = new uint256[](count);
        for (uint256 j = 0; j < count; j++) {
            underperformers[j] = temp[j];
        }

        return underperformers;
    }

    /**
     * @dev Get validator leaderboard (top performers)
     */
    function getLeaderboard(uint256 limit)
        external
        view
        returns (
            uint256[] memory validatorIds,
            uint256[] memory scores,
            address[] memory owners
        )
    {
        // Simple bubble sort for small sets (validators typically < 100)
        uint256 totalValidators = activeValidatorCount;
        if (limit > totalValidators) limit = totalValidators;

        validatorIds = new uint256[](limit);
        scores = new uint256[](limit);
        owners = new address[](limit);

        // Get all validators with scores
        uint256[] memory allIds = new uint256[](totalValidators);
        uint256[] memory allScores = new uint256[](totalValidators);
        uint256 idx = 0;

        for (uint256 i = 1; i < _nextValidatorId && idx < totalValidators; i++) {
            if (_exists(i) && validatorPerformance[i].active) {
                allIds[idx] = i;
                allScores[idx] = getPerformanceScore(i);
                idx++;
            }
        }

        // Sort (descending)
        for (uint256 i = 0; i < totalValidators; i++) {
            for (uint256 j = i + 1; j < totalValidators; j++) {
                if (allScores[j] > allScores[i]) {
                    // Swap
                    (allScores[i], allScores[j]) = (allScores[j], allScores[i]);
                    (allIds[i], allIds[j]) = (allIds[j], allIds[i]);
                }
            }
        }

        // Take top N
        for (uint256 k = 0; k < limit; k++) {
            validatorIds[k] = allIds[k];
            scores[k] = allScores[k];
            owners[k] = ownerOf(allIds[k]);
        }

        return (validatorIds, scores, owners);
    }

    /**
     * @dev Get complete validator information
     */
    function getValidatorFullInfo(uint256 validatorId)
        external
        view
        returns (
            string memory name,
            address owner,
            uint256 selfAssessedValue,
            uint256 taxOwed,
            uint256 performanceScore,
            uint256 efficiency,
            uint256 tasksValidated,
            bool active
        )
    {
        require(_exists(validatorId), "Validator does not exist");

        ValidatorSlot storage slot = validatorSlots[validatorId];
        ValidatorPerformance storage perf = validatorPerformance[validatorId];

        return (
            slot.validatorName,
            ownerOf(validatorId),
            assets[validatorId].selfAssessedValue,
            calculateTaxOwed(validatorId),
            getPerformanceScore(validatorId),
            getValidatorEfficiency(validatorId),
            perf.tasksValidated,
            perf.active
        );
    }

    /**
     * @dev Admin: Update max validators
     */
    function setMaxValidators(uint256 newMax) external onlyRole(ADMIN_ROLE) {
        require(newMax >= activeValidatorCount, "Cannot reduce below current count");
        maxValidators = newMax;
    }

    /**
     * @dev Check if token exists
     */
    function _exists(uint256 tokenId) internal view returns (bool) {
        try this.ownerOf(tokenId) returns (address) {
            return true;
        } catch {
            return false;
        }
    }

    /**
     * @dev Get validator statistics
     */
    function getValidatorStats()
        external
        view
        returns (
            uint256 totalValidators,
            uint256 activeCount,
            uint256 totalValidations,
            uint256 averagePerformance,
            uint256 totalTaxRevenue
        )
    {
        totalValidators = _nextValidatorId - 1;
        activeCount = activeValidatorCount;

        uint256 sumValidations = 0;
        uint256 sumPerformance = 0;
        uint256 validatorsWithPerf = 0;

        for (uint256 i = 1; i < _nextValidatorId; i++) {
            if (_exists(i)) {
                ValidatorPerformance storage perf = validatorPerformance[i];
                sumValidations += perf.tasksValidated;

                if (perf.tasksValidated > 0) {
                    sumPerformance += getPerformanceScore(i);
                    validatorsWithPerf++;
                }
            }
        }

        averagePerformance = validatorsWithPerf > 0
            ? sumPerformance / validatorsWithPerf
            : 0;

        totalValidations = sumValidations;
        totalTaxRevenue = totalTaxCollected;

        return (
            totalValidators,
            activeCount,
            totalValidations,
            averagePerformance,
            totalTaxRevenue
        );
    }
}
