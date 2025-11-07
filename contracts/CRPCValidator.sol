// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title CRPCValidator
 * @dev Commit-Reveal Pairwise Comparison Protocol for ΨNet
 *
 * Based on Tim Cotten's CRPC protocol (https://blog.cotten.io)
 *
 * CRPC enables decentralized, trustless verification of non-deterministic
 * and fuzzy computations (like AI outputs) without requiring Zero-Knowledge Proofs.
 *
 * HOW IT WORKS:
 *
 * Round 1 - Work Commitment (prevents copying):
 *   1. Agents submit hash commitments: keccak256(workResult, secret)
 *   2. After deadline, agents reveal: workResult + secret
 *   3. Smart contract verifies: hash(revealed) == commitment
 *
 * Round 2 - Comparison Commitment (prevents lying):
 *   1. Agents perform pairwise comparisons of all work
 *   2. Submit hash commitments: keccak256(rankings, secret)
 *   3. After deadline, reveal rankings + secret
 *   4. Smart contract aggregates: which work is highest quality?
 *
 * BENEFITS FOR ΨNET:
 * - Verify AI outputs without knowing "right answer"
 * - Handle non-deterministic/creative AI work
 * - Trustless without expensive ZK proofs
 * - Reduces information asymmetry (transparent verification)
 * - Aligns with positive-sum economics (rewards quality work)
 */
contract CRPCValidator is AccessControl, ReentrancyGuard {
    bytes32 public constant VALIDATOR_ROLE = keccak256("VALIDATOR_ROLE");

    enum TaskPhase {
        ACCEPTING_WORK,      // Round 1a: Accepting work commitments
        REVEALING_WORK,      // Round 1b: Revealing work
        ACCEPTING_COMPARISONS, // Round 2a: Accepting comparison commitments
        REVEALING_COMPARISONS, // Round 2b: Revealing comparisons
        FINALIZED            // Task complete
    }

    struct Task {
        uint256 taskId;
        string taskDescription;    // IPFS/Arweave URI
        address requester;
        uint256 rewardPool;
        uint256 workDeadline;      // Round 1a deadline
        uint256 revealDeadline;    // Round 1b deadline
        uint256 comparisonDeadline; // Round 2a deadline
        uint256 finalDeadline;     // Round 2b deadline
        TaskPhase phase;
        uint256 submissionCount;
        bool finalized;
    }

    struct WorkSubmission {
        address agent;
        bytes32 workCommitment;    // keccak256(workResult, secret)
        string workResult;         // IPFS/Arweave URI (revealed in round 1b)
        bool revealed;
        uint256 score;            // Aggregated pairwise comparison score
        uint256 rank;             // Final ranking
    }

    struct ComparisonSubmission {
        address validator;
        bytes32 comparisonCommitment; // keccak256(rankings[], secret)
        uint256[] rankings;           // Pairwise comparison results
        bool revealed;
    }

    // Task tracking
    uint256 private _nextTaskId;
    mapping(uint256 => Task) public tasks;

    // Work submissions: taskId => submissionId => WorkSubmission
    mapping(uint256 => mapping(uint256 => WorkSubmission)) public workSubmissions;
    mapping(uint256 => uint256) public taskSubmissionCount;

    // Comparison submissions: taskId => validator => ComparisonSubmission
    mapping(uint256 => mapping(address => ComparisonSubmission)) public comparisons;
    mapping(uint256 => address[]) public taskValidators;

    // Transparency tracking
    mapping(uint256 => uint256) public taskRewardsDistributed;
    uint256 public totalTasksCreated;
    uint256 public totalTasksFinalized;

    // Events
    event TaskCreated(uint256 indexed taskId, address indexed requester, uint256 rewardPool);
    event WorkCommitted(uint256 indexed taskId, uint256 submissionId, address indexed agent);
    event WorkRevealed(uint256 indexed taskId, uint256 submissionId, string workResult);
    event ComparisonCommitted(uint256 indexed taskId, address indexed validator);
    event ComparisonRevealed(uint256 indexed taskId, address indexed validator);
    event TaskFinalized(uint256 indexed taskId, uint256 winnerSubmissionId, uint256 reward);
    event PhaseAdvanced(uint256 indexed taskId, TaskPhase newPhase);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(VALIDATOR_ROLE, msg.sender);
        _nextTaskId = 1;
    }

    /**
     * @dev Create a new task for CRPC validation
     * @param taskDescription IPFS/Arweave URI describing the task
     * @param workDuration How long agents have to submit work (seconds)
     * @param revealDuration How long for work reveal (seconds)
     * @param comparisonDuration How long for comparisons (seconds)
     */
    function createTask(
        string calldata taskDescription,
        uint256 workDuration,
        uint256 revealDuration,
        uint256 comparisonDuration
    ) external payable returns (uint256) {
        require(msg.value > 0, "CRPC: must provide reward pool");
        require(workDuration > 0, "CRPC: invalid work duration");

        uint256 taskId = _nextTaskId++;
        uint256 now_ = block.timestamp;

        tasks[taskId] = Task({
            taskId: taskId,
            taskDescription: taskDescription,
            requester: msg.sender,
            rewardPool: msg.value,
            workDeadline: now_ + workDuration,
            revealDeadline: now_ + workDuration + revealDuration,
            comparisonDeadline: now_ + workDuration + revealDuration + comparisonDuration,
            finalDeadline: now_ + workDuration + revealDuration + comparisonDuration + revealDuration,
            phase: TaskPhase.ACCEPTING_WORK,
            submissionCount: 0,
            finalized: false
        });

        totalTasksCreated++;

        emit TaskCreated(taskId, msg.sender, msg.value);
        return taskId;
    }

    /**
     * @dev ROUND 1A: Submit work commitment
     * Agent commits to their work without revealing it
     */
    function submitWorkCommitment(uint256 taskId, bytes32 workCommitment)
        external
    {
        Task storage task = tasks[taskId];
        require(task.phase == TaskPhase.ACCEPTING_WORK, "CRPC: not accepting work");
        require(block.timestamp <= task.workDeadline, "CRPC: work deadline passed");
        require(workCommitment != bytes32(0), "CRPC: invalid commitment");

        uint256 submissionId = taskSubmissionCount[taskId]++;

        workSubmissions[taskId][submissionId] = WorkSubmission({
            agent: msg.sender,
            workCommitment: workCommitment,
            workResult: "",
            revealed: false,
            score: 0,
            rank: 0
        });

        task.submissionCount++;

        emit WorkCommitted(taskId, submissionId, msg.sender);
    }

    /**
     * @dev ROUND 1B: Reveal work
     * Agent reveals their actual work + secret to prove commitment
     */
    function revealWork(
        uint256 taskId,
        uint256 submissionId,
        string calldata workResult,
        bytes32 secret
    ) external {
        Task storage task = tasks[taskId];

        // Auto-advance phase if needed
        if (task.phase == TaskPhase.ACCEPTING_WORK && block.timestamp > task.workDeadline) {
            task.phase = TaskPhase.REVEALING_WORK;
            emit PhaseAdvanced(taskId, TaskPhase.REVEALING_WORK);
        }

        require(task.phase == TaskPhase.REVEALING_WORK, "CRPC: not revealing work");
        require(block.timestamp <= task.revealDeadline, "CRPC: reveal deadline passed");

        WorkSubmission storage submission = workSubmissions[taskId][submissionId];
        require(submission.agent == msg.sender, "CRPC: not your submission");
        require(!submission.revealed, "CRPC: already revealed");

        // Verify commitment
        bytes32 computedHash = keccak256(abi.encodePacked(workResult, secret));
        require(computedHash == submission.workCommitment, "CRPC: invalid reveal");

        submission.workResult = workResult;
        submission.revealed = true;

        emit WorkRevealed(taskId, submissionId, workResult);
    }

    /**
     * @dev ROUND 2A: Submit pairwise comparison commitment
     * Validators commit to their rankings without revealing them
     */
    function submitComparisonCommitment(uint256 taskId, bytes32 comparisonCommitment)
        external
        onlyRole(VALIDATOR_ROLE)
    {
        Task storage task = tasks[taskId];

        // Auto-advance phase if needed
        if (task.phase == TaskPhase.REVEALING_WORK && block.timestamp > task.revealDeadline) {
            task.phase = TaskPhase.ACCEPTING_COMPARISONS;
            emit PhaseAdvanced(taskId, TaskPhase.ACCEPTING_COMPARISONS);
        }

        require(task.phase == TaskPhase.ACCEPTING_COMPARISONS, "CRPC: not accepting comparisons");
        require(block.timestamp <= task.comparisonDeadline, "CRPC: comparison deadline passed");
        require(comparisonCommitment != bytes32(0), "CRPC: invalid commitment");

        comparisons[taskId][msg.sender] = ComparisonSubmission({
            validator: msg.sender,
            comparisonCommitment: comparisonCommitment,
            rankings: new uint256[](0),
            revealed: false
        });

        taskValidators[taskId].push(msg.sender);

        emit ComparisonCommitted(taskId, msg.sender);
    }

    /**
     * @dev ROUND 2B: Reveal pairwise comparisons
     * Validators reveal their rankings + secret to prove commitment
     *
     * Rankings format: Array where rankings[i] = score for submission i
     * Higher score = better quality work
     */
    function revealComparison(
        uint256 taskId,
        uint256[] calldata rankings,
        bytes32 secret
    ) external onlyRole(VALIDATOR_ROLE) {
        Task storage task = tasks[taskId];

        // Auto-advance phase if needed
        if (task.phase == TaskPhase.ACCEPTING_COMPARISONS && block.timestamp > task.comparisonDeadline) {
            task.phase = TaskPhase.REVEALING_COMPARISONS;
            emit PhaseAdvanced(taskId, TaskPhase.REVEALING_COMPARISONS);
        }

        require(task.phase == TaskPhase.REVEALING_COMPARISONS, "CRPC: not revealing comparisons");
        require(block.timestamp <= task.finalDeadline, "CRPC: final deadline passed");

        ComparisonSubmission storage comparison = comparisons[taskId][msg.sender];
        require(comparison.validator == msg.sender, "CRPC: not your comparison");
        require(!comparison.revealed, "CRPC: already revealed");

        // Verify commitment
        bytes32 computedHash = keccak256(abi.encodePacked(rankings, secret));
        require(computedHash == comparison.comparisonCommitment, "CRPC: invalid reveal");

        // Verify rankings array matches submission count
        require(rankings.length == task.submissionCount, "CRPC: invalid rankings length");

        comparison.rankings = rankings;
        comparison.revealed = true;

        // Aggregate scores across all validators
        for (uint256 i = 0; i < rankings.length; i++) {
            workSubmissions[taskId][i].score += rankings[i];
        }

        emit ComparisonRevealed(taskId, msg.sender);
    }

    /**
     * @dev Finalize task and distribute rewards
     * Finds highest-scored submission and rewards the agent
     */
    function finalizeTask(uint256 taskId) external nonReentrant {
        Task storage task = tasks[taskId];

        require(!task.finalized, "CRPC: already finalized");
        require(
            block.timestamp > task.finalDeadline ||
            task.phase == TaskPhase.REVEALING_COMPARISONS,
            "CRPC: too early to finalize"
        );

        // Find winner (highest aggregated score)
        uint256 winnerSubmissionId = 0;
        uint256 highestScore = 0;

        for (uint256 i = 0; i < task.submissionCount; i++) {
            WorkSubmission storage submission = workSubmissions[taskId][i];

            if (submission.revealed && submission.score > highestScore) {
                highestScore = submission.score;
                winnerSubmissionId = i;
            }
        }

        require(highestScore > 0, "CRPC: no valid submissions");

        // Assign ranks based on scores
        for (uint256 i = 0; i < task.submissionCount; i++) {
            uint256 rank = 1;
            for (uint256 j = 0; j < task.submissionCount; j++) {
                if (workSubmissions[taskId][j].score > workSubmissions[taskId][i].score) {
                    rank++;
                }
            }
            workSubmissions[taskId][i].rank = rank;
        }

        // Distribute rewards (winner gets 70%, validators get 30%)
        WorkSubmission storage winner = workSubmissions[taskId][winnerSubmissionId];
        uint256 winnerReward = (task.rewardPool * 70) / 100;
        uint256 validatorReward = task.rewardPool - winnerReward;

        // Pay winner
        (bool success1, ) = winner.agent.call{value: winnerReward}("");
        require(success1, "CRPC: winner payment failed");

        // Pay validators who revealed
        address[] memory validators = taskValidators[taskId];
        uint256 revealedCount = 0;

        for (uint256 i = 0; i < validators.length; i++) {
            if (comparisons[taskId][validators[i]].revealed) {
                revealedCount++;
            }
        }

        if (revealedCount > 0) {
            uint256 perValidatorReward = validatorReward / revealedCount;

            for (uint256 i = 0; i < validators.length; i++) {
                if (comparisons[taskId][validators[i]].revealed) {
                    (bool success2, ) = validators[i].call{value: perValidatorReward}("");
                    require(success2, "CRPC: validator payment failed");
                }
            }
        }

        task.finalized = true;
        task.phase = TaskPhase.FINALIZED;
        totalTasksFinalized++;
        taskRewardsDistributed[taskId] = task.rewardPool;

        emit TaskFinalized(taskId, winnerSubmissionId, winnerReward);
        emit PhaseAdvanced(taskId, TaskPhase.FINALIZED);
    }

    /**
     * @dev Get task details
     */
    function getTask(uint256 taskId) external view returns (Task memory) {
        return tasks[taskId];
    }

    /**
     * @dev Get all submissions for a task
     */
    function getTaskSubmissions(uint256 taskId)
        external
        view
        returns (WorkSubmission[] memory)
    {
        uint256 count = taskSubmissionCount[taskId];
        WorkSubmission[] memory submissions = new WorkSubmission[](count);

        for (uint256 i = 0; i < count; i++) {
            submissions[i] = workSubmissions[taskId][i];
        }

        return submissions;
    }

    /**
     * @dev Get comparison for a specific validator
     */
    function getComparison(uint256 taskId, address validator)
        external
        view
        returns (ComparisonSubmission memory)
    {
        return comparisons[taskId][validator];
    }

    /**
     * @dev Get global CRPC statistics (transparency)
     */
    function getCRPCStats()
        external
        view
        returns (
            uint256 _totalTasksCreated,
            uint256 _totalTasksFinalized,
            uint256 totalRewardsDistributed
        )
    {
        _totalTasksCreated = totalTasksCreated;
        _totalTasksFinalized = totalTasksFinalized;

        for (uint256 i = 1; i < _nextTaskId; i++) {
            totalRewardsDistributed += taskRewardsDistributed[i];
        }
    }

    /**
     * @dev Helper: Generate work commitment
     * Call off-chain, then submit the hash
     */
    function generateWorkCommitment(string calldata workResult, bytes32 secret)
        external
        pure
        returns (bytes32)
    {
        return keccak256(abi.encodePacked(workResult, secret));
    }

    /**
     * @dev Helper: Generate comparison commitment
     * Call off-chain, then submit the hash
     */
    function generateComparisonCommitment(uint256[] calldata rankings, bytes32 secret)
        external
        pure
        returns (bytes32)
    {
        return keccak256(abi.encodePacked(rankings, secret));
    }
}
