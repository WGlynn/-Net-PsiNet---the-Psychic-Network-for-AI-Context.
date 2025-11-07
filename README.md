# ΨNet: The Psychic Network for AI Context

> Hybrid decentralized AI context protocol enabling AI agents to own, share, and verify conversation history across systems securely.

## Overview

**ΨNet** (PsiNet) is a revolutionary hybrid decentralized infrastructure that combines P2P networking, IPFS, blockchain, and Arweave storage to create a trustless environment for AI agent interactions. It features Ed25519 DIDs, zero-knowledge proofs, capability-based access control, encrypted context graphs, and CRDT merging.

## 🌟 Key Features

- **Hybrid Network Layer**: P2P + IPFS for distributed context sharing
- **Permanent Storage**: Blockchain + Arweave for immutable records
- **Self-Sovereign Identity**: Ed25519 DIDs for agent authentication
- **Privacy-First**: Zero-knowledge proofs and end-to-end encryption
- **Reputation System**: ERC-8004 compliant trustless agent reputation
- **Conflict-Free Sync**: CRDT-based context merging
- **Capability-Based Access**: Fine-grained permission control

## 🏗️ Architecture

ΨNet consists of multiple layers working together:

### 1. **Network Layer**
- **P2P Network**: Low-latency direct agent communication
- **IPFS**: Content-addressed distributed storage
- **Blockchain**: Immutable ownership and audit trail (ERC-8004)
- **Arweave**: Permanent archival storage

### 2. **Security Layer**
- **Ed25519 DIDs**: Decentralized identifiers for agents
- **Zero-Knowledge Proofs**: Privacy-preserving verification
- **Capability Tokens**: Fine-grained access control
- **Encrypted Context Graphs**: Protected conversation data

### 3. **Trust Layer (ERC-8004)**
- **Identity Registry**: Portable agent identities (ERC-721 based)
- **Reputation Registry**: Verifiable feedback and scoring
- **Validation Registry**: Task verification with cryptographic proofs

### 4. **Data Layer**
- **Context Graphs**: Graph-structured conversation history
- **CRDT Merging**: Eventual consistency across distributed nodes
- **Content Addressing**: Immutable references via IPFS CIDs

### 5. **Economic Layer ($PSI Token)**
- **Positive-Sum Economics**: Cooperation rewards > Competition rewards
- **Minimal Rent Extraction**: 0.1% fees vs 30% traditional (99.67% reduction)
- **Information Transparency**: All economics publicly verifiable
- **Deflationary Supply**: 50% of fees burned, reducing circulating supply
- **Network Effect Bonuses**: Everyone benefits from growth (Metcalfe's Law)

## 📋 ERC-8004: Trustless Agents

ΨNet implements the **ERC-8004** standard to provide an on-chain trust layer for AI agents. This enables:

- ✅ Portable agent identities across platforms
- ✅ Verifiable reputation scores
- ✅ Cryptographic proof of interactions
- ✅ Economic security through staking
- ✅ Privacy-preserving validations

### Smart Contracts

The project includes three core ERC-8004 registries:

1. **IdentityRegistry.sol** - Agent identity management (ERC-721 NFTs)
2. **ReputationRegistry.sol** - Feedback and reputation scoring
3. **ValidationRegistry.sol** - Task verification with ZK proofs/TEE

See [`ERC8004_INTEGRATION.md`](./ERC8004_INTEGRATION.md) for detailed integration guide.

## 🚀 Quick Start

### Prerequisites

```bash
node >= 18.0.0
npm >= 9.0.0
```

### Installation

```bash
# Clone the repository
git clone https://github.com/WGlynn/-Net-PsiNet---the-Psychic-Network-for-AI-Context.
cd -Net-PsiNet---the-Psychic-Network-for-AI-Context

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Edit .env with your keys
```

### Compile Contracts

```bash
npm run compile
```

### Run Tests

```bash
npm test
```

### Deploy Contracts

```bash
# Deploy to local network
npm run node  # In one terminal
npm run deploy:localhost  # In another terminal

# Deploy to testnet
npm run deploy:sepolia

# Deploy to mainnet
npm run deploy:mainnet
```

## 🎮 Interactive Simulation

Experience ΨNet's positive-sum economics in your browser!

```bash
# Open the simulation
cd simulation
open index.html  # or double-click the file
```

### What the Simulation Demonstrates

- **Positive-Sum Economics**: Cooperation earns 50% more than competition
- **Rent Extraction Comparison**: 0.1% ΨNet fee vs 30% traditional platform fee
- **Network Effects**: Watch how everyone benefits as the network grows
- **Information Transparency**: All metrics visible in real-time
- **Mutualistic Incentives**: Both agents win more when they cooperate

### Try These Actions

| Action | Demonstrates |
|--------|--------------|
| **Add Agent** | Network growth effects and bonuses |
| **Create Interaction** | Ultra-low fees (0.1% vs 30%) |
| **Demonstrate Cooperation** | Positive-sum: both agents get 1.5x rewards |
| **Show Rent Extraction** | Savings: $299 per $1000 transaction |
| **Show Positive-Sum** | Network effect: everyone benefits from growth |

**See it in action**: Open `simulation/index.html` for the full interactive demo!

📚 **Learn More**: See [simulation/README.md](./simulation/README.md) for detailed guide

## 💰 Tokenomics ($PSI)

ΨNet introduces the **$PSI token** with positive-sum mutualistic economics:

### Key Economics

```
Transaction Fee: 0.1% (vs 30% traditional)
Fee Distribution:
├─ 50% Burned (deflationary, benefits all holders)
├─ 30% Rewards (distributed to contributors)
└─ 20% Treasury (community-controlled)

Multipliers:
├─ Solo action: 1.0x base reward
├─ Cooperative action: 1.5x reward (both agents!)
├─ Network effect (100+ agents): 2.0x reward
└─ Mega network (500+ agents): 3.0x reward
```

### Positive-Sum Proof

```
Traditional Platform (Zero-Sum):
Agent A: +1000 PSI, Agent B: -1000 PSI
Total: 0 PSI ❌

ΨNet Cooperation (Positive-Sum):
Agent A: +750 PSI (1.5x), Agent B: +750 PSI (1.5x)
Total: +1500 PSI ✅
Surplus: +500 PSI (50% more value created!)
```

📚 **Full Details**: See [TOKENOMICS.md](./TOKENOMICS.md) for complete economic design

## 📖 Documentation

- **[Network Design Breakdown](./NETWORK_DESIGN_BREAKDOWN.md)** - Detailed architecture overview
- **[ERC-8004 Integration](./ERC8004_INTEGRATION.md)** - Smart contract integration guide
- **[Tokenomics](./TOKENOMICS.md)** - Complete economic design and game theory
- **[Interactive Simulation Guide](./simulation/README.md)** - How to use the demo
- **[Quick Start Guide](./QUICKSTART.md)** - Step-by-step local setup
- **[Project Status](./PROJECT_STATUS.md)** - Current implementation status

## 🔧 Smart Contract Interfaces

### Identity Registry

```solidity
// Register a new agent
function registerAgent(string calldata agentURI)
    external returns (uint256 agentId);

// Get agent metadata URI
function getAgentURI(uint256 agentId)
    external view returns (string memory);
```

### Reputation Registry

```solidity
// Post feedback for an agent
function postFeedback(
    uint256 agentId,
    FeedbackType feedbackType,
    uint8 rating,
    string calldata contextHash,
    string calldata metadata
) external payable returns (uint256 feedbackId);

// Get reputation score
function getReputationScore(uint256 agentId)
    external view returns (uint256 score, uint256 feedbackCount);
```

### Validation Registry

```solidity
// Request validation
function requestValidation(
    uint256 agentId,
    ValidationType validationType,
    string calldata taskHash,
    string calldata taskMetadata,
    uint256 deadline
) external payable returns (uint256 requestId);

// Submit ZK proof validation
function submitZKProofValidation(
    uint256 requestId,
    bool approved,
    bytes calldata zkProof,
    string calldata metadata
) external;
```

## 💡 Use Cases

### 1. **Cross-Platform AI Agents**
AI agents maintain continuous context when moving between platforms (ChatGPT → Claude → Gemini)

### 2. **Multi-Agent Collaboration**
Multiple AI agents collaborate on tasks with shared, synchronized context

### 3. **Verifiable AI Interactions**
Users prove an AI interaction occurred without revealing the conversation

### 4. **Context Marketplace**
AI agents can buy/sell/trade valuable context while maintaining provenance

### 5. **Compliance & Auditing**
Organizations audit AI interactions while respecting privacy

### 6. **Personal AI Memory**
Users maintain lifetime AI conversation history they truly own

## 🔐 Security

ΨNet implements multiple layers of security:

- **Confidentiality**: End-to-end encryption, ZK proofs
- **Integrity**: Content addressing, blockchain records, cryptographic signatures
- **Availability**: Distributed P2P, IPFS replication, permanent Arweave storage
- **Authentication**: DID-based identity, Ed25519 signatures
- **Authorization**: Capability tokens, smart contract enforcement

## 🌐 Multi-Chain Support

Deploy ERC-8004 contracts on multiple networks:

- Ethereum Mainnet
- Optimism (L2)
- Arbitrum (L2)
- Polygon
- Base
- Any EVM-compatible chain

## 🛣️ Roadmap

- [x] Core architecture design
- [x] ERC-8004 smart contract implementation
- [x] Identity, Reputation, and Validation registries
- [ ] P2P networking layer
- [ ] IPFS integration
- [ ] Arweave integration
- [ ] DID resolution system
- [ ] ZK proof verification
- [ ] CRDT implementation
- [ ] Frontend dashboard
- [ ] SDK for developers
- [ ] Multi-chain deployment
- [ ] Mainnet launch

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## 🔗 Resources

- **ERC-8004 Specification**: https://eips.ethereum.org/EIPS/eip-8004
- **OpenZeppelin Contracts**: https://docs.openzeppelin.com/contracts/
- **Hardhat Documentation**: https://hardhat.org/
- **IPFS Documentation**: https://docs.ipfs.tech/
- **Arweave Documentation**: https://docs.arweave.org/

## 📞 Contact & Community

- **GitHub Issues**: Report bugs and request features
- **Discord**: Join our community (coming soon)
- **Twitter**: Follow @PsiNetAI (coming soon)

---

**Built with ❤️ for the autonomous AI agent economy**

*ΨNet - Where AI agents truly own their identity and reputation*
