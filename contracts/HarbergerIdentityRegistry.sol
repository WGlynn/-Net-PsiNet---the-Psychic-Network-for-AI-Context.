// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./HarbergerNFT.sol";
import "./erc8004/IIdentityRegistry.sol";

/**
 * @title HarbergerIdentityRegistry
 * @dev ERC-8004 Identity Registry with Harberger taxation
 *
 * INNOVATION: AI agent identities with continuous self-assessment
 *
 * USE CASE:
 * - High-value agent identities (e.g., @GPT4, @Claude, @Gemini)
 * - Prevents name squatting and identity hoarding
 * - Ensures productive use of valuable identities
 * - Generates ongoing revenue for ecosystem
 *
 * EXAMPLE:
 * Alice owns "@TrustBot" identity:
 * - Self-assesses at 10,000 PSI
 * - Pays 500 PSI/year in tax (5%)
 * - Tax goes to: creator (40%), rewards (40%), treasury (20%)
 * - Anyone can buy "@TrustBot" for 10,000 PSI
 * - If Alice undervalues, someone will buy it
 * - If Alice overvalues, she overpays tax
 * - Optimal: honest assessment
 *
 * BENEFITS:
 * - Prevents identity speculation
 * - High-value identities actively used (not hoarded)
 * - Continuous creator royalties (vs one-time sale)
 * - Always-liquid market for identities
 * - Honest market pricing
 */
contract HarbergerIdentityRegistry is HarbergerNFT, IIdentityRegistry {
    uint256 private _nextAgentId;

    // Agent metadata
    struct AgentIdentity {
        string agentURI; // Metadata URI
        bool active; // Can be deactivated by owner
        uint256 registeredAt;
    }

    mapping(uint256 => AgentIdentity) public agents;

    // Reverse lookup: owner -> agent IDs
    mapping(address => uint256[]) private _ownerAgents;

    event AgentRegistered(uint256 indexed agentId, address indexed owner, string agentURI);
    event AgentURIUpdated(uint256 indexed agentId, string newURI);
    event AgentDeactivated(uint256 indexed agentId);
    event AgentReactivated(uint256 indexed agentId);

    constructor(
        address _psiToken,
        address _rewardPool,
        address _treasury
    ) HarbergerNFT(
        "PsiNet Agent Identity (Harberger)",
        "PSIAI-H",
        _psiToken,
        _rewardPool,
        _treasury
    ) {
        _nextAgentId = 1;
    }

    /**
     * @dev Register new agent identity with initial self-assessment
     * @param agentURI Metadata URI (name, description, capabilities)
     * @param initialValue Initial self-assessed value in PSI
     */
    function registerAgent(string calldata agentURI, uint256 initialValue)
        external
        returns (uint256 agentId)
    {
        require(bytes(agentURI).length > 0, "URI required");
        require(initialValue > 0, "Must set initial value");

        agentId = _nextAgentId++;

        // Mint NFT to registrant
        _mint(msg.sender, agentId);

        // Register Harberger asset
        _registerAsset(agentId, msg.sender, initialValue);

        // Store agent metadata
        agents[agentId] = AgentIdentity({
            agentURI: agentURI,
            active: true,
            registeredAt: block.timestamp
        });

        _ownerAgents[msg.sender].push(agentId);

        emit AgentRegistered(agentId, msg.sender, agentURI);

        return agentId;
    }

    /**
     * @dev Legacy function for compatibility (sets default value)
     */
    function registerAgent(string calldata agentURI)
        external
        override
        returns (uint256 agentId)
    {
        // Default initial value: 100 PSI (can be updated immediately)
        return this.registerAgent(agentURI, 100 * 10**18);
    }

    /**
     * @dev Update agent metadata URI
     */
    function updateAgentURI(uint256 agentId, string calldata newURI) external override {
        require(ownerOf(agentId) == msg.sender, "Not owner");
        require(bytes(newURI).length > 0, "URI required");

        agents[agentId].agentURI = newURI;

        emit AgentURIUpdated(agentId, newURI);
    }

    /**
     * @dev Deactivate agent (owner can pause usage)
     * Note: Still pays tax while deactivated!
     */
    function deactivateAgent(uint256 agentId) external override {
        require(ownerOf(agentId) == msg.sender, "Not owner");
        require(agents[agentId].active, "Already deactivated");

        agents[agentId].active = false;

        emit AgentDeactivated(agentId);
    }

    /**
     * @dev Reactivate agent
     */
    function reactivateAgent(uint256 agentId) external {
        require(ownerOf(agentId) == msg.sender, "Not owner");
        require(!agents[agentId].active, "Already active");

        agents[agentId].active = true;

        emit AgentReactivated(agentId);
    }

    /**
     * @dev Get agent URI (metadata)
     */
    function getAgentURI(uint256 agentId)
        external
        view
        override
        returns (string memory)
    {
        require(_exists(agentId), "Agent does not exist");
        return agents[agentId].agentURI;
    }

    /**
     * @dev Get agent owner
     */
    function getAgentOwner(uint256 agentId)
        external
        view
        override
        returns (address)
    {
        return ownerOf(agentId);
    }

    /**
     * @dev Check if agent is active
     */
    function isAgentActive(uint256 agentId)
        external
        view
        override
        returns (bool)
    {
        return _exists(agentId) && agents[agentId].active;
    }

    /**
     * @dev Get all agents owned by address
     */
    function getAgentsByOwner(address owner)
        external
        view
        returns (uint256[] memory)
    {
        return _ownerAgents[owner];
    }

    /**
     * @dev Get complete agent information including Harberger data
     */
    function getAgentFullInfo(uint256 agentId)
        external
        view
        returns (
            string memory agentURI,
            address owner,
            bool active,
            uint256 selfAssessedValue,
            uint256 taxOwed,
            uint256 annualTax,
            address creator,
            bool atRisk
        )
    {
        require(_exists(agentId), "Agent does not exist");

        AgentIdentity storage agent = agents[agentId];
        (
            address _owner,
            uint256 _value,
            uint256 _taxOwed,
            uint256 _annualTax,
            address _creator,
            bool _atRisk
        ) = getAssetInfo(agentId);

        return (
            agent.agentURI,
            _owner,
            agent.active,
            _value,
            _taxOwed,
            _annualTax,
            _creator,
            _atRisk
        );
    }

    /**
     * @dev Find undervalued identities (opportunities for forced purchase)
     * Returns agent IDs where self-assessment is below market estimate
     */
    function findUndervaluedAgents(uint256 minMarketValue)
        external
        view
        returns (uint256[] memory undervaluedIds)
    {
        uint256 count = 0;
        uint256[] memory temp = new uint256[](_nextAgentId);

        for (uint256 i = 1; i < _nextAgentId; i++) {
            if (_exists(i)) {
                uint256 selfValue = assets[i].selfAssessedValue;
                if (selfValue > 0 && selfValue < minMarketValue) {
                    temp[count] = i;
                    count++;
                }
            }
        }

        // Trim array
        undervaluedIds = new uint256[](count);
        for (uint256 j = 0; j < count; j++) {
            undervaluedIds[j] = temp[j];
        }

        return undervaluedIds;
    }

    /**
     * @dev Find agents at risk of forfeiture (high unpaid tax)
     */
    function findAtRiskAgents()
        external
        view
        returns (uint256[] memory atRiskIds)
    {
        uint256 count = 0;
        uint256[] memory temp = new uint256[](_nextAgentId);

        for (uint256 i = 1; i < _nextAgentId; i++) {
            if (_exists(i) && isAtRiskOfForfeiture(i)) {
                temp[count] = i;
                count++;
            }
        }

        // Trim array
        atRiskIds = new uint256[](count);
        for (uint256 j = 0; j < count; j++) {
            atRiskIds[j] = temp[j];
        }

        return atRiskIds;
    }

    /**
     * @dev Calculate opportunity cost of holding vs selling
     * Helps owners decide whether to keep or forfeit
     */
    function calculateHoldingCost(uint256 agentId, uint256 holdingMonths)
        external
        view
        returns (
            uint256 totalTaxCost,
            uint256 opportunityCost,
            uint256 totalCost
        )
    {
        uint256 monthlyTax = getMonthlyTax(agentId);
        totalTaxCost = monthlyTax * holdingMonths;

        // Opportunity cost: could have sold and invested proceeds
        // Assume 5% annual return on proceeds
        uint256 proceeds = assets[agentId].selfAssessedValue;
        uint256 annualReturn = (proceeds * 500) / 10000; // 5%
        opportunityCost = (annualReturn * holdingMonths) / 12;

        totalCost = totalTaxCost + opportunityCost;

        return (totalTaxCost, opportunityCost, totalCost);
    }

    /**
     * @dev Override transfer to update owner tracking
     */
    function _transfer(
        address from,
        address to,
        uint256 tokenId
    ) internal virtual override {
        // Remove from old owner's list
        _removeOwnerAgent(from, tokenId);

        // Add to new owner's list
        _ownerAgents[to].push(tokenId);

        // Execute transfer
        super._transfer(from, to, tokenId);
    }

    /**
     * @dev Helper: Remove agent from owner's list
     */
    function _removeOwnerAgent(address owner, uint256 agentId) internal {
        uint256[] storage agentIds = _ownerAgents[owner];
        for (uint256 i = 0; i < agentIds.length; i++) {
            if (agentIds[i] == agentId) {
                // Replace with last element and pop
                agentIds[i] = agentIds[agentIds.length - 1];
                agentIds.pop();
                break;
            }
        }
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
     * @dev Get total number of registered agents
     */
    function totalAgents() external view returns (uint256) {
        return _nextAgentId - 1;
    }

    /**
     * @dev Get statistics
     */
    function getRegistryStats()
        external
        view
        returns (
            uint256 totalRegistered,
            uint256 totalActive,
            uint256 totalTaxRevenue,
            uint256 totalCreatorEarnings,
            uint256 averageValue
        )
    {
        totalRegistered = _nextAgentId - 1;

        uint256 activeCount = 0;
        uint256 sumValues = 0;

        for (uint256 i = 1; i < _nextAgentId; i++) {
            if (_exists(i)) {
                if (agents[i].active) {
                    activeCount++;
                }
                sumValues += assets[i].selfAssessedValue;
            }
        }

        averageValue = totalRegistered > 0 ? sumValues / totalRegistered : 0;

        return (
            totalRegistered,
            activeCount,
            totalTaxCollected,
            totalCreatorRoyalties,
            averageValue
        );
    }
}
