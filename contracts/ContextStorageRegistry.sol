// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./PsiToken.sol";
import "./erc8004/ReputationRegistry.sol";
import "./CRPCValidator.sol";

/**
 * @title ContextStorageRegistry
 * @notice Economic Density = Context Density
 *
 * Manages context storage with continuous rent based on data size.
 * Incentivizes agents to compress and optimize context without losing quality.
 *
 * Key Features:
 * - Continuous rent based on storage size
 * - Quality-validated compression via CRPC
 * - Efficiency rewards for optimization
 * - Network storage tracking and pricing
 * - Automated archival for unpaid contexts
 *
 * Economic Model:
 * Rent ∝ Size × Time × Network Pressure
 * Rewards ∝ Quality × Compression Ratio
 *
 * @author ΨNet Team
 */
contract ContextStorageRegistry is Ownable, ReentrancyGuard {

    // ═══════════════════════════════════════════════════════════════
    // STRUCTS
    // ═══════════════════════════════════════════════════════════════

    /**
     * @notice Represents a stored context node
     */
    struct ContextNode {
        bytes32 ipfsCID;           // IPFS content identifier
        uint256 sizeBytes;         // Storage size in bytes
        uint256 createdAt;         // Creation timestamp
        uint256 lastRentPayment;   // Last rent payment timestamp
        uint256 depositBalance;    // Prepaid rent balance (in PSI)
        address owner;             // Agent DID/address
        bool archived;             // True if archived (no rent)
        uint8 qualityScore;        // Last validated quality (0-100)
    }

    /**
     * @notice Proposed optimization of existing context
     */
    struct OptimizationProposal {
        bytes32 originalCID;       // Original context CID
        bytes32 optimizedCID;      // Optimized context CID
        uint256 originalSize;      // Original size in bytes
        uint256 optimizedSize;     // Optimized size in bytes
        uint256 crpcTaskId;        // CRPC validation task ID
        uint256 qualityScore;      // Quality score (0-10000 = 0-100%)
        uint256 proposedAt;        // Proposal timestamp
        bool validated;            // True if CRPC validated
        bool accepted;             // True if accepted
        address proposer;          // Proposing agent
    }

    /**
     * @notice Storage tier configuration
     */
    struct StorageTier {
        string name;               // Tier name (Hot/Warm/Cold)
        uint256 rentMultiplier;    // Rent multiplier (1e18 = 1x)
        uint256 minLatencyMs;      // Minimum retrieval latency
        bool active;               // Tier is active
    }

    // ═══════════════════════════════════════════════════════════════
    // STATE VARIABLES
    // ═══════════════════════════════════════════════════════════════

    /// @notice PSI token contract
    PsiToken public immutable psiToken;

    /// @notice Reputation registry contract
    ReputationRegistry public immutable reputationRegistry;

    /// @notice CRPC validator contract
    CRPCValidator public immutable crpcValidator;

    /// @notice Base rent rate per GB per day (in PSI wei)
    /// @dev Default: 0.001 PSI per GB per day = 1e15 wei
    uint256 public baseRatePerGBPerDay;

    /// @notice Minimum quality score for optimizations (0-10000)
    /// @dev 9500 = 95%
    uint256 public qualityThreshold;

    /// @notice Efficiency bonus pool (in PSI wei)
    uint256 public efficiencyBonusPool;

    /// @notice Total storage across all contexts (bytes)
    uint256 public totalStorageBytes;

    /// @notice Network storage capacity (GB)
    uint256 public storageCapacityGB;

    /// @notice Minimum deposit in days of rent
    uint256 public minDepositDays;

    /// @notice Grace period before archival (seconds)
    uint256 public gracePeriod;

    /// @notice Total rent collected (in PSI wei)
    uint256 public totalRentCollected;

    /// @notice Total efficiency rewards paid
    uint256 public totalEfficiencyRewards;

    // Mappings
    mapping(bytes32 => ContextNode) public contexts;
    mapping(bytes32 => OptimizationProposal) public optimizations;
    mapping(uint256 => StorageTier) public storageTiers;
    mapping(bytes32 => uint256) public contextToTier;

    // Counters
    uint256 public totalContexts;
    uint256 public activeContexts;
    uint256 public totalOptimizations;
    uint256 public acceptedOptimizations;

    // ═══════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════

    event ContextRegistered(
        bytes32 indexed cid,
        address indexed owner,
        uint256 sizeBytes,
        uint256 tier
    );

    event RentPaid(
        bytes32 indexed cid,
        uint256 amount,
        uint256 remainingDeposit
    );

    event DepositAdded(
        bytes32 indexed cid,
        uint256 amount,
        uint256 newBalance
    );

    event OptimizationProposed(
        bytes32 indexed originalCID,
        bytes32 indexed optimizedCID,
        uint256 originalSize,
        uint256 optimizedSize,
        uint256 crpcTaskId
    );

    event OptimizationValidated(
        bytes32 indexed originalCID,
        uint256 qualityScore,
        bool accepted
    );

    event OptimizationAccepted(
        bytes32 indexed cid,
        uint256 oldSize,
        uint256 newSize,
        uint256 efficiencyScore
    );

    event EfficiencyReward(
        address indexed agent,
        uint256 rebate,
        uint256 bonus,
        uint256 efficiencyScore
    );

    event ContextArchived(
        bytes32 indexed cid,
        uint256 refund,
        bool forced
    );

    event StorageTierCreated(
        uint256 indexed tierId,
        string name,
        uint256 rentMultiplier
    );

    event ParametersUpdated(
        uint256 baseRate,
        uint256 qualityThreshold,
        uint256 capacityGB
    );

    // ═══════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════

    constructor(
        address _psiToken,
        address _reputationRegistry,
        address _crpcValidator
    ) Ownable(msg.sender) {
        psiToken = PsiToken(_psiToken);
        reputationRegistry = ReputationRegistry(_reputationRegistry);
        crpcValidator = CRPCValidator(_crpcValidator);

        // Set default parameters
        baseRatePerGBPerDay = 1e15;        // 0.001 PSI per GB per day
        qualityThreshold = 9500;           // 95%
        storageCapacityGB = 1_000_000;     // 1 PB
        minDepositDays = 30;               // 30 days minimum
        gracePeriod = 7 days;              // 7 day grace period

        // Create default storage tiers
        _createStorageTier(0, "Hot", 1e18);      // 1x rent, IPFS
        _createStorageTier(1, "Warm", 1e17);     // 0.1x rent, Filecoin
        _createStorageTier(2, "Cold", 1e16);     // 0.01x rent, Arweave
    }

    // ═══════════════════════════════════════════════════════════════
    // CORE FUNCTIONS
    // ═══════════════════════════════════════════════════════════════

    /**
     * @notice Register a new context node
     * @param ipfsCID IPFS content identifier
     * @param sizeBytes Storage size in bytes
     * @param initialDeposit Initial rent deposit (in PSI wei)
     * @param tierId Storage tier (0=Hot, 1=Warm, 2=Cold)
     */
    function registerContext(
        bytes32 ipfsCID,
        uint256 sizeBytes,
        uint256 initialDeposit,
        uint256 tierId
    ) external nonReentrant {
        require(contexts[ipfsCID].createdAt == 0, "Context already exists");
        require(sizeBytes > 0, "Invalid size");
        require(storageTiers[tierId].active, "Invalid tier");

        // Calculate minimum required deposit
        uint256 minDeposit = calculateRent(sizeBytes, minDepositDays * 1 days, tierId);
        require(initialDeposit >= minDeposit, "Insufficient deposit");

        // Transfer deposit from agent
        require(
            psiToken.transferFrom(msg.sender, address(this), initialDeposit),
            "Transfer failed"
        );

        // Create context node
        contexts[ipfsCID] = ContextNode({
            ipfsCID: ipfsCID,
            sizeBytes: sizeBytes,
            createdAt: block.timestamp,
            lastRentPayment: block.timestamp,
            depositBalance: initialDeposit,
            owner: msg.sender,
            archived: false,
            qualityScore: 100  // Assume 100% quality initially
        });

        contextToTier[ipfsCID] = tierId;
        totalStorageBytes += sizeBytes;
        totalContexts++;
        activeContexts++;

        emit ContextRegistered(ipfsCID, msg.sender, sizeBytes, tierId);
    }

    /**
     * @notice Calculate rent for given size, duration, and tier
     * @param sizeBytes Size in bytes
     * @param duration Duration in seconds
     * @param tierId Storage tier
     * @return Rent amount in PSI wei
     */
    function calculateRent(
        uint256 sizeBytes,
        uint256 duration,
        uint256 tierId
    ) public view returns (uint256) {
        if (sizeBytes == 0) return 0;

        // Convert bytes to GB (1 GB = 1e9 bytes)
        uint256 sizeGB = (sizeBytes * 1e18) / 1e9;

        // Calculate network multiplier based on capacity usage
        // Multiplier = 1 + (totalStorage / capacity)
        uint256 networkMultiplier = 1e18 + (
            (totalStorageBytes * 1e18) / (storageCapacityGB * 1e9)
        );

        // Get tier multiplier
        uint256 tierMultiplier = storageTiers[tierId].rentMultiplier;

        // Calculate daily rent
        // Daily Rent = (Size GB * Base Rate * Network Multiplier * Tier Multiplier) / 1e36
        uint256 dailyRent = (
            sizeGB *
            baseRatePerGBPerDay *
            networkMultiplier *
            tierMultiplier
        ) / 1e36;

        // Calculate total rent for duration
        return (dailyRent * duration) / 1 days;
    }

    /**
     * @notice Charge rent for a context (callable by anyone)
     * @param cid Context CID
     */
    function chargeRent(bytes32 cid) public nonReentrant {
        ContextNode storage context = contexts[cid];
        require(context.createdAt > 0, "Context not found");
        require(!context.archived, "Context archived");

        uint256 elapsed = block.timestamp - context.lastRentPayment;
        if (elapsed == 0) return; // No time elapsed

        uint256 tierId = contextToTier[cid];
        uint256 rentDue = calculateRent(context.sizeBytes, elapsed, tierId);

        if (rentDue > context.depositBalance) {
            // Check if still in grace period
            if (context.depositBalance == 0 && elapsed > gracePeriod) {
                // Auto-archive
                _archiveContext(cid, true);
                return;
            }
            // Charge remaining balance
            rentDue = context.depositBalance;
        }

        context.depositBalance -= rentDue;
        context.lastRentPayment = block.timestamp;
        totalRentCollected += rentDue;

        // Split rent: 50% burn, 50% to efficiency bonus pool
        uint256 burnAmount = rentDue / 2;
        uint256 poolAmount = rentDue - burnAmount;

        psiToken.burn(burnAmount);
        efficiencyBonusPool += poolAmount;

        emit RentPaid(cid, rentDue, context.depositBalance);
    }

    /**
     * @notice Add more deposit to prevent archival
     * @param cid Context CID
     * @param amount Amount to add (in PSI wei)
     */
    function topUpDeposit(bytes32 cid, uint256 amount) external nonReentrant {
        ContextNode storage context = contexts[cid];
        require(context.owner == msg.sender, "Not owner");
        require(!context.archived, "Context archived");
        require(amount > 0, "Invalid amount");

        // First charge any pending rent
        chargeRent(cid);

        // Transfer new deposit
        require(
            psiToken.transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );

        context.depositBalance += amount;

        emit DepositAdded(cid, amount, context.depositBalance);
    }

    /**
     * @notice Propose an optimized version of context
     * @param originalCID Original context CID
     * @param optimizedCID Optimized context CID
     * @param optimizedSize Optimized size in bytes
     * @return proposalId Unique proposal identifier
     */
    function proposeOptimization(
        bytes32 originalCID,
        bytes32 optimizedCID,
        uint256 optimizedSize
    ) external nonReentrant returns (bytes32 proposalId) {
        ContextNode storage original = contexts[originalCID];
        require(original.owner == msg.sender, "Not owner");
        require(!original.archived, "Context archived");
        require(optimizedSize < original.sizeBytes, "Not an optimization");
        require(optimizedSize > 0, "Invalid size");

        // Create unique proposal ID
        proposalId = keccak256(abi.encodePacked(
            originalCID,
            optimizedCID,
            block.timestamp,
            msg.sender
        ));

        require(optimizations[proposalId].proposedAt == 0, "Proposal exists");

        // Create CRPC task for quality validation
        // Validators will compare original vs optimized context
        uint256 taskId = crpcValidator.createTask(
            abi.encode(originalCID, optimizedCID),
            3,  // 3 validators required
            1 days,  // 1 day deadline
            abi.encode("context_optimization", proposalId)
        );

        // Store optimization proposal
        optimizations[proposalId] = OptimizationProposal({
            originalCID: originalCID,
            optimizedCID: optimizedCID,
            originalSize: original.sizeBytes,
            optimizedSize: optimizedSize,
            crpcTaskId: taskId,
            qualityScore: 0,
            proposedAt: block.timestamp,
            validated: false,
            accepted: false,
            proposer: msg.sender
        });

        totalOptimizations++;

        emit OptimizationProposed(
            originalCID,
            optimizedCID,
            original.sizeBytes,
            optimizedSize,
            taskId
        );
    }

    /**
     * @notice Finalize optimization after CRPC validation
     * @param proposalId Proposal identifier
     * @param qualityScore Quality score from CRPC (0-10000)
     */
    function finalizeOptimization(
        bytes32 proposalId,
        uint256 qualityScore
    ) external nonReentrant {
        // Only CRPC validator can call this
        require(msg.sender == address(crpcValidator), "Only validator");

        OptimizationProposal storage proposal = optimizations[proposalId];
        require(proposal.proposedAt > 0, "Proposal not found");
        require(!proposal.validated, "Already validated");
        require(qualityScore <= 10000, "Invalid quality score");

        proposal.qualityScore = qualityScore;
        proposal.validated = true;

        emit OptimizationValidated(proposal.originalCID, qualityScore, qualityScore >= qualityThreshold);

        // If quality meets threshold, accept optimization
        if (qualityScore >= qualityThreshold) {
            _acceptOptimization(proposalId);
        }
    }

    /**
     * @notice Internal: Accept optimization and distribute rewards
     */
    function _acceptOptimization(bytes32 proposalId) internal {
        OptimizationProposal storage proposal = optimizations[proposalId];
        ContextNode storage context = contexts[proposal.originalCID];

        proposal.accepted = true;
        acceptedOptimizations++;

        uint256 oldSize = context.sizeBytes;
        uint256 tierId = contextToTier[proposal.originalCID];

        // Update context to optimized version
        context.ipfsCID = proposal.optimizedCID;
        context.sizeBytes = proposal.optimizedSize;
        context.qualityScore = uint8(proposal.qualityScore / 100);

        // Update total storage
        totalStorageBytes = totalStorageBytes - oldSize + proposal.optimizedSize;

        // Calculate efficiency score
        // Efficiency = (Quality / 100) * (Original Size / New Size)
        uint256 efficiencyScore = (
            proposal.qualityScore * proposal.originalSize
        ) / (proposal.optimizedSize * 100);

        // If efficiency > 100%, reward the agent
        if (efficiencyScore > 100) {
            uint256 rebate = 0;
            uint256 bonus = 0;

            // Calculate rebate (refund of accumulated rent)
            uint256 elapsed = block.timestamp - context.lastRentPayment;
            uint256 accumulatedRent = calculateRent(oldSize, elapsed, tierId);
            uint256 rebatePercent = 10000 - (10000 * 100 / efficiencyScore);
            rebate = (accumulatedRent * rebatePercent) / 10000;

            // Calculate bonus from efficiency pool
            // Bonus = efficiency score * 1 PSI (capped by pool)
            bonus = efficiencyScore * 1e18 / 100;
            if (bonus > efficiencyBonusPool) {
                bonus = efficiencyBonusPool;
            }

            // Distribute rewards
            if (rebate > 0) {
                context.depositBalance += rebate;
            }

            if (bonus > 0) {
                efficiencyBonusPool -= bonus;
                require(psiToken.transfer(context.owner, bonus), "Bonus transfer failed");
            }

            totalEfficiencyRewards += rebate + bonus;

            // Boost reputation
            int8 reputationBoost = int8(uint8(efficiencyScore / 10));
            if (reputationBoost > 100) reputationBoost = 100;

            reputationRegistry.recordFeedback(
                bytes32(uint256(uint160(context.owner))),
                bytes32(uint256(uint160(address(this)))),
                reputationBoost,
                "Context optimization efficiency"
            );

            emit EfficiencyReward(context.owner, rebate, bonus, efficiencyScore);
        }

        emit OptimizationAccepted(
            proposal.originalCID,
            oldSize,
            proposal.optimizedSize,
            efficiencyScore
        );
    }

    /**
     * @notice Archive a context (stops rent, refunds deposit)
     * @param cid Context CID
     */
    function archiveContext(bytes32 cid) external nonReentrant {
        ContextNode storage context = contexts[cid];
        require(context.owner == msg.sender, "Not owner");
        require(!context.archived, "Already archived");

        _archiveContext(cid, false);
    }

    /**
     * @notice Internal: Archive context
     * @param forced True if forced archival (no rent paid)
     */
    function _archiveContext(bytes32 cid, bool forced) internal {
        ContextNode storage context = contexts[cid];

        uint256 refund = context.depositBalance;
        context.depositBalance = 0;
        context.archived = true;
        totalStorageBytes -= context.sizeBytes;
        activeContexts--;

        if (refund > 0 && !forced) {
            require(psiToken.transfer(context.owner, refund), "Refund failed");
        } else if (forced && refund > 0) {
            // For forced archival, add remaining deposit to bonus pool
            efficiencyBonusPool += refund;
        }

        emit ContextArchived(cid, refund, forced);
    }

    // ═══════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════

    /**
     * @notice Get remaining days of rent coverage
     * @param cid Context CID
     * @return days Remaining days
     */
    function getRemainingDays(bytes32 cid) external view returns (uint256 days) {
        ContextNode storage context = contexts[cid];
        if (context.archived || context.sizeBytes == 0) return 0;

        uint256 tierId = contextToTier[cid];
        uint256 dailyRent = calculateRent(context.sizeBytes, 1 days, tierId);

        if (dailyRent == 0) return type(uint256).max;

        return context.depositBalance / dailyRent;
    }

    /**
     * @notice Get network storage utilization (0-10000 = 0-100%)
     */
    function getStorageUtilization() external view returns (uint256) {
        uint256 capacityBytes = storageCapacityGB * 1e9;
        return (totalStorageBytes * 10000) / capacityBytes;
    }

    /**
     * @notice Get current network multiplier
     */
    function getNetworkMultiplier() external view returns (uint256) {
        return 1e18 + ((totalStorageBytes * 1e18) / (storageCapacityGB * 1e9));
    }

    /**
     * @notice Get context details
     */
    function getContext(bytes32 cid) external view returns (
        bytes32 ipfsCID,
        uint256 sizeBytes,
        uint256 createdAt,
        uint256 depositBalance,
        address owner,
        bool archived,
        uint8 qualityScore,
        uint256 tierId
    ) {
        ContextNode storage context = contexts[cid];
        return (
            context.ipfsCID,
            context.sizeBytes,
            context.createdAt,
            context.depositBalance,
            context.owner,
            context.archived,
            context.qualityScore,
            contextToTier[cid]
        );
    }

    /**
     * @notice Get optimization proposal details
     */
    function getOptimization(bytes32 proposalId) external view returns (
        bytes32 originalCID,
        bytes32 optimizedCID,
        uint256 originalSize,
        uint256 optimizedSize,
        uint256 qualityScore,
        bool validated,
        bool accepted
    ) {
        OptimizationProposal storage proposal = optimizations[proposalId];
        return (
            proposal.originalCID,
            proposal.optimizedCID,
            proposal.originalSize,
            proposal.optimizedSize,
            proposal.qualityScore,
            proposal.validated,
            proposal.accepted
        );
    }

    // ═══════════════════════════════════════════════════════════════
    // ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════════

    /**
     * @notice Update network parameters (governance)
     */
    function updateParameters(
        uint256 newBaseRate,
        uint256 newQualityThreshold,
        uint256 newCapacityGB
    ) external onlyOwner {
        require(newQualityThreshold <= 10000, "Invalid threshold");

        baseRatePerGBPerDay = newBaseRate;
        qualityThreshold = newQualityThreshold;
        storageCapacityGB = newCapacityGB;

        emit ParametersUpdated(newBaseRate, newQualityThreshold, newCapacityGB);
    }

    /**
     * @notice Create new storage tier
     */
    function _createStorageTier(
        uint256 tierId,
        string memory name,
        uint256 rentMultiplier
    ) internal {
        storageTiers[tierId] = StorageTier({
            name: name,
            rentMultiplier: rentMultiplier,
            minLatencyMs: 0,
            active: true
        });

        emit StorageTierCreated(tierId, name, rentMultiplier);
    }

    /**
     * @notice Add to efficiency bonus pool
     */
    function addToBonusPool(uint256 amount) external {
        require(
            psiToken.transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );
        efficiencyBonusPool += amount;
    }
}
