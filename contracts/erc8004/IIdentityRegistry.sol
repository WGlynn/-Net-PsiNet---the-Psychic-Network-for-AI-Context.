// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IIdentityRegistry
 * @dev Interface for ERC-8004 Identity Registry
 * @notice Provides a minimal on-chain handle for AI agents based on ERC-721 with URIStorage
 *
 * Identity Registry gives every agent a portable, censorship-resistant identifier
 * that resolves to an agent's registration file containing metadata and capabilities.
 */
interface IIdentityRegistry {
    /**
     * @dev Emitted when a new agent is registered
     * @param agentId The unique token ID for the agent
     * @param owner The address that owns this agent identity
     * @param agentURI The URI pointing to the agent's registration metadata
     */
    event AgentRegistered(uint256 indexed agentId, address indexed owner, string agentURI);

    /**
     * @dev Emitted when an agent's URI is updated
     * @param agentId The agent's token ID
     * @param newURI The new URI for the agent's metadata
     */
    event AgentURIUpdated(uint256 indexed agentId, string newURI);

    /**
     * @dev Emitted when an agent is deactivated
     * @param agentId The agent's token ID
     */
    event AgentDeactivated(uint256 indexed agentId);

    /**
     * @dev Register a new AI agent with metadata URI
     * @param agentURI The URI pointing to the agent's registration metadata (IPFS, Arweave, etc.)
     * @return agentId The unique token ID assigned to this agent
     *
     * Requirements:
     * - agentURI must not be empty
     * - Caller will become the owner of the agent identity NFT
     */
    function registerAgent(string calldata agentURI) external returns (uint256 agentId);

    /**
     * @dev Update an existing agent's metadata URI
     * @param agentId The agent's token ID
     * @param newURI The new URI for the agent's metadata
     *
     * Requirements:
     * - Caller must be the owner of the agent identity
     * - Agent must be active
     */
    function updateAgentURI(uint256 agentId, string calldata newURI) external;

    /**
     * @dev Deactivate an agent (soft delete)
     * @param agentId The agent's token ID
     *
     * Requirements:
     * - Caller must be the owner of the agent identity
     */
    function deactivateAgent(uint256 agentId) external;

    /**
     * @dev Get the metadata URI for an agent
     * @param agentId The agent's token ID
     * @return The URI string pointing to agent metadata
     */
    function getAgentURI(uint256 agentId) external view returns (string memory);

    /**
     * @dev Get the owner address of an agent
     * @param agentId The agent's token ID
     * @return The address that owns this agent identity
     */
    function getAgentOwner(uint256 agentId) external view returns (address);

    /**
     * @dev Check if an agent is currently active
     * @param agentId The agent's token ID
     * @return True if the agent is active, false otherwise
     */
    function isAgentActive(uint256 agentId) external view returns (bool);

    /**
     * @dev Get all agent IDs owned by an address
     * @param owner The owner address to query
     * @return An array of agent token IDs owned by the address
     */
    function getAgentsByOwner(address owner) external view returns (uint256[] memory);

    /**
     * @dev Get the total number of registered agents
     * @return The total count of registered agents
     */
    function getTotalAgents() external view returns (uint256);
}
