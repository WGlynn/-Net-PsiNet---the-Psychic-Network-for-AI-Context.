// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./IIdentityRegistry.sol";

/**
 * @title IdentityRegistry
 * @dev ERC-8004 compliant Identity Registry implementation for ΨNet
 * @notice Provides portable, censorship-resistant identities for AI agents
 *
 * This contract extends ERC-721 with URIStorage to create unique, transferable
 * agent identities. Each agent receives an NFT that points to their registration
 * metadata stored on IPFS, Arweave, or other decentralized storage.
 */
contract IdentityRegistry is ERC721URIStorage, Ownable, IIdentityRegistry {
    // Current token ID counter
    uint256 private _nextTokenId;

    // Mapping from agent ID to active status
    mapping(uint256 => bool) private _agentActive;

    // Mapping from owner address to their agent IDs
    mapping(address => uint256[]) private _ownerAgents;

    // Mapping to track index of agent in owner's array (for efficient removal)
    mapping(uint256 => uint256) private _agentIndexInOwnerArray;

    constructor() ERC721("PsiNet Agent Identity", "PSAI") Ownable(msg.sender) {
        _nextTokenId = 1; // Start token IDs at 1
    }

    /**
     * @inheritdoc IIdentityRegistry
     */
    function registerAgent(string calldata agentURI)
        external
        override
        returns (uint256 agentId)
    {
        require(bytes(agentURI).length > 0, "IdentityRegistry: URI cannot be empty");

        agentId = _nextTokenId++;

        _safeMint(msg.sender, agentId);
        _setTokenURI(agentId, agentURI);
        _agentActive[agentId] = true;

        // Add to owner's agent list
        _agentIndexInOwnerArray[agentId] = _ownerAgents[msg.sender].length;
        _ownerAgents[msg.sender].push(agentId);

        emit AgentRegistered(agentId, msg.sender, agentURI);
    }

    /**
     * @inheritdoc IIdentityRegistry
     */
    function updateAgentURI(uint256 agentId, string calldata newURI)
        external
        override
    {
        require(_ownerOf(agentId) == msg.sender, "IdentityRegistry: caller is not owner");
        require(_agentActive[agentId], "IdentityRegistry: agent is not active");
        require(bytes(newURI).length > 0, "IdentityRegistry: URI cannot be empty");

        _setTokenURI(agentId, newURI);
        emit AgentURIUpdated(agentId, newURI);
    }

    /**
     * @inheritdoc IIdentityRegistry
     */
    function deactivateAgent(uint256 agentId) external override {
        require(_ownerOf(agentId) == msg.sender, "IdentityRegistry: caller is not owner");
        require(_agentActive[agentId], "IdentityRegistry: agent already inactive");

        _agentActive[agentId] = false;
        emit AgentDeactivated(agentId);
    }

    /**
     * @inheritdoc IIdentityRegistry
     */
    function getAgentURI(uint256 agentId)
        external
        view
        override
        returns (string memory)
    {
        require(_ownerOf(agentId) != address(0), "IdentityRegistry: agent does not exist");
        return tokenURI(agentId);
    }

    /**
     * @inheritdoc IIdentityRegistry
     */
    function getAgentOwner(uint256 agentId)
        external
        view
        override
        returns (address)
    {
        address owner = _ownerOf(agentId);
        require(owner != address(0), "IdentityRegistry: agent does not exist");
        return owner;
    }

    /**
     * @inheritdoc IIdentityRegistry
     */
    function isAgentActive(uint256 agentId)
        external
        view
        override
        returns (bool)
    {
        return _agentActive[agentId];
    }

    /**
     * @inheritdoc IIdentityRegistry
     */
    function getAgentsByOwner(address owner)
        external
        view
        override
        returns (uint256[] memory)
    {
        return _ownerAgents[owner];
    }

    /**
     * @inheritdoc IIdentityRegistry
     */
    function getTotalAgents() external view override returns (uint256) {
        return _nextTokenId - 1;
    }

    /**
     * @dev Override _update to maintain owner's agent list
     */
    function _update(address to, uint256 tokenId, address auth)
        internal
        override
        returns (address)
    {
        address from = _ownerOf(tokenId);

        // Remove from old owner's list
        if (from != address(0) && from != to) {
            uint256 lastIndex = _ownerAgents[from].length - 1;
            uint256 agentIndex = _agentIndexInOwnerArray[tokenId];

            if (agentIndex != lastIndex) {
                uint256 lastAgentId = _ownerAgents[from][lastIndex];
                _ownerAgents[from][agentIndex] = lastAgentId;
                _agentIndexInOwnerArray[lastAgentId] = agentIndex;
            }

            _ownerAgents[from].pop();
        }

        // Add to new owner's list
        if (to != address(0) && from != to) {
            _agentIndexInOwnerArray[tokenId] = _ownerAgents[to].length;
            _ownerAgents[to].push(tokenId);
        }

        return super._update(to, tokenId, auth);
    }
}
