// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IValidationRegistry
 * @dev Interface for ERC-8004 Validation Registry
 * @notice Supports task verification through crypto-economic staking or cryptographic proofs
 *
 * Validation Registry provides hooks for requesting and recording independent validator
 * checks using either:
 * 1. Crypto-economic staking (validators stake ETH/tokens on their validations)
 * 2. Cryptographic proofs (TEE attestations or zero-knowledge proofs)
 */
interface IValidationRegistry {
    /**
     * @dev Types of validation methods
     */
    enum ValidationType {
        STAKED,          // Crypto-economic validation with stake
        TEE_ATTESTATION, // Trusted Execution Environment proof
        ZK_PROOF,        // Zero-knowledge proof
        MULTI_SIG        // Multi-signature validation
    }

    /**
     * @dev Status of a validation request
     */
    enum ValidationStatus {
        PENDING,     // Awaiting validation
        VALIDATED,   // Successfully validated
        REJECTED,    // Validation rejected/failed
        DISPUTED,    // Under dispute
        EXPIRED      // Validation window expired
    }

    /**
     * @dev Structure for validation request
     */
    struct ValidationRequest {
        uint256 agentId;              // Agent requesting validation
        address requester;            // Address that initiated the request
        ValidationType validationType; // Type of validation required
        string taskHash;              // Hash/CID of the task to validate
        string taskMetadata;          // IPFS/Arweave URI with task details
        uint256 stake;                // Stake amount (for STAKED type)
        uint256 deadline;             // Validation deadline timestamp
        ValidationStatus status;      // Current status
        uint256 timestamp;            // When request was created
    }

    /**
     * @dev Structure for validation response
     */
    struct ValidationResponse {
        uint256 requestId;            // The request being validated
        address validator;            // Validator address
        bool approved;                // Whether validation passed
        string proof;                 // Cryptographic proof or attestation
        uint256 validatorStake;       // Stake put up by validator
        uint256 timestamp;            // When validation was submitted
        string metadata;              // Additional validation metadata
    }

    /**
     * @dev Emitted when a validation request is created
     */
    event ValidationRequested(
        uint256 indexed requestId,
        uint256 indexed agentId,
        address indexed requester,
        ValidationType validationType,
        string taskHash
    );

    /**
     * @dev Emitted when a validation is submitted
     */
    event ValidationSubmitted(
        uint256 indexed requestId,
        address indexed validator,
        bool approved,
        string proof
    );

    /**
     * @dev Emitted when a validation is finalized
     */
    event ValidationFinalized(
        uint256 indexed requestId,
        ValidationStatus finalStatus,
        uint256 totalStake
    );

    /**
     * @dev Emitted when a validation is disputed
     */
    event ValidationDisputed(
        uint256 indexed requestId,
        address indexed disputer,
        string reason
    );

    /**
     * @dev Request validation for a task
     * @param agentId The agent requesting validation
     * @param validationType The type of validation required
     * @param taskHash Hash/CID of the task to validate
     * @param taskMetadata IPFS/Arweave URI with task details
     * @param deadline Timestamp when validation expires
     * @return requestId The unique ID of the validation request
     *
     * Requirements:
     * - For STAKED validation, must send ETH as stake
     * - agentId must exist in IdentityRegistry
     * - deadline must be in the future
     */
    function requestValidation(
        uint256 agentId,
        ValidationType validationType,
        string calldata taskHash,
        string calldata taskMetadata,
        uint256 deadline
    ) external payable returns (uint256 requestId);

    /**
     * @dev Submit a staked validation response
     * @param requestId The validation request ID
     * @param approved Whether the validation passes
     * @param proof Evidence/proof for the validation
     * @param metadata Additional validation metadata
     *
     * Requirements:
     * - Request must be in PENDING status
     * - Must send ETH as validator stake
     * - Deadline must not have passed
     */
    function submitStakedValidation(
        uint256 requestId,
        bool approved,
        string calldata proof,
        string calldata metadata
    ) external payable;

    /**
     * @dev Submit a TEE attestation validation
     * @param requestId The validation request ID
     * @param approved Whether the validation passes
     * @param attestation The TEE attestation proof
     * @param metadata Additional validation metadata
     *
     * Requirements:
     * - Request must be in PENDING status
     * - Attestation must be valid TEE signature
     */
    function submitTEEValidation(
        uint256 requestId,
        bool approved,
        bytes calldata attestation,
        string calldata metadata
    ) external;

    /**
     * @dev Submit a zero-knowledge proof validation
     * @param requestId The validation request ID
     * @param approved Whether the validation passes
     * @param zkProof The zero-knowledge proof
     * @param metadata Additional validation metadata
     *
     * Requirements:
     * - Request must be in PENDING status
     * - ZK proof must be valid for the task
     */
    function submitZKProofValidation(
        uint256 requestId,
        bool approved,
        bytes calldata zkProof,
        string calldata metadata
    ) external;

    /**
     * @dev Finalize a validation after successful completion or expiry
     * @param requestId The validation request ID
     *
     * Requirements:
     * - Must have received validation response or deadline passed
     * - Can only be finalized once
     */
    function finalizeValidation(uint256 requestId) external;

    /**
     * @dev Dispute a validation
     * @param requestId The validation request ID
     * @param reason URI pointing to dispute evidence
     *
     * Requirements:
     * - Validation must be in VALIDATED status
     * - Caller must be requester or authorized disputer
     */
    function disputeValidation(uint256 requestId, string calldata reason) external;

    /**
     * @dev Resolve a disputed validation (restricted to authorized resolvers)
     * @param requestId The validation request ID
     * @param finalStatus The final status after resolution
     * @param slashRequester Whether to slash requester's stake
     * @param slashValidator Whether to slash validator's stake
     *
     * Requirements:
     * - Caller must be authorized dispute resolver
     * - Validation must be in DISPUTED status
     */
    function resolveValidationDispute(
        uint256 requestId,
        ValidationStatus finalStatus,
        bool slashRequester,
        bool slashValidator
    ) external;

    /**
     * @dev Get validation request details
     * @param requestId The request ID
     * @return The validation request struct
     */
    function getValidationRequest(uint256 requestId)
        external
        view
        returns (ValidationRequest memory);

    /**
     * @dev Get validation response details
     * @param requestId The request ID
     * @return The validation response struct (if exists)
     */
    function getValidationResponse(uint256 requestId)
        external
        view
        returns (ValidationResponse memory);

    /**
     * @dev Get all validation requests for an agent
     * @param agentId The agent ID
     * @return Array of validation request IDs
     */
    function getAgentValidations(uint256 agentId)
        external
        view
        returns (uint256[] memory);

    /**
     * @dev Get validation requests submitted by a validator
     * @param validator The validator address
     * @return Array of validation request IDs
     */
    function getValidatorSubmissions(address validator)
        external
        view
        returns (uint256[] memory);

    /**
     * @dev Get validation success rate for an agent
     * @param agentId The agent ID
     * @return successRate Percentage (0-10000 representing 0.00-100.00%)
     * @return totalValidations Total number of finalized validations
     */
    function getValidationSuccessRate(uint256 agentId)
        external
        view
        returns (uint256 successRate, uint256 totalValidations);

    /**
     * @dev Check if an address is an authorized TEE validator
     * @param validator The address to check
     * @return True if authorized, false otherwise
     */
    function isTEEValidator(address validator) external view returns (bool);

    /**
     * @dev Check if an address is an authorized dispute resolver
     * @param resolver The address to check
     * @return True if authorized, false otherwise
     */
    function isValidationDisputeResolver(address resolver) external view returns (bool);
}
