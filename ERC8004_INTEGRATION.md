# ERC-8004 Integration with ΨNet

## Overview

This document describes the integration of **ERC-8004: Trustless Agents** standard into the ΨNet (PsiNet) architecture. ERC-8004 provides the on-chain trust layer that complements ΨNet's hybrid decentralized infrastructure.

## What is ERC-8004?

ERC-8004 is an Ethereum standard that creates a universal, on-chain "trust layer" for autonomous AI agents. It enables agents to interact safely across organizational boundaries without pre-existing trust relationships.

### Core Components

ERC-8004 consists of three lightweight, on-chain registries:

1. **Identity Registry** - Portable, censorship-resistant agent identities (ERC-721 based)
2. **Reputation Registry** - Feedback signals and agent scoring
3. **Validation Registry** - Task verification through staking or cryptographic proofs

## Architecture Integration

### ΨNet + ERC-8004 Layered Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                        │
│         (AI Agent Applications, User Interfaces)            │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│              ERC-8004 Trust Layer (On-Chain)                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Identity   │  │  Reputation  │  │  Validation  │     │
│  │   Registry   │  │   Registry   │  │   Registry   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│           ΨNet Decentralized Infrastructure                 │
│  ┌──────────┐  ┌──────┐  ┌───────────┐  ┌─────────┐       │
│  │   P2P    │  │ IPFS │  │Blockchain │  │ Arweave │       │
│  │ Network  │  │      │  │           │  │         │       │
│  └──────────┘  └──────┘  └───────────┘  └─────────┘       │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│              Security & Cryptography Layer                  │
│   Ed25519 DIDs │ ZK Proofs │ CRDTs │ Encrypted Graphs      │
└─────────────────────────────────────────────────────────────┘
```

## Integration Points

### 1. Identity Registry + Ed25519 DIDs

**Synergy**: ΨNet's Ed25519 DIDs map perfectly to ERC-8004's Identity Registry.

**Implementation**:
```solidity
// Agent registers in Identity Registry
function registerAgent(string calldata agentURI) returns (uint256 agentId)

// agentURI points to IPFS/Arweave with:
{
  "did": "did:key:z6Mk...",  // Ed25519 DID
  "publicKey": "0x...",       // Ed25519 public key
  "capabilities": [...],       // Capability tokens
  "contextGraph": "ipfs://...", // Encrypted context graph root
  "created": 1234567890
}
```

**Benefits**:
- Single source of truth for agent identity
- On-chain NFT represents ownership of agent identity
- Off-chain DID provides cryptographic verification
- IPFS/Arweave stores detailed agent metadata

### 2. Reputation Registry + Context Verification

**Synergy**: Reputation feedback can reference ΨNet context graphs as proof.

**Implementation**:
```solidity
// Post feedback with context proof
function postFeedback(
  uint256 agentId,
  FeedbackType feedbackType,
  uint8 rating,
  string calldata contextHash,  // IPFS CID of encrypted context
  string calldata metadata       // Arweave URI with detailed review
)
```

**Workflow**:
1. User interacts with AI agent
2. Context is encrypted and stored on IPFS
3. Context CID is recorded on blockchain via feedback
4. Reputation score updates based on feedback
5. Future users can verify interaction authenticity

**Benefits**:
- Verifiable interaction history via context graphs
- Privacy-preserving (contexts are encrypted)
- Permanent record on Arweave for auditing
- Reputation is portable across platforms

### 3. Validation Registry + Zero-Knowledge Proofs

**Synergy**: ΨNet's ZK proof support enables private task validation.

**Implementation**:
```solidity
// Request validation with ZK proof
function requestValidation(
  uint256 agentId,
  ValidationType.ZK_PROOF,
  string calldata taskHash,
  string calldata taskMetadata,
  uint256 deadline
)

// Submit ZK proof validation
function submitZKProofValidation(
  uint256 requestId,
  bool approved,
  bytes calldata zkProof,
  string calldata metadata
)
```

**Use Cases**:

**Privacy-Preserving Verification**:
- Prove agent completed task without revealing task details
- Verify conversation quality without exposing content
- Demonstrate compliance without data disclosure

**TEE Integration**:
- Trusted Execution Environment for secure computation
- Attestation proves code ran in secure enclave
- Enables confidential AI inference verification

**Benefits**:
- Privacy-first validation
- Cryptographically verifiable proofs
- No trusted third party needed
- Compatible with confidential computing

### 4. CRDT Merging + Reputation Consensus

**Synergy**: CRDTs enable distributed reputation calculation.

**Implementation**:
- On-chain: Basic reputation score (weighted average)
- Off-chain: Sophisticated CRDT-based scoring algorithms
- Merge: Combine multiple reputation sources

**Example**:
```javascript
// Off-chain reputation merge using CRDTs
const reputationCRDT = new GCounter();

// Merge reputation from multiple sources
reputationCRDT.merge(ethereumScore);
reputationCRDT.merge(optimismScore);
reputationCRDT.merge(arbitrumScore);
reputationCRDT.merge(ipfsScore);

const finalReputation = reputationCRDT.value();
```

### 5. Capability Tokens + Access Control

**Synergy**: On-chain capabilities complement off-chain capability-based access.

**Implementation**:
- Identity Registry NFT acts as root capability
- Reputation score gates certain capabilities
- Validation proofs unlock advanced permissions

**Example Flow**:
1. Agent owns Identity NFT (root capability)
2. High reputation (>80%) unlocks "Trusted Agent" capability
3. Successful validations unlock "Verified Executor" capability
4. Capabilities are checked on-chain and off-chain

## Data Flow Example

### Complete Agent Lifecycle

```
1. REGISTRATION
   │
   ├─> Create Ed25519 DID (off-chain)
   ├─> Register in Identity Registry (on-chain)
   │   └─> NFT minted, points to IPFS metadata
   └─> Store metadata on IPFS + Arweave

2. INTERACTION
   │
   ├─> User interacts with agent via P2P
   ├─> Context graph updated with CRDT merge
   ├─> Encrypted context stored on IPFS
   └─> Context CID recorded for future reference

3. FEEDBACK
   │
   ├─> User posts feedback to Reputation Registry (on-chain)
   │   └─> References IPFS context CID as proof
   ├─> Detailed review stored on Arweave
   ├─> Reputation score updated (on-chain)
   └─> Score synchronized via CRDT (off-chain)

4. VALIDATION
   │
   ├─> Agent requests validation (on-chain)
   ├─> Validator computes ZK proof (off-chain)
   ├─> Proof submitted to Validation Registry (on-chain)
   ├─> Success updates validation success rate
   └─> New capabilities unlocked

5. CROSS-PLATFORM MIGRATION
   │
   ├─> Agent moves from Platform A to Platform B
   ├─> Identity NFT proves ownership (on-chain)
   ├─> Reputation follows via Registry (on-chain)
   ├─> Context graph synced via IPFS (off-chain)
   └─> Agent operational on new platform with full history
```

## Smart Contract Architecture

### Contract Deployment Order

1. **IdentityRegistry.sol** (deployed first, no dependencies)
2. **ReputationRegistry.sol** (depends on IdentityRegistry)
3. **ValidationRegistry.sol** (depends on IdentityRegistry)

### Contract Addresses (Network Specific)

```javascript
// Example deployment configuration
{
  "ethereum": {
    "IdentityRegistry": "0x...",
    "ReputationRegistry": "0x...",
    "ValidationRegistry": "0x..."
  },
  "optimism": {
    "IdentityRegistry": "0x...",
    "ReputationRegistry": "0x...",
    "ValidationRegistry": "0x..."
  }
}
```

## Integration Code Examples

### JavaScript/TypeScript Integration

```typescript
import { ethers } from 'ethers';
import { create } from 'ipfs-http-client';

// Initialize contracts
const identityRegistry = new ethers.Contract(
  IDENTITY_REGISTRY_ADDRESS,
  IdentityRegistryABI,
  signer
);

const reputationRegistry = new ethers.Contract(
  REPUTATION_REGISTRY_ADDRESS,
  ReputationRegistryABI,
  signer
);

// Register a new agent
async function registerAgent(did, publicKey, contextGraphCID) {
  // Upload metadata to IPFS
  const metadata = {
    did,
    publicKey,
    contextGraph: contextGraphCID,
    created: Date.now()
  };

  const ipfs = create({ url: 'https://ipfs.infura.io:5001' });
  const { cid } = await ipfs.add(JSON.stringify(metadata));
  const agentURI = `ipfs://${cid}`;

  // Register on-chain
  const tx = await identityRegistry.registerAgent(agentURI);
  const receipt = await tx.wait();

  // Extract agent ID from event
  const event = receipt.events.find(e => e.event === 'AgentRegistered');
  return event.args.agentId;
}

// Post feedback with context proof
async function postFeedback(agentId, rating, contextCID) {
  const tx = await reputationRegistry.postFeedback(
    agentId,
    0, // FeedbackType.POSITIVE
    rating,
    contextCID,
    `ipfs://${metadataCID}`
  );

  return await tx.wait();
}

// Get agent reputation
async function getReputation(agentId) {
  const [score, count] = await reputationRegistry.getReputationScore(agentId);
  return {
    score: score.toNumber() / 100, // Convert to percentage
    feedbackCount: count.toNumber()
  };
}
```

### Python Integration

```python
from web3 import Web3
import ipfshttpclient

# Connect to Ethereum
w3 = Web3(Web3.HTTPProvider('https://mainnet.infura.io/v3/...'))

# Load contracts
identity_registry = w3.eth.contract(
    address=IDENTITY_REGISTRY_ADDRESS,
    abi=IDENTITY_REGISTRY_ABI
)

# Register agent
def register_agent(did, public_key, context_graph_cid):
    # Upload to IPFS
    client = ipfshttpclient.connect('/ip4/127.0.0.1/tcp/5001')
    metadata = {
        'did': did,
        'publicKey': public_key,
        'contextGraph': context_graph_cid
    }
    res = client.add_json(metadata)
    agent_uri = f"ipfs://{res}"

    # Register on-chain
    tx_hash = identity_registry.functions.registerAgent(
        agent_uri
    ).transact({'from': account})

    receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
    return receipt
```

## Security Considerations

### 1. Identity Security
- **Private Key Management**: Ed25519 private keys must be securely stored
- **NFT Custody**: Identity NFT represents full agent control
- **Key Rotation**: Plan for key compromise scenarios

### 2. Reputation Security
- **Sybil Attacks**: Staked feedback helps prevent fake reviews
- **Collusion**: Dispute resolution handles coordinated attacks
- **Gaming**: Time-weighted scoring reduces manipulation

### 3. Validation Security
- **Proof Verification**: ZK proofs and TEE attestations must be verified
- **Stake Slashing**: Economic security through slashing
- **Oracle Problem**: Off-chain computation needs verification

### 4. Privacy Protection
- **Encryption**: All contexts encrypted before IPFS storage
- **ZK Proofs**: Verification without disclosure
- **Metadata Leakage**: Careful with on-chain metadata

## Gas Optimization

### Estimated Gas Costs

| Operation | Estimated Gas | Cost @ 50 Gwei |
|-----------|---------------|----------------|
| Register Agent | ~150,000 | ~$2.50 |
| Post Feedback | ~100,000 | ~$1.67 |
| Request Validation | ~80,000 | ~$1.33 |
| Submit Validation | ~120,000 | ~$2.00 |

### Optimization Strategies

1. **Batch Operations**: Group multiple feedbacks into one transaction
2. **Layer 2**: Deploy on Optimism/Arbitrum for 10-100x lower costs
3. **Storage**: Store only hashes on-chain, full data on IPFS/Arweave
4. **Calldata Compression**: Use bytes instead of strings where possible

## Multi-Chain Deployment

### Supported Networks

- **Ethereum Mainnet**: Primary deployment for maximum security
- **Optimism**: L2 for lower gas costs
- **Arbitrum**: L2 alternative
- **Polygon**: Sidechain for high-throughput applications
- **Base**: Coinbase L2

### Cross-Chain Identity

```javascript
// Same agent ID across chains
const agentIdEthereum = 12345;
const agentIdOptimism = 12345; // Same ID, different chain

// Bridge identity proofs
const proof = await generateCrossChainProof(agentIdEthereum);
await verifyOnL2(agentIdOptimism, proof);
```

## Testing

### Unit Tests

```bash
# Install dependencies
npm install

# Run tests
npx hardhat test

# Coverage
npx hardhat coverage
```

### Integration Tests

```bash
# Start local blockchain
npx hardhat node

# Deploy contracts
npx hardhat run scripts/deploy.js --network localhost

# Run integration tests
npm run test:integration
```

## Deployment Guide

### Prerequisites

```bash
npm install --save-dev hardhat @openzeppelin/contracts
```

### Deploy Script

```javascript
// scripts/deploy.js
async function main() {
  // Deploy Identity Registry
  const IdentityRegistry = await ethers.getContractFactory("IdentityRegistry");
  const identityRegistry = await IdentityRegistry.deploy();
  await identityRegistry.deployed();

  console.log("IdentityRegistry:", identityRegistry.address);

  // Deploy Reputation Registry
  const ReputationRegistry = await ethers.getContractFactory("ReputationRegistry");
  const reputationRegistry = await ReputationRegistry.deploy(
    identityRegistry.address,
    ethers.utils.parseEther("0.01") // Minimum stake
  );
  await reputationRegistry.deployed();

  console.log("ReputationRegistry:", reputationRegistry.address);

  // Deploy Validation Registry
  const ValidationRegistry = await ethers.getContractFactory("ValidationRegistry");
  const validationRegistry = await ValidationRegistry.deploy(
    identityRegistry.address,
    ethers.utils.parseEther("0.01"), // Request stake
    ethers.utils.parseEther("0.05")  // Validator stake
  );
  await validationRegistry.deployed();

  console.log("ValidationRegistry:", validationRegistry.address);
}

main();
```

### Deploy to Mainnet

```bash
npx hardhat run scripts/deploy.js --network mainnet
```

## Future Enhancements

### Planned Features

1. **Reputation Staking**: Stake tokens based on reputation
2. **Agent DAOs**: Governance for agent collectives
3. **Context Marketplace**: Buy/sell verified contexts
4. **Credential Delegation**: Sub-agents with limited capabilities
5. **Cross-Chain Bridges**: Native identity bridges
6. **Privacy Pools**: Anonymous reputation aggregation
7. **Slashing Insurance**: Protect against false slashing
8. **Reputation NFTs**: Tradeable reputation credentials

## Conclusion

ERC-8004 provides the perfect on-chain trust layer for ΨNet's hybrid decentralized architecture. Together, they enable:

✅ **Portable Identity**: Agents own their identity across platforms
✅ **Verifiable Reputation**: Cryptographically proven interaction history
✅ **Privacy-Preserving**: ZK proofs and encryption protect data
✅ **Decentralized Trust**: No central authority required
✅ **Economic Security**: Staking mechanisms prevent abuse
✅ **Interoperable**: Works across any ΨNet-compatible system

This integration positions ΨNet as a leading infrastructure for the autonomous AI agent economy.

## Resources

- **ERC-8004 Specification**: https://eips.ethereum.org/EIPS/eip-8004
- **ΨNet Architecture**: See `NETWORK_DESIGN_BREAKDOWN.md`
- **Smart Contracts**: See `contracts/erc8004/`
- **OpenZeppelin**: https://docs.openzeppelin.com/contracts/
- **Hardhat**: https://hardhat.org/

## Support

For questions or issues:
- Open an issue on GitHub
- Join the ΨNet community Discord
- Review the documentation

---

**License**: MIT
**Version**: 1.0.0
**Last Updated**: 2025-01-07
