// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./IValidationRegistry.sol";
import "./IIdentityRegistry.sol";

/**
 * @title ValidationRegistry
 * @dev ERC-8004 compliant Validation Registry implementation for ΨNet
 * @notice Manages task validation through multiple proof methods
 *
 * This contract supports:
 * - Crypto-economic staking validations
 * - TEE (Trusted Execution Environment) attestations
 * - Zero-knowledge proofs
 * - Multi-signature validations
 */
contract ValidationRegistry is
    IValidationRegistry,
    AccessControl,
    ReentrancyGuard
{
    bytes32 public constant TEE_VALIDATOR_ROLE = keccak256("TEE_VALIDATOR_ROLE");
    bytes32 public constant DISPUTE_RESOLVER_ROLE = keccak256("DISPUTE_RESOLVER_ROLE");
    bytes32 public constant ZK_VERIFIER_ROLE = keccak256("ZK_VERIFIER_ROLE");

    IIdentityRegistry public immutable identityRegistry;

    // Minimum stake required for validation requests
    uint256 public minimumRequestStake;

    // Minimum stake required for validators
    uint256 public minimumValidatorStake;

    // Counter for request IDs
    uint256 private _nextRequestId;

    // Mapping from request ID to ValidationRequest
    mapping(uint256 => ValidationRequest) private _requests;

    // Mapping from request ID to ValidationResponse
    mapping(uint256 => ValidationResponse) private _responses;

    // Mapping from agent ID to array of validation request IDs
    mapping(uint256 => uint256[]) private _agentValidations;

    // Mapping from validator address to array of request IDs they validated
    mapping(address => uint256[]) private _validatorSubmissions;

    // Mapping from agent ID to validation statistics
    mapping(uint256 => uint256) private _agentSuccessCount;
    mapping(uint256 => uint256) private _agentTotalValidations;

    constructor(
        address _identityRegistry,
        uint256 _minimumRequestStake,
        uint256 _minimumValidatorStake
    ) {
        require(_identityRegistry != address(0), "ValidationRegistry: invalid identity registry");

        identityRegistry = IIdentityRegistry(_identityRegistry);
        minimumRequestStake = _minimumRequestStake;
        minimumValidatorStake = _minimumValidatorStake;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(DISPUTE_RESOLVER_ROLE, msg.sender);
        _grantRole(TEE_VALIDATOR_ROLE, msg.sender);
        _grantRole(ZK_VERIFIER_ROLE, msg.sender);

        _nextRequestId = 1;
    }

    /**
     * @inheritdoc IValidationRegistry
     */
    function requestValidation(
        uint256 agentId,
        ValidationType validationType,
        string calldata taskHash,
        string calldata taskMetadata,
        uint256 deadline
    ) external payable override returns (uint256 requestId) {
        require(
            identityRegistry.isAgentActive(agentId),
            "ValidationRegistry: agent does not exist or is inactive"
        );
        require(deadline > block.timestamp, "ValidationRegistry: deadline must be in future");

        if (validationType == ValidationType.STAKED) {
            require(
                msg.value >= minimumRequestStake,
                "ValidationRegistry: insufficient stake"
            );
        }

        requestId = _nextRequestId++;

        _requests[requestId] = ValidationRequest({
            agentId: agentId,
            requester: msg.sender,
            validationType: validationType,
            taskHash: taskHash,
            taskMetadata: taskMetadata,
            stake: msg.value,
            deadline: deadline,
            status: ValidationStatus.PENDING,
            timestamp: block.timestamp
        });

        _agentValidations[agentId].push(requestId);

        emit ValidationRequested(
            requestId,
            agentId,
            msg.sender,
            validationType,
            taskHash
        );
    }

    /**
     * @inheritdoc IValidationRegistry
     */
    function submitStakedValidation(
        uint256 requestId,
        bool approved,
        string calldata proof,
        string calldata metadata
    ) external payable override nonReentrant {
        ValidationRequest storage request = _requests[requestId];

        require(request.timestamp > 0, "ValidationRegistry: request does not exist");
        require(
            request.status == ValidationStatus.PENDING,
            "ValidationRegistry: request not pending"
        );
        require(
            block.timestamp <= request.deadline,
            "ValidationRegistry: deadline passed"
        );
        require(
            request.validationType == ValidationType.STAKED,
            "ValidationRegistry: wrong validation type"
        );
        require(
            msg.value >= minimumValidatorStake,
            "ValidationRegistry: insufficient validator stake"
        );

        _responses[requestId] = ValidationResponse({
            requestId: requestId,
            validator: msg.sender,
            approved: approved,
            proof: proof,
            validatorStake: msg.value,
            timestamp: block.timestamp,
            metadata: metadata
        });

        request.status = ValidationStatus.VALIDATED;
        _validatorSubmissions[msg.sender].push(requestId);

        // Update statistics
        _agentTotalValidations[request.agentId]++;
        if (approved) {
            _agentSuccessCount[request.agentId]++;
        }

        emit ValidationSubmitted(requestId, msg.sender, approved, proof);
    }

    /**
     * @inheritdoc IValidationRegistry
     */
    function submitTEEValidation(
        uint256 requestId,
        bool approved,
        bytes calldata attestation,
        string calldata metadata
    ) external override onlyRole(TEE_VALIDATOR_ROLE) {
        ValidationRequest storage request = _requests[requestId];

        require(request.timestamp > 0, "ValidationRegistry: request does not exist");
        require(
            request.status == ValidationStatus.PENDING,
            "ValidationRegistry: request not pending"
        );
        require(
            block.timestamp <= request.deadline,
            "ValidationRegistry: deadline passed"
        );
        require(
            request.validationType == ValidationType.TEE_ATTESTATION,
            "ValidationRegistry: wrong validation type"
        );

        // In production, verify the TEE attestation signature here
        // For now, we trust the TEE_VALIDATOR_ROLE

        _responses[requestId] = ValidationResponse({
            requestId: requestId,
            validator: msg.sender,
            approved: approved,
            proof: string(abi.encodePacked("TEE:", attestation)),
            validatorStake: 0,
            timestamp: block.timestamp,
            metadata: metadata
        });

        request.status = ValidationStatus.VALIDATED;
        _validatorSubmissions[msg.sender].push(requestId);

        // Update statistics
        _agentTotalValidations[request.agentId]++;
        if (approved) {
            _agentSuccessCount[request.agentId]++;
        }

        emit ValidationSubmitted(requestId, msg.sender, approved, "TEE_ATTESTATION");
    }

    /**
     * @inheritdoc IValidationRegistry
     */
    function submitZKProofValidation(
        uint256 requestId,
        bool approved,
        bytes calldata zkProof,
        string calldata metadata
    ) external override onlyRole(ZK_VERIFIER_ROLE) {
        ValidationRequest storage request = _requests[requestId];

        require(request.timestamp > 0, "ValidationRegistry: request does not exist");
        require(
            request.status == ValidationStatus.PENDING,
            "ValidationRegistry: request not pending"
        );
        require(
            block.timestamp <= request.deadline,
            "ValidationRegistry: deadline passed"
        );
        require(
            request.validationType == ValidationType.ZK_PROOF,
            "ValidationRegistry: wrong validation type"
        );

        // In production, verify the ZK proof here
        // For now, we trust the ZK_VERIFIER_ROLE

        _responses[requestId] = ValidationResponse({
            requestId: requestId,
            validator: msg.sender,
            approved: approved,
            proof: string(abi.encodePacked("ZK:", zkProof)),
            validatorStake: 0,
            timestamp: block.timestamp,
            metadata: metadata
        });

        request.status = ValidationStatus.VALIDATED;
        _validatorSubmissions[msg.sender].push(requestId);

        // Update statistics
        _agentTotalValidations[request.agentId]++;
        if (approved) {
            _agentSuccessCount[request.agentId]++;
        }

        emit ValidationSubmitted(requestId, msg.sender, approved, "ZK_PROOF");
    }

    /**
     * @inheritdoc IValidationRegistry
     */
    function finalizeValidation(uint256 requestId) external override nonReentrant {
        ValidationRequest storage request = _requests[requestId];
        ValidationResponse storage response = _responses[requestId];

        require(request.timestamp > 0, "ValidationRegistry: request does not exist");
        require(
            request.status == ValidationStatus.VALIDATED ||
            (request.status == ValidationStatus.PENDING && block.timestamp > request.deadline),
            "ValidationRegistry: cannot finalize"
        );

        ValidationStatus finalStatus;
        uint256 totalStake = request.stake + response.validatorStake;

        if (request.status == ValidationStatus.VALIDATED && response.approved) {
            // Successful validation - return stakes + reward
            finalStatus = ValidationStatus.VALIDATED;

            if (totalStake > 0) {
                // Validator gets both stakes
                (bool success, ) = response.validator.call{value: totalStake}("");
                require(success, "ValidationRegistry: stake transfer failed");
            }
        } else if (request.status == ValidationStatus.VALIDATED && !response.approved) {
            // Rejected validation - return stakes
            finalStatus = ValidationStatus.REJECTED;

            if (request.stake > 0) {
                (bool success1, ) = request.requester.call{value: request.stake}("");
                require(success1, "ValidationRegistry: requester refund failed");
            }
            if (response.validatorStake > 0) {
                (bool success2, ) = response.validator.call{value: response.validatorStake}("");
                require(success2, "ValidationRegistry: validator refund failed");
            }
        } else {
            // Expired without validation - return requester stake
            finalStatus = ValidationStatus.EXPIRED;

            if (request.stake > 0) {
                (bool success, ) = request.requester.call{value: request.stake}("");
                require(success, "ValidationRegistry: stake refund failed");
            }
        }

        request.status = finalStatus;
        request.stake = 0;
        response.validatorStake = 0;

        emit ValidationFinalized(requestId, finalStatus, totalStake);
    }

    /**
     * @inheritdoc IValidationRegistry
     */
    function disputeValidation(uint256 requestId, string calldata reason)
        external
        override
    {
        ValidationRequest storage request = _requests[requestId];

        require(request.timestamp > 0, "ValidationRegistry: request does not exist");
        require(
            request.status == ValidationStatus.VALIDATED,
            "ValidationRegistry: can only dispute validated requests"
        );
        require(
            msg.sender == request.requester ||
            hasRole(DISPUTE_RESOLVER_ROLE, msg.sender),
            "ValidationRegistry: caller not authorized"
        );

        request.status = ValidationStatus.DISPUTED;
        emit ValidationDisputed(requestId, msg.sender, reason);
    }

    /**
     * @inheritdoc IValidationRegistry
     */
    function resolveValidationDispute(
        uint256 requestId,
        ValidationStatus finalStatus,
        bool slashRequester,
        bool slashValidator
    ) external override onlyRole(DISPUTE_RESOLVER_ROLE) nonReentrant {
        ValidationRequest storage request = _requests[requestId];
        ValidationResponse storage response = _responses[requestId];

        require(request.timestamp > 0, "ValidationRegistry: request does not exist");
        require(
            request.status == ValidationStatus.DISPUTED,
            "ValidationRegistry: request not disputed"
        );

        // Handle stakes based on dispute resolution
        uint256 totalStake = request.stake + response.validatorStake;

        if (slashRequester && slashValidator) {
            // Both slashed - send to resolver
            if (totalStake > 0) {
                (bool success, ) = msg.sender.call{value: totalStake}("");
                require(success, "ValidationRegistry: slash transfer failed");
            }
        } else if (slashRequester) {
            // Requester slashed - validator gets both stakes
            if (totalStake > 0) {
                (bool success, ) = response.validator.call{value: totalStake}("");
                require(success, "ValidationRegistry: stake transfer failed");
            }
        } else if (slashValidator) {
            // Validator slashed - requester gets both stakes
            if (totalStake > 0) {
                (bool success, ) = request.requester.call{value: totalStake}("");
                require(success, "ValidationRegistry: stake transfer failed");
            }
        } else {
            // No slashing - return stakes
            if (request.stake > 0) {
                (bool success1, ) = request.requester.call{value: request.stake}("");
                require(success1, "ValidationRegistry: requester refund failed");
            }
            if (response.validatorStake > 0) {
                (bool success2, ) = response.validator.call{value: response.validatorStake}("");
                require(success2, "ValidationRegistry: validator refund failed");
            }
        }

        request.status = finalStatus;
        request.stake = 0;
        response.validatorStake = 0;

        emit ValidationFinalized(requestId, finalStatus, totalStake);
    }

    /**
     * @inheritdoc IValidationRegistry
     */
    function getValidationRequest(uint256 requestId)
        external
        view
        override
        returns (ValidationRequest memory)
    {
        require(
            _requests[requestId].timestamp > 0,
            "ValidationRegistry: request does not exist"
        );
        return _requests[requestId];
    }

    /**
     * @inheritdoc IValidationRegistry
     */
    function getValidationResponse(uint256 requestId)
        external
        view
        override
        returns (ValidationResponse memory)
    {
        require(
            _responses[requestId].timestamp > 0,
            "ValidationRegistry: response does not exist"
        );
        return _responses[requestId];
    }

    /**
     * @inheritdoc IValidationRegistry
     */
    function getAgentValidations(uint256 agentId)
        external
        view
        override
        returns (uint256[] memory)
    {
        return _agentValidations[agentId];
    }

    /**
     * @inheritdoc IValidationRegistry
     */
    function getValidatorSubmissions(address validator)
        external
        view
        override
        returns (uint256[] memory)
    {
        return _validatorSubmissions[validator];
    }

    /**
     * @inheritdoc IValidationRegistry
     */
    function getValidationSuccessRate(uint256 agentId)
        external
        view
        override
        returns (uint256 successRate, uint256 totalValidations)
    {
        totalValidations = _agentTotalValidations[agentId];
        if (totalValidations == 0) {
            return (10000, 0); // 100% for new agents
        }

        successRate = (_agentSuccessCount[agentId] * 10000) / totalValidations;
    }

    /**
     * @inheritdoc IValidationRegistry
     */
    function isTEEValidator(address validator)
        external
        view
        override
        returns (bool)
    {
        return hasRole(TEE_VALIDATOR_ROLE, validator);
    }

    /**
     * @inheritdoc IValidationRegistry
     */
    function isValidationDisputeResolver(address resolver)
        external
        view
        override
        returns (bool)
    {
        return hasRole(DISPUTE_RESOLVER_ROLE, resolver);
    }

    /**
     * @dev Update minimum stakes (admin only)
     */
    function setMinimumStakes(
        uint256 newRequestStake,
        uint256 newValidatorStake
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        minimumRequestStake = newRequestStake;
        minimumValidatorStake = newValidatorStake;
    }
}
